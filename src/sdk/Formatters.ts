import { ViewUnitPayload, ViewTrackPayload } from './schemas/protocol.js';
import { Vector3, Lla } from './schemas/domain.js';

/**
 * Formatters: Utilities for converting SDK data into human-readable strings.
 */
export const Formatters = {
    /** Formats a Vector3 as [x, y, z] */
    vector(v: Vector3): string {
        return `[${v.x.toFixed(0)}, ${v.y.toFixed(0)}, ${v.z.toFixed(0)}]`;
    },

    /** Formats LLA coordinates as Lat, Lon, Alt */
    lla(lla: Lla): string {
        return `${lla.lat.toFixed(6)}, ${lla.lon.toFixed(6)} (@${lla.alt.toFixed(0)}m)`;
    },

    /** Formats a unit's status summary */
    unit(u: ViewUnitPayload): string {
        const hp = u.hp.toFixed(0);
        const fuel = u.fuelPct !== undefined ? ` | Fuel: ${(u.fuelPct * 100).toFixed(0)}%` : '';
        const mission = u.mission ? ` | Mission: ${u.mission.type} (${u.mission.status})` : '';
        return `[${u.id.padEnd(16)}] | Side: ${u.side.padEnd(5)} | HP: ${hp}${fuel}${mission} | Pos: ${this.vector(u.pos)}`;
    },

    /** Formats a track's status summary */
    track(t: ViewTrackPayload): string {
        const speed = Math.sqrt(t.vel.x ** 2 + t.vel.y ** 2 + t.vel.z ** 2) * 1.94384; // m/s to knots
        return `[Track ${t.id.padEnd(8)}] | Class: ${t.classification.padEnd(10)} | Pos: ${this.vector(t.pos)} | Speed: ${speed.toFixed(0)} kts | CEP: ${t.cep.toFixed(0)}m`;
    }
};
