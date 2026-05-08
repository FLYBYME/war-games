import { ViewUnitPayload, ViewTrackPayload, ViewStateSnapshot, Side } from './schemas/index.js';

/**
 * DeltaDecoder: Decompresses the V3 binary protocol.
 * Synchronized with DeltaEncoder's bitmask-based delta logic.
 */
export class DeltaDecoder {
    private units: Map<string, ViewUnitPayload> = new Map();
    private tracks: Map<string, ViewTrackPayload> = new Map();

    public clear(): void {
        this.units.clear();
        this.tracks.clear();
    }

    public decode(input: ArrayBufferLike | Uint8Array): ViewStateSnapshot {
        const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
        const buffer = bytes.buffer;
        const view = new DataView(buffer, bytes.byteOffset, bytes.byteLength);
        let offset = 0;
        const decoder = new TextDecoder();

        // 1. Header (20 bytes)
        const tick = view.getUint32(offset, true); offset += 4;
        const sequence = view.getUint32(offset, true); offset += 4;
        const isPaused = view.getUint8(offset) === 1; offset += 1;
        const sideVal = view.getUint8(offset); offset += 1;
        const side = DeltaDecoder.mapSide(sideVal);
        const originLat = view.getFloat32(offset, true); offset += 4;
        const originLon = view.getFloat32(offset, true); offset += 4;
        const unitCount = view.getUint16(offset, true); offset += 2;

        const updatedUnitIds = new Set<string>();

        // 2. Units
        for (let i = 0; i < unitCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = decoder.decode(new Uint8Array(buffer, offset, idLen)); offset += idLen;
            updatedUnitIds.add(id);

            const mask = view.getUint8(offset); offset += 1;

            let unit = this.units.get(id);
            if (!unit) {
                // Initialize with defaults if it's a new unit
                unit = {
                    id,
                    side: side,
                    pos: { x: 0, y: 0, z: 0 },
                    heading: 0,
                    hp: 100,
                    fuelPct: 1,
                    isDestroyed: false,
                    logState: 'Ready',
                    isBingo: false,
                    sensors: [],
                    mounts: []
                };
                this.units.set(id, unit);
            }

            if (mask & (1 << 0)) { // Position
                unit.pos.x = view.getFloat32(offset, true); offset += 4;
                unit.pos.y = view.getFloat32(offset, true); offset += 4;
                unit.pos.z = view.getFloat32(offset, true); offset += 4;
            }
            if (mask & (1 << 1)) { // Rotation
                unit.heading = view.getUint16(offset, true); offset += 2;
            }
            if (mask & (1 << 2)) { // HP/Status
                unit.hp = view.getUint8(offset); offset += 1;
                unit.isDestroyed = view.getUint8(offset) === 1; offset += 1;
            }
            if (mask & (1 << 3)) { // Nav (Speed/Alt)
                unit.desiredSpeedKts = view.getUint16(offset, true); offset += 2;
                unit.desiredAltitudeM = view.getInt16(offset, true); offset += 2;
            }
            if (mask & (1 << 4)) { // Profile/Sensors
                const pIdLen = view.getUint8(offset); offset += 1;
                unit.profileId = decoder.decode(new Uint8Array(buffer, offset, pIdLen)); offset += pIdLen;
                unit.sensorMask = view.getUint16(offset, true); offset += 2;
            }
            if (mask & (1 << 5)) { // Velocity
                unit.vel = {
                    x: view.getFloat32(offset, true),
                    y: view.getFloat32(offset, true),
                    z: view.getFloat32(offset, true)
                };
                offset += 12;
            }
            if (mask & (1 << 6)) { // Side
                unit.side = DeltaDecoder.mapSide(view.getUint8(offset)); offset += 1;
            }
            if (mask & (1 << 7)) { // Fuel
                unit.fuelPct = view.getUint8(offset) / 100; offset += 1;
                unit.isBingo = unit.fuelPct < 0.1;
            }
        }

        // Cleanup stale units
        for (const [id] of this.units) {
            if (!updatedUnitIds.has(id)) this.units.delete(id);
        }

        // 3. Tracks
        const trackCount = view.getUint16(offset, true); offset += 2;
        const updatedTrackIds = new Set<string>();

        for (let i = 0; i < trackCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = decoder.decode(new Uint8Array(buffer, offset, idLen)); offset += idLen;
            updatedTrackIds.add(id);

            const mask = view.getUint8(offset); offset += 1;

            let track = this.tracks.get(id);
            if (!track) {
                track = {
                    id,
                    pos: { x: 0, y: 0, z: 0 },
                    vel: { x: 0, y: 0, z: 0 },
                    classification: 'Unknown',
                    identification: 'Unknown',
                    firstSeen: tick,
                    lastSeen: tick,
                    cep: 0,
                    speedKts: 0
                };
                this.tracks.set(id, track);
            }

            if (mask & (1 << 0)) {
                track.pos.x = view.getFloat32(offset, true); offset += 4;
                track.pos.y = view.getFloat32(offset, true); offset += 4;
                track.pos.z = view.getFloat32(offset, true); offset += 4;
            }
            if (mask & (1 << 1)) {
                track.vel.x = view.getFloat32(offset, true); offset += 4;
                track.vel.y = view.getFloat32(offset, true); offset += 4;
                track.vel.z = view.getFloat32(offset, true); offset += 4;
                track.speedKts = Math.sqrt(track.vel.x**2 + track.vel.y**2 + track.vel.z**2) * 1.94384;
            }
            if (mask & (1 << 2)) {
                track.identification = DeltaDecoder.mapIdentification(view.getUint8(offset)); offset += 1;
                track.classification = DeltaDecoder.mapClassification(view.getUint8(offset)); offset += 1;
            }
            if (mask & (1 << 3)) {
                track.cep = view.getFloat32(offset, true); offset += 4;
            }
            
            track.lastSeen = tick;
        }

        for (const [id] of this.tracks) {
            if (!updatedTrackIds.has(id)) this.tracks.delete(id);
        }

        // 4. Dynamic JSON Segment
        const jsonLen = view.getUint32(offset, true); offset += 4;
        const jsonStr = decoder.decode(new Uint8Array(buffer, offset, jsonLen)); offset += jsonLen;
        const dynamicData = JSON.parse(jsonStr);

        // Apply extras to units
        if (dynamicData.unitExtras) {
            for (const [id, extras] of Object.entries(dynamicData.unitExtras)) {
                const u = this.units.get(id);
                if (u && extras && typeof extras === 'object') {
                    Object.assign(u, extras);
                }
            }
        }

        return {
            tick,
            timestamp: Date.now(),
            sequence,
            isPaused,
            side,
            origin: { lat: originLat, lon: originLon },
            units: Array.from(this.units.values()),
            tracks: Array.from(this.tracks.values()),
            losses: dynamicData.losses || { blue: 0, red: 0, munitionsExpended: 0 },
            weather: dynamicData.weather || { cloudCover: 0, seaState: 0, windSpeedKts: 0, windDirDeg: 0, visibilityNM: 20, temperatureC: 15 },
            datalinkGraph: dynamicData.datalinkGraph || { nodes: [], edges: [] },
            weaponBindings: dynamicData.weaponBindings || [],
            esmBearings: dynamicData.esmBearings || [],
            mapData: dynamicData.mapData
        };
    }

    private static mapSide(val: number): Side {
        switch (val) {
            case 0: return Side.Blue;
            case 1: return Side.Red;
            case 2: return Side.Neutral;
            case 3: return Side.Green;
            default: return Side.Neutral;
        }
    }

    private static mapIdentification(val: number): string {
        switch (val) {
            case 1: return 'Friendly';
            case 2: return 'Hostile';
            case 3: return 'Neutral';
            default: return 'Unknown';
        }
    }

    private static mapClassification(val: number): string {
        switch (val) {
            case 1: return 'Air';
            case 2: return 'Surface';
            case 3: return 'Subsurface';
            case 4: return 'Weapon';
            case 5: return 'Mine';
            default: return 'Unknown';
        }
    }
}
