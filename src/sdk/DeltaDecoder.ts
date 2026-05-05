import { ViewStatePayload as ViewState } from './schemas/index.js';

/**
 * DeltaDecoder: Decompresses binary ViewStateSnapshots back into objects.
 * V3 Upgrade: Supports true Delta Compression (merging partial updates).
 */
export class DeltaDecoder {
    private static units = new Map<string, any>();
    private static tracks = new Map<string, any>();

    public static clear(): void {
        this.units.clear();
        this.tracks.clear();
    }

    public static decode(data: ArrayBuffer): ViewState {
        const view = new DataView(data);
        let offset = 0;
        
        // 1. Header (20 bytes)
        const tick = view.getUint32(offset, true); offset += 4;
        const sequence = view.getUint32(offset, true); offset += 4;
        const isPaused = view.getUint8(offset) === 1; offset += 1;
        const sideVal = view.getUint8(offset); offset += 1;
        const side = this.mapSide(sideVal);
        const originLat = view.getFloat32(offset, true); offset += 4;
        const originLon = view.getFloat32(offset, true); offset += 4;
        const unitCount = view.getUint16(offset, true); offset += 2;

        const toLla = (x: number, y: number, z: number) => {
            const lat = originLat + (y / 111319.9);
            const lon = originLon + (x / (111319.9 * Math.cos(originLat * Math.PI / 180)));
            return { lat, lon, alt: z };
        };

        // Reset state on sequence wrap or study restart
        if (sequence === 0) {
            this.units.clear();
            this.tracks.clear();
        }

        // 2. Units (Delta Decoded)
        const activeUnitIds = new Set<string>();
        for (let i = 0; i < unitCount; i++) {
            const idLen = view.getUint8(offset); offset += 1;
            const id = new TextDecoder().decode(new Uint8Array(data, offset, idLen)); offset += idLen;
            const mask = view.getUint8(offset); offset += 1;
            activeUnitIds.add(id);

            let u = this.units.get(id);
            if (!u) {
                u = { 
                    id,
                    side: 'Unknown',
                    pos: {x:0,y:0,z:0}, 
                    rot: 0, hp: 100, 
                    isDestroyed: false,
                    logState: 'Active',
                    fuelPct: 1.0,
                    isBingo: false,
                    mounts: [],
                    weaponBindings: [],
                    esmBearings: []
                };
                this.units.set(id, u);
            }

            if (mask & (1 << 0)) {
                const x = view.getFloat32(offset, true); offset += 4;
                const y = view.getFloat32(offset, true); offset += 4;
                const z = view.getFloat32(offset, true); offset += 4;
                u.pos = { x, y, z }; // New object to prevent reference desync
                u.lla = toLla(x, y, z);
            }
            if (mask & (1 << 1)) {
                u.rot = view.getUint16(offset, true); offset += 2;
            }
            if (mask & (1 << 2)) {
                u.hp = view.getUint8(offset); offset += 1;
                u.isDestroyed = view.getUint8(offset) === 1; offset += 1;
            }
            if (mask & (1 << 3)) {
                u.desiredSpeedKts = view.getUint16(offset, true); offset += 2;
                u.desiredAltitudeM = view.getInt16(offset, true); offset += 2;
            }
            if (mask & (1 << 4)) {
                const pIdLen = view.getUint8(offset); offset += 1;
                u.profileId = new TextDecoder().decode(new Uint8Array(data, offset, pIdLen)); offset += pIdLen;
                u.sensorMask = view.getUint16(offset, true); offset += 2;
            }
            if (mask & (1 << 5)) {
                const vx = view.getFloat32(offset, true); offset += 4;
                const vy = view.getFloat32(offset, true); offset += 4;
                const vz = view.getFloat32(offset, true); offset += 4;
                u.vel = { x: vx, y: vy, z: vz };
            }
            if (mask & (1 << 6)) {
                u.side = this.mapSide(view.getUint8(offset)); offset += 1;
            }
            if (mask & (1 << 7)) {
                u.fuelPct = view.getUint8(offset) / 100.0; offset += 1;
            }
        }

        // Cleanup stale units
        for (const [id, u] of this.units.entries()) {
            if (!activeUnitIds.has(id)) this.units.delete(id);
        }
        
        // 3. Tracks
        const trackCount = view.getUint16(offset, true); offset += 2;
        const activeTrackIds = new Set<string>();

        for (let i = 0; i < trackCount; i++) {
            const tIdLen = view.getUint8(offset); offset += 1;
            const tId = new TextDecoder().decode(new Uint8Array(data, offset, tIdLen)); offset += tIdLen;
            const mask = view.getUint8(offset); offset += 1;
            activeTrackIds.add(tId);

            let t = this.tracks.get(tId);
            if (!t) {
                t = { id: tId, pos: {x:0,y:0,z:0}, vel: {x:0,y:0,z:0}, identification: 'Unknown', classification: 'Unknown', cep: 0 };
                this.tracks.set(tId, t);
            }

            if (mask & (1 << 0)) {
                const x = view.getFloat32(offset, true); offset += 4;
                const y = view.getFloat32(offset, true); offset += 4;
                const z = view.getFloat32(offset, true); offset += 4;
                t.pos = { x, y, z };
                t.lla = toLla(x, y, z);
            }
            if (mask & (1 << 1)) {
                const vx = view.getFloat32(offset, true); offset += 4;
                const vy = view.getFloat32(offset, true); offset += 4;
                const vz = view.getFloat32(offset, true); offset += 4;
                t.vel = { x: vx, y: vy, z: vz };
            }
            if (mask & (1 << 2)) {
                t.identification = this.mapIdentification(view.getUint8(offset)); offset += 1;
                t.classification = this.mapClassification(view.getUint8(offset)); offset += 1;
            }
            if (mask & (1 << 3)) {
                t.cep = view.getFloat32(offset, true); offset += 4;
            }
            t.lastSeen = tick;
        }

        for (const [id, t] of this.tracks.entries()) {
            if (!activeTrackIds.has(id)) this.tracks.delete(id);
        }

        // 4. Dynamic/Complex Data (JSON Segment)
        let dynamicData: any = {};
        if (offset + 4 <= data.byteLength) {
            const jsonLen = view.getUint32(offset, true); offset += 4;
            if (offset + jsonLen <= data.byteLength) {
                const jsonBuf = new Uint8Array(data, offset, jsonLen);
                const jsonStr = new TextDecoder().decode(jsonBuf);
                dynamicData = JSON.parse(jsonStr);
                offset += jsonLen;
            }
        }
        
        const units = Array.from(this.units.values());
        if (dynamicData.unitExtras) {
            for (const u of units) {
                const extras = dynamicData.unitExtras[u.id];
                if (extras) {
                    u.sensors = extras.sensors || [];
                    u.mounts = extras.mounts || [];
                    u.datalink = extras.datalink;
                    u.coveragePolygons = extras.coveragePolygons;
                    u.doctrine = extras.doctrine;
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
            units,
            tracks: Array.from(this.tracks.values()),
            losses: dynamicData.losses || { blue: 0, red: 0, munitionsExpended: 0 },
            weather: dynamicData.weather || { cloudCover: 0, seaState: 0, windSpeedKts: 0, windDirDeg: 0, visibilityNM: 20, temperatureC: 15 },
            datalinkGraph: dynamicData.datalinkGraph || { nodes: [], edges: [] },
            weaponBindings: dynamicData.weaponBindings || [],
            esmBearings: dynamicData.esmBearings || [],
            mapData: dynamicData.mapData
        };
    }

    private static mapSide(val: number): string {
        switch (val) {
            case 0: return 'Blue';
            case 1: return 'Red';
            case 2: return 'Neutral';
            case 3: return 'Green';
            default: return 'Unknown';
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
