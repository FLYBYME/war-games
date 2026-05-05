import { Vector3 } from '../core/Types.js';
import { Physics } from '../PhysicsConstants.js';

export interface Lla {
    lat: number;
    lon: number;
    alt: number;
}

/**
 * Geodesy: Professional-grade geospatial calculations.
 * Implements WGS-84 spherical/ellipsoidal models.
 */
export class Geodesy {
    /**
     * haversineDistance: Calculate great-circle distance between two Lla points.
     * Accurate for spherical earth model.
     */
    public static haversineDistance(p1: Lla, p2: Lla): number {
        const dLat = (p2.lat - p1.lat) * Physics.DEG_TO_RAD;
        const dLon = (p2.lon - p1.lon) * Physics.DEG_TO_RAD;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(p1.lat * Physics.DEG_TO_RAD) * Math.cos(p2.lat * Physics.DEG_TO_RAD) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Physics.EARTH_RADIUS_MEAN * c;
    }

    /**
     * llaToEcef: Convert Geodetic (Lla) to Earth-Centered Earth-Fixed (ECEF).
     */
    public static llaToEcef(lla: Lla): Vector3 {
        const latRad = lla.lat * Physics.DEG_TO_RAD;
        const lonRad = lla.lon * Physics.DEG_TO_RAD;
        const a = Physics.WGS84_SEMI_MAJOR_AXIS;
        const f = Physics.WGS84_FLATTENING;
        const e2 = 2 * f - f * f;

        const sinLat = Math.sin(latRad);
        const cosLat = Math.cos(latRad);
        const sinLon = Math.sin(lonRad);
        const cosLon = Math.cos(lonRad);

        const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);

        return {
            x: (N + lla.alt) * cosLat * cosLon,
            y: (N + lla.alt) * cosLat * sinLon,
            z: (N * (1 - e2) + lla.alt) * sinLat
        };
    }

    /**
     * ecefToLla: Convert ECEF to Geodetic (Lla).
     * Uses Bowring's method for high accuracy.
     */
    public static ecefToLla(ecef: Vector3): Lla {
        const a = Physics.WGS84_SEMI_MAJOR_AXIS;
        const b = Physics.WGS84_SEMI_MINOR_AXIS;
        const f = Physics.WGS84_FLATTENING;
        const e2 = 2 * f - f * f;
        const ep2 = (a * a - b * b) / (b * b);

        const p = Math.sqrt(ecef.x * ecef.x + ecef.y * ecef.y);
        const theta = Math.atan2(ecef.z * a, p * b);

        const lon = Math.atan2(ecef.y, ecef.x);
        const lat = Math.atan2(ecef.z + ep2 * b * Math.pow(Math.sin(theta), 3), 
                               p - e2 * a * Math.pow(Math.cos(theta), 3));

        const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
        const alt = p / Math.cos(lat) - N;

        return {
            lat: lat * Physics.RAD_TO_DEG,
            lon: lon * Physics.RAD_TO_DEG,
            alt: alt
        };
    }

    /**
     * ecefToEnu: Convert ECEF to local East-North-Up (ENU) relative to a reference.
     */
    public static ecefToEnu(pos: Vector3, refLla: Lla): Vector3 {
        const refEcef = this.llaToEcef(refLla);
        const v = {
            x: pos.x - refEcef.x,
            y: pos.y - refEcef.y,
            z: pos.z - refEcef.z
        };

        const latRad = refLla.lat * Physics.DEG_TO_RAD;
        const lonRad = refLla.lon * Physics.DEG_TO_RAD;

        const sLat = Math.sin(latRad);
        const cLat = Math.cos(latRad);
        const sLon = Math.sin(lonRad);
        const cLon = Math.cos(lonRad);

        // ENU rotation matrix
        return {
            x: -sLon * v.x + cLon * v.y,
            y: -sLat * cLon * v.x - sLat * sLon * v.y + cLat * v.z,
            z: cLat * cLon * v.x + cLat * sLon * v.y + sLat * v.z
        };
    }

    /**
     * enuToEcef: Convert local ENU back to global ECEF.
     */
    public static enuToEcef(enu: Vector3, refLla: Lla): Vector3 {
        const refEcef = this.llaToEcef(refLla);
        const latRad = refLla.lat * Physics.DEG_TO_RAD;
        const lonRad = refLla.lon * Physics.DEG_TO_RAD;

        const sLat = Math.sin(latRad);
        const cLat = Math.cos(latRad);
        const sLon = Math.sin(lonRad);
        const cLon = Math.cos(lonRad);

        return {
            x: -sLon * enu.x - sLat * cLon * enu.y + cLat * cLon * enu.z + refEcef.x,
            y: cLon * enu.x - sLat * sLon * enu.y + cLat * sLon * enu.z + refEcef.y,
            z: cLat * enu.y + sLat * enu.z + refEcef.z
        };
    }
}
