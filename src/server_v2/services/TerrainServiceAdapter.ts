import { ITileProvider } from '../../engine/environment/TerrainOracle.js';
import { TerrainService } from './TerrainService.js';

/**
 * TerrainServiceAdapter: Bridges the V2 TerrainService (Worker-based)
 * to the engine's TerrainOracle.
 */
export class TerrainServiceAdapter implements ITileProvider {
    constructor(private terrainService: TerrainService) {}

    public async getTile(lat: number, lon: number): Promise<Float32Array | undefined> {
        try {
            const tile = await this.terrainService.getTile(lat, lon);
            return tile.data;
        } catch (err) {
            console.error(`TerrainServiceAdapter: Failed to load tile for ${lat}, ${lon}`, err);
            return undefined;
        }
    }

    public getCachedTile(_lat: number, _lon: number): Float32Array | undefined {
        // Current TerrainService doesn't expose synchronous cache access easily,
        // so we return undefined to force the async getTile path.
        // The TerrainOracle handles the async call.
        return undefined;
    }
}
