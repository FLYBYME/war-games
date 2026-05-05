import { Vector3 } from '../core/Types.js';
import { Geodesy, Lla } from './Geodesy.js';

/**
 * GeoProjection: Maps local simulation coordinates (meters) to Geospatial (Lat/Lon).
 * Professional Upgrade: Uses a Local Tangent Plane (ENU) centered at an origin,
 * resolving the 'Flat Earth Problem' at high latitudes.
 */
export class GeoProjection {
    private originLla: Lla;

    constructor(
        public originLat: number = 0,
        public originLon: number = 0
    ) {
        this.originLla = { lat: originLat, lon: originLon, alt: 0 };
    }

    public setOrigin(lat: number, lon: number) {
        this.originLat = lat;
        this.originLon = lon;
        this.originLla = { lat, lon, alt: 0 };
    }

    /**
     * project: Convert ENU [x, y, z] meters to [lat, lon]
     */
    public project(pos: Vector3): { lat: number, lon: number } {
        const ecef = Geodesy.enuToEcef(pos, this.originLla);
        const lla = Geodesy.ecefToLla(ecef);
        return { lat: lla.lat, lon: lla.lon };
    }

    /**
     * unproject: Convert [lat, lon] to ENU [x, y, z] meters
     */
    public unproject(lat: number, lon: number): Vector3 {
        const targetLla: Lla = { lat, lon, alt: 0 };
        const ecef = Geodesy.llaToEcef(targetLla);
        return Geodesy.ecefToEnu(ecef, this.originLla);
    }
}
