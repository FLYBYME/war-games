import { ViewStatePayload as ViewState } from './schemas/index.js';
import { Vector3, Side } from './schemas/domain.js';

interface SessionStateEntry {
    pos: Vector3;
    heading?: number;
    hp?: number;
    isDestroyed?: boolean;
    desiredSpeedKts?: number;
    desiredAltitudeM?: number;
    profileId?: string;
    sensorMask?: number;
    vel?: Vector3;
    side?: Side;
    fuelPct?: number;
    identification?: string;
    classification?: string;
    cep?: number;
}

/**
 * DeltaEncoder: Compresses ViewStateSnapshots into a compact binary format.
 * V3 Upgrade: Supports true Delta Compression (sending only changed fields).
 * Refactored for environment portability using DataView.
 */
export class DeltaEncoder {
    // Stores the last state sent to each session to calculate deltas
    private lastStates = new Map<string, Map<string, SessionStateEntry>>();
    private lastAccess = new Map<string, number>();
    private readonly MAX_SESSIONS = 50;

    public encode(snapshot: ViewState, sessionId: string): Uint8Array {
        const units = snapshot.units;
        const tracks = snapshot.tracks;
        
        this.lastAccess.set(sessionId, Date.now());
        let sessionState = this.lastStates.get(sessionId);
        if (!sessionState) {
            // Evict oldest if full
            if (this.lastStates.size >= this.MAX_SESSIONS) {
                let oldestId = '';
                let oldestTime = Infinity;
                for (const [sid, time] of this.lastAccess.entries()) {
                    if (time < oldestTime) {
                        oldestTime = time;
                        oldestId = sid;
                    }
                }
                if (oldestId) {
                    this.lastStates.delete(oldestId);
                    this.lastAccess.delete(oldestId);
                }
            }

            sessionState = new Map<string, SessionStateEntry>();
            this.lastStates.set(sessionId, sessionState);
        }

        const encoder = new TextEncoder();
        
        // 0. Pre-calculate Dynamic Segment Size
        const dynamicData = {
            mapData: snapshot.mapData,
            esmBearings: snapshot.esmBearings,
            weaponBindings: snapshot.weaponBindings,
            datalinkGraph: snapshot.datalinkGraph,
            unitExtras: snapshot.units.reduce((acc: Record<string, unknown>, u) => {
                acc[u.id] = {
                    sensors: u.sensors,
                    mounts: u.mounts,
                    datalink: u.datalink,
                    coveragePolygons: u.coveragePolygons,
                    waypoints: u.waypoints,
                    doctrine: u.doctrine
                };
                return acc;
            }, {}),
            losses: snapshot.losses,
            weather: snapshot.weather
        };
        const dynamicJson = JSON.stringify(dynamicData);
        const dynamicBuf = encoder.encode(dynamicJson);

        // We'll use a dynamic buffer for deltas, ensuring enough space for the JSON segment
        const buffer = new ArrayBuffer(units.length * 128 + tracks.length * 128 + dynamicBuf.length + 1024);
        const view = new DataView(buffer);
        let offset = 0;
        
        // 1. Header (20 bytes)
        view.setUint32(offset, snapshot.tick, true); offset += 4;
        view.setUint32(offset, snapshot.sequence, true); offset += 4;
        view.setUint8(offset, snapshot.isPaused ? 1 : 0); offset += 1;
        view.setUint8(offset, this.mapSide(snapshot.side)); offset += 1;
        view.setFloat32(offset, snapshot.origin?.lat || 0, true); offset += 4;
        view.setFloat32(offset, snapshot.origin?.lon || 0, true); offset += 4;
        view.setUint16(offset, units.length, true); offset += 2;

        // 2. Units (Delta Encoded)
        for (const u of units) {
            const last = sessionState.get(u.id);
            
            // Bitmask: 
            // 0: Position, 1: Rotation, 2: HP/Status, 3: Nav, 4: Profile/Sensors, 5: Velocity, 6: Side, 7: Fuel
            let mask = 0;
            const hasPos = u.pos && typeof u.pos.x === 'number';
            const posChanged = hasPos && (!last || Math.abs(u.pos.x - last.pos.x) > 0.1 || Math.abs(u.pos.y - last.pos.y) > 0.1 || Math.abs(u.pos.z - last.pos.z) > 0.1);
            const headingChanged = !last || Math.abs(u.heading - (last.heading ?? 0)) > 1;
            const statusChanged = !last || u.hp !== last.hp || u.isDestroyed !== last.isDestroyed;
            const navChanged = !last || u.desiredSpeedKts !== last.desiredSpeedKts || u.desiredAltitudeM !== last.desiredAltitudeM;
            const profileChanged = !last || u.profileId !== last.profileId || u.sensorMask !== last.sensorMask;
            const velChanged = !last || (u.vel && (!last.vel || u.vel.x !== last.vel.x || u.vel.y !== last.vel.y || u.vel.z !== last.vel.z));
            const sideChanged = !last || u.side !== last.side;
            const fuelChanged = !last || Math.abs(u.fuelPct - (last.fuelPct ?? 1.0)) > 0.01;

            if (posChanged) mask |= (1 << 0);
            if (headingChanged) mask |= (1 << 1);
            if (statusChanged) mask |= (1 << 2);
            if (navChanged) mask |= (1 << 3);
            if (profileChanged) mask |= (1 << 4);
            if (velChanged) mask |= (1 << 5);
            if (sideChanged) mask |= (1 << 6);
            if (fuelChanged) mask |= (1 << 7);

            // Write ID (Length-prefixed string)
            const idBuf = encoder.encode(u.id);
            view.setUint8(offset, idBuf.length); offset += 1;
            new Uint8Array(buffer, offset, idBuf.length).set(idBuf); offset += idBuf.length;

            view.setUint8(offset, mask); offset += 1;

            if (mask & (1 << 0)) {
                view.setFloat32(offset, u.pos.x, true); offset += 4;
                view.setFloat32(offset, u.pos.y, true); offset += 4;
                view.setFloat32(offset, u.pos.z, true); offset += 4;
            }
            if (mask & (1 << 1)) {
                view.setUint16(offset, Math.floor(u.heading % 360), true); offset += 2;
            }
            if (mask & (1 << 2)) {
                view.setUint8(offset, Math.min(255, u.hp)); offset += 1;
                view.setUint8(offset, u.isDestroyed ? 1 : 0); offset += 1;
            }
            if (mask & (1 << 3)) {
                view.setUint16(offset, Math.min(65535, Math.round(u.desiredSpeedKts || 0)), true); offset += 2;
                view.setInt16(offset, Math.min(32767, Math.max(-32768, Math.round(u.desiredAltitudeM || 0))), true); offset += 2;
            }
            if (mask & (1 << 4)) {
                const pIdBuf = encoder.encode(u.profileId || '');
                view.setUint8(offset, pIdBuf.length); offset += 1;
                new Uint8Array(buffer, offset, pIdBuf.length).set(pIdBuf); offset += pIdBuf.length;
                view.setUint16(offset, u.sensorMask || 0, true); offset += 2;
            }
            if (mask & (1 << 5)) {
                view.setFloat32(offset, u.vel?.x || 0, true); offset += 4;
                view.setFloat32(offset, u.vel?.y || 0, true); offset += 4;
                view.setFloat32(offset, u.vel?.z || 0, true); offset += 4;
            }
            if (mask & (1 << 6)) {
                view.setUint8(offset, this.mapSide(u.side)); offset += 1;
            }
            if (mask & (1 << 7)) {
                view.setUint8(offset, Math.floor(Math.max(0, Math.min(1, u.fuelPct)) * 100)); offset += 1;
            }

            // Update session state
            sessionState.set(u.id, { 
                pos: { ...u.pos }, 
                heading: u.heading, 
                hp: u.hp, 
                isDestroyed: u.isDestroyed,
                desiredSpeedKts: u.desiredSpeedKts,
                desiredAltitudeM: u.desiredAltitudeM,
                profileId: u.profileId,
                sensorMask: u.sensorMask,
                vel: u.vel ? { ...u.vel } : undefined,
                side: u.side,
                fuelPct: u.fuelPct
            });
        }
        
        // 3. Tracks
        view.setUint16(offset, tracks.length, true); offset += 2;

        for (const t of tracks) {
            const last = sessionState.get(t.id);

            // Bitmask: 0: Pos, 1: Vel, 2: Ident/Cls, 3: CEP
            let mask = 0;
            const hasPos = t.pos && typeof t.pos.x === 'number';
            const posChanged = hasPos && (!last || Math.abs(t.pos.x - last.pos.x) > 1.0 || Math.abs(t.pos.y - last.pos.y) > 1.0);
            const velChanged = !last || (t.vel && (!last.vel || Math.abs(t.vel.x - last.vel.x) > 0.1 || Math.abs(t.vel.y - last.vel.y) > 0.1));
            const typeChanged = !last || t.identification !== last.identification || t.classification !== last.classification;
            const cepChanged = !last || Math.abs((t.cep ?? 0) - (last.cep ?? 0)) > 1.0;

            if (posChanged) mask |= (1 << 0);
            if (velChanged) mask |= (1 << 1);
            if (typeChanged) mask |= (1 << 2);
            if (cepChanged) mask |= (1 << 3);

            const tIdBuf = encoder.encode(t.id);
            view.setUint8(offset, tIdBuf.length); offset += 1;
            new Uint8Array(buffer, offset, tIdBuf.length).set(tIdBuf); offset += tIdBuf.length;

            view.setUint8(offset, mask); offset += 1;

            if (mask & (1 << 0)) {
                view.setFloat32(offset, t.pos.x, true); offset += 4;
                view.setFloat32(offset, t.pos.y, true); offset += 4;
                view.setFloat32(offset, t.pos.z, true); offset += 4;
            }
            if (mask & (1 << 1)) {
                view.setFloat32(offset, t.vel.x, true); offset += 4;
                view.setFloat32(offset, t.vel.y, true); offset += 4;
                view.setFloat32(offset, t.vel.z, true); offset += 4;
            }
            if (mask & (1 << 2)) {
                view.setUint8(offset, this.mapIdentification(t.identification || 'Unknown')); offset += 1;
                view.setUint8(offset, this.mapClassification(t.classification)); offset += 1;
            }
            if (mask & (1 << 3)) {
                view.setFloat32(offset, t.cep || 0, true); offset += 4;
            }

            sessionState.set(t.id, {
                pos: { ...t.pos },
                vel: { ...t.vel },
                identification: t.identification,
                classification: t.classification,
                cep: t.cep
            });
        }
        
        // 4. Dynamic/Complex Data (JSON Segment for flexibility)
        view.setUint32(offset, dynamicBuf.length, true); offset += 4;
        new Uint8Array(buffer, offset, dynamicBuf.length).set(dynamicBuf); offset += dynamicBuf.length;
        
        return new Uint8Array(buffer, 0, offset);
    }

    public clearSession(sessionId: string): void {
        this.lastStates.delete(sessionId);
    }

    public reset(): void {
        this.lastStates.clear();
    }

    private mapSide(side: Side): number {
        switch (side) {
            case Side.Blue: return 0;
            case Side.Red: return 1;
            case Side.Neutral: return 2;
            case Side.Green: return 3;
            default: return 255;
        }
    }

    private mapIdentification(id: string): number {
        switch (id) {
            case 'Friendly': return 1;
            case 'Hostile': return 2;
            case 'Neutral': return 3;
            default: return 0;
        }
    }

    private mapClassification(cls: string): number {
        switch (cls) {
            case 'Air': return 1;
            case 'Surface': return 2;
            case 'Subsurface': return 3;
            case 'Weapon': return 4;
            case 'Mine': return 5;
            default: return 0;
        }
    }
}
