import path from 'path';
import { fileURLToPath } from 'url';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { WorkerService } from './WorkerService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.resolve(__dirname, '../workers/terrain.worker.ts');

interface TerrainTile {
    lat: number;
    lon: number;
    resolution: number;
    data: Float32Array;
}

export class TerrainService {
    private readonly tileCache = new Map<string, TerrainTile>();
    private readonly activeJobs = new Map<string, Promise<TerrainTile>>();

    constructor(private readonly workerService: WorkerService) {
        this.workerService.createPool('terrain', WORKER_PATH, 2);
    }

    public async getTile(lat: number, lon: number): Promise<TerrainTile> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;

        if (this.tileCache.has(key)) {
            return this.tileCache.get(key)!;
        }

        if (this.activeJobs.has(key)) {
            return this.activeJobs.get(key)!;
        }

        const pool = this.workerService.getPool('terrain');
        const job = pool.execute<any>({ lat: floorLat, lon: floorLon })
            .then(msg => {
                if (!msg.success) throw new Error(msg.error);
                const decoded = WgtFormat.decode(msg.engineEncoded);
                const tile = {
                    lat: msg.lat,
                    lon: msg.lon,
                    resolution: decoded.resolution,
                    data: decoded.data
                };
                this.tileCache.set(key, tile);
                this.activeJobs.delete(key);
                return tile;
            })
            .catch(err => {
                this.activeJobs.delete(key);
                throw err;
            });

        this.activeJobs.set(key, job);
        return job;
    }

    public async getElevation(lat: number, lon: number): Promise<number> {
        const tile = await this.getTile(lat, lon);
        const res = tile.resolution;
        
        const dLat = lat - Math.floor(lat);
        const dLon = lon - Math.floor(lon);

        const x = Math.round(dLon * (res - 1));
        const y = Math.round((1 - dLat) * (res - 1));

        const idx = y * res + x;
        return tile.data[idx] || 0;
    }

    public async getElevationProfile(startLat: number, startLon: number, endLat: number, endLon: number, points: number): Promise<number[]> {
        const profile: number[] = [];
        for (let i = 0; i < points; i++) {
            const t = i / (points - 1);
            const lat = startLat + (endLat - startLat) * t;
            const lon = startLon + (endLon - startLon) * t;
            profile.push(await this.getElevation(lat, lon));
        }
        return profile;
    }

    public getCacheStats() {
        const pool = this.workerService.getPool('terrain');
        const poolStats = pool.getStats();
        return {
            cachedTiles: this.tileCache.size,
            activeJobs: poolStats.activeJobs,
            queuedJobs: poolStats.queuedJobs
        };
    }

    public clearCache() {
        this.tileCache.clear();
    }
}
