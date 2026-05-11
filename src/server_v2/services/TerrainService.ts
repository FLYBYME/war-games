import fs from 'fs';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { WorkerService } from './WorkerService.js';

interface TerrainTile {
    lat: number;
    lon: number;
    resolution: number;
    data: Float32Array;
}

export class TerrainService {
    // Cache Level 1: RAM (LRU) - 500MB approx (Float32Array 1201*1201 is ~5.7MB)
    // 100 tiles is ~570MB
    private readonly ramCache = new LRUCache<string, TerrainTile>({
        max: 100,
        dispose: (value, key) => {
            // Optional: could log eviction
        }
    });

    private readonly activeJobs = new Map<string, Promise<TerrainTile>>();
    
    // Cache Level 2: Local Disk Cache path
    private readonly diskCacheDir = path.resolve(process.env.TERRAIN_DISK_CACHE || './data/terrain_cache');
    
    // Cache Level 3: Remote Node URL
    private readonly remoteNodeUrl = process.env.TERRAIN_REMOTE_NODE_URL; // e.g., http://192.168.1.100:8080/terrain

    constructor(private readonly workerService: WorkerService) {
        if (!fs.existsSync(this.diskCacheDir)) {
            fs.mkdirSync(this.diskCacheDir, { recursive: true });
        }
        // We still keep the worker pool for fallback decompression/downsampling if needed,
        // but we'll prefer pre-computed .wgt files from the remote node.
        const WORKER_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../workers/terrain.worker.ts');
        this.workerService.createPool('terrain', WORKER_PATH, 2);
    }

    public async getTile(lat: number, lon: number, targetResolution: number = 1201): Promise<TerrainTile> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}_${targetResolution}`;

        // 1. RAM Cache (L1)
        const cached = this.ramCache.get(key);
        if (cached) return cached;

        // 2. Active Jobs (Deduplication)
        if (this.activeJobs.has(key)) {
            return this.activeJobs.get(key)!;
        }

        const job = (async () => {
            // 3. Local Disk Cache (L2)
            const diskPath = path.join(this.diskCacheDir, `res_${targetResolution}`, `${floorLat}`, `${floorLon}.wgt`);
            if (fs.existsSync(diskPath)) {
                try {
                    const buffer = fs.readFileSync(diskPath);
                    const decoded = WgtFormat.decode(buffer);
                    const tile = {
                        lat: decoded.lat,
                        lon: decoded.lon,
                        resolution: decoded.resolution,
                        data: decoded.data
                    };
                    this.ramCache.set(key, tile);
                    return tile;
                } catch (err) {
                    console.error(`TerrainService: Failed to read disk cache at ${diskPath}`, err);
                }
            }

            // 4. Remote Node (L3)
            if (this.remoteNodeUrl) {
                const remoteUrl = `${this.remoteNodeUrl}/terrain/tile?lat=${floorLat}&lon=${floorLon}&res=${targetResolution}`;
                try {
                    const response = await fetch(remoteUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        
                        // Save to L2 Disk Cache
                        const diskPath = path.join(this.diskCacheDir, `res_${targetResolution}`, `${floorLat}`, `${floorLon}.wgt`);
                        const dir = path.dirname(diskPath);
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(diskPath, buffer);

                        const decoded = WgtFormat.decode(buffer);
                        const tile = {
                            lat: decoded.lat,
                            lon: decoded.lon,
                            resolution: decoded.resolution,
                            data: decoded.data
                        };
                        this.ramCache.set(key, tile);
                        return tile;
                    }
                } catch (err) {
                    console.warn(`TerrainService: Remote fetch failed for ${remoteUrl}`, err);
                }
            }

            // 5. Fallback: Worker (Original behavior - AWS fetch)
            const pool = this.workerService.getPool('terrain');
            const msg = await pool.execute<any>({ lat: floorLat, lon: floorLon, targetRes: targetResolution });
            
            if (!msg.success) throw new Error(msg.error);
            
            const encoded = targetResolution === 1201 ? msg.engineEncoded : msg.uiEncoded;
            const decoded = WgtFormat.decode(encoded);
            const tile = {
                lat: msg.lat,
                lon: msg.lon,
                resolution: decoded.resolution,
                data: decoded.data
            };

            // Save to Disk Cache (L2)
            const dir = path.dirname(diskPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(diskPath, Buffer.from(encoded));

            this.ramCache.set(key, tile);
            return tile;
        })().finally(() => {
            this.activeJobs.delete(key);
        });

        this.activeJobs.set(key, job);
        return job;
    }

    public async getElevation(lat: number, lon: number): Promise<number> {
        const tile = await this.getTile(lat, lon, 1201);
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
            cachedTiles: this.ramCache.size,
            activeJobs: poolStats.activeJobs,
            queuedJobs: poolStats.queuedJobs
        };
    }

    public clearCache() {
        this.ramCache.clear();
    }
}
