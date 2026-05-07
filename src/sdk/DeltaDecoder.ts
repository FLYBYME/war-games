import { ViewUnitPayload, ViewTrackPayload, ViewStateSnapshot, Side } from './schemas/index.js';

export class DeltaDecoder {
    private lastSnapshot: ViewStateSnapshot | null = null;
    private units: Map<string, ViewUnitPayload> = new Map();
    private tracks: Map<string, ViewTrackPayload> = new Map();

    public clear(): void {
        this.units.clear();
        this.tracks.clear();
        this.lastSnapshot = null;
    }

    public decode(buffer: ArrayBuffer): ViewStateSnapshot {
        const view = new DataView(buffer);
        let offset = 0;

        const tick = view.getUint32(offset, true); offset += 4;
        const sequence = view.getUint32(offset, true); offset += 4;
        const isPaused = view.getUint8(offset) === 1; offset += 1;
        const sideVal = view.getUint8(offset); offset += 1;
        const side = DeltaDecoder.mapSide(sideVal);
        const originLat = view.getFloat64(offset, true); offset += 8;
        const originLon = view.getFloat64(offset, true); offset += 8;

        const unitCount = view.getUint32(offset, true); offset += 4;
        const updatedUnitIds = new Set<string>();

        for (let i = 0; i < unitCount; i++) {
            const idLen = view.getUint16(offset, true); offset += 2;
            const id = new TextDecoder().decode(buffer.slice(offset, offset + idLen)); offset += idLen;
            updatedUnitIds.add(id);

            const x = view.getFloat64(offset, true); offset += 8;
            const y = view.getFloat64(offset, true); offset += 8;
            const z = view.getFloat32(offset, true); offset += 4;
            const rot = view.getFloat32(offset, true); offset += 4;
            const hp = view.getFloat32(offset, true); offset += 4;
            const fuelPct = view.getFloat32(offset, true); offset += 4;

            let unit = this.units.get(id);
            if (!unit) {
                unit = {
                    id,
                    side,
                    pos: { x, y, z },
                    rot,
                    hp,
                    fuelPct,
                    isDestroyed: hp <= 0,
                    logState: 'Ready',
                    isBingo: fuelPct < 0.1,
                    sensors: [],
                    mounts: []
                };
                this.units.set(id, unit);
            } else {
                unit.pos = { x, y, z };
                unit.rot = rot;
                unit.hp = hp;
                unit.fuelPct = fuelPct;
                unit.isDestroyed = hp <= 0;
            }
        }

        // Remove units not in snapshot
        for (const id of this.units.keys()) {
            if (!updatedUnitIds.has(id)) this.units.delete(id);
        }

        const trackCount = view.getUint32(offset, true); offset += 4;
        const updatedTrackIds = new Set<string>();

        for (let i = 0; i < trackCount; i++) {
            const idLen = view.getUint16(offset, true); offset += 2;
            const id = new TextDecoder().decode(buffer.slice(offset, offset + idLen)); offset += idLen;
            updatedTrackIds.add(id);

            const tx = view.getFloat64(offset, true); offset += 8;
            const ty = view.getFloat64(offset, true); offset += 8;
            const tz = view.getFloat32(offset, true); offset += 4;
            const vx = view.getFloat32(offset, true); offset += 4;
            const vy = view.getFloat32(offset, true); offset += 4;
            const vz = view.getFloat32(offset, true); offset += 4;
            
            const classLen = view.getUint8(offset); offset += 1;
            const classification = new TextDecoder().decode(buffer.slice(offset, offset + classLen)); offset += classLen;
            
            const identVal = view.getUint8(offset); offset += 1;
            const identification = DeltaDecoder.mapIdentification(identVal);
            
            const lastSeen = view.getUint32(offset, true); offset += 4;
            const cep = view.getFloat32(offset, true); offset += 4;

            this.tracks.set(id, {
                id,
                pos: { x: tx, y: ty, z: tz },
                vel: { x: vx, y: vy, z: vz },
                classification,
                identification,
                lastSeen,
                cep,
                speedKts: Math.sqrt(vx * vx + vy * vy + vz * vz) * 1.94384
            });
        }

        for (const id of this.tracks.keys()) {
            if (!updatedTrackIds.has(id)) this.tracks.delete(id);
        }

        // Remaining data is dynamic JSON (events, losses, etc.)
        const jsonLen = view.getUint32(offset, true); offset += 4;
        const dynamicData = JSON.parse(new TextDecoder().decode(buffer.slice(offset, offset + jsonLen)));

        const units = Array.from(this.units.values());
        if (dynamicData.unitExtras) {
            for (const extras of dynamicData.unitExtras) {
                const u = this.units.get(extras.id);
                if (u) {
                    u.parentId = extras.parentId;
                    u.profileId = extras.profileId;
                    u.logState = extras.logState || 'Ready';
                    u.mission = extras.mission;
                    u.taskGraph = extras.taskGraph;
                    u.sensors = extras.sensors || [];
                    u.mounts = extras.mounts || [];
                    u.datalink = extras.datalink;
                    u.coveragePolygons = extras.coveragePolygons;
                    u.doctrine = extras.doctrine;
                    u.speedKts = extras.speedKts;
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
            threatMap: dynamicData.threatMap || [],
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
}
