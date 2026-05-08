import { Vector3 } from '../core/Types.js';

/**
 * ITileProvider: Interface for loading terrain data chunks.
 */
export interface ITileProvider {
    getTile(lat: number, lon: number): Promise<Float32Array | undefined>;
    getCachedTile(lat: number, lon: number): Float32Array | undefined;
}

/**
 * TerrainOracle: The Source of Truth for elevation.
 * Implements Bilinear Interpolation for smooth, continuous terrain queries.
 */
export class TerrainOracle {
    constructor(private provider?: ITileProvider) {}

    /**
     * getElevation: Returns height in meters at a given lat/lon.
     */
    public async getElevation(lat: number, lon: number): Promise<number> {
        if (!this.provider) return 0;

        // Try synchronous path first
        const cached = this.provider.getCachedTile(lat, lon);
        if (cached) return this.interpolateElevation(cached, lat, lon);

        const tile = await this.provider.getTile(lat, lon);
        if (!tile) return 0;

        return this.interpolateElevation(tile, lat, lon);
    }

    /**
     * getElevationSync: Synchronous version for hot loops, returns 0 if tile not cached.
     */
    public getElevationSync(lat: number, lon: number): number {
        if (!this.provider) return 0;
        const tile = this.provider.getCachedTile(lat, lon);
        if (!tile) return 0;
        return this.interpolateElevation(tile, lat, lon);
    }

    private interpolateElevation(tile: Float32Array, lat: number, lon: number): number {
        const resolution = Math.sqrt(tile.length);
        if (Math.floor(resolution) !== resolution) {
            return tile[0] || 0;
        }

        const latFract = lat - Math.floor(lat);
        const lonFract = lon - Math.floor(lon);

        const y = (1.0 - latFract) * (resolution - 1);
        const x = lonFract * (resolution - 1);

        const x1 = Math.floor(x);
        const x2 = Math.min(x1 + 1, resolution - 1);
        const y1 = Math.floor(y);
        const y2 = Math.min(y1 + 1, resolution - 1);

        const q11 = tile[y1 * resolution + x1];
        const q12 = tile[y2 * resolution + x1];
        const q21 = tile[y1 * resolution + x2];
        const q22 = tile[y2 * resolution + x2];

        const wx = x - x1;
        const wy = y - y1;

        const r1 = q11 * (1 - wx) + q21 * wx;
        const r2 = q12 * (1 - wx) + q22 * wx;

        return r1 * (1 - wy) + r2 * wy;
    }

    /**
     * isLineOfSightClear: Checks if terrain obstructs the path between two points.
     */
    public async isLineOfSightClear(
        posA: Vector3, 
        posB: Vector3, 
        projection: { project(pos: Vector3): { lat: number, lon: number } },
        numSamples: number = 10
    ): Promise<boolean> {
        // Fast path: If both points are above all known terrestrial terrain, LOS is clear
        if (posA.z > 9000 && posB.z > 9000) return true;

        for (let i = 1; i < numSamples; i++) {
            const t = i / numSamples;
            const samplePos = {
                x: posA.x + (posB.x - posA.x) * t,
                y: posA.y + (posB.y - posA.y) * t,
                z: posA.z + (posB.z - posA.z) * t
            };
            const geo = projection.project(samplePos as Vector3);
            const terrainHeight = await this.getElevation(geo.lat, geo.lon);
            
            // Z is altitude (positive up), terrainHeight is elevation (positive up)
            // Blocked if point altitude is less than terrain elevation
            if (samplePos.z < terrainHeight - 0.1) {
                return false;
            }
        }
        return true;
    }
}
