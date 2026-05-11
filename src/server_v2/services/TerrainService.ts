import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LRUCache } from 'lru-cache';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { WorkerService } from './WorkerService.js';

/**
 * TerrainTile: Internal representation of a geodetic data chunk.
 */
interface TerrainTile {
    lat: number;
    lon: number;
    resolution: number;
    data: Int16Array | Float32Array;
    format: number; // 0 = Int16, 1 = Float32
}

/**
 * TerrainService: Manages geodetic data lifecycle and multi-level caching.
 * Professional Upgrade: Supports WGTv2 and optimized Int16 transport.
 */
export class TerrainService {
    // Cache Level 1: RAM (LRU) - Capped at 100 tiles (~280MB for Int16 tiles)
    private readonly ramCache = new LRUCache<string, TerrainTile>({
        max: 100
    });

    private readonly activeJobs = new Map<string, Promise<TerrainTile>>();
    
    // Cache Level 2: Local Disk Cache path
    private readonly diskCacheDir = path.resolve(process.env.TERRAIN_DISK_CACHE || './data/terrain_cache');
    
    // Cache Level 3: Remote Node URL (used by the Laptop Sim Engine)
    private readonly remoteNodeUrl = process.env.TERRAIN_REMOTE_NODE_URL;

    constructor(private readonly workerService: WorkerService) {
        if (!fs.existsSync(this.diskCacheDir)) {
            fs.mkdirSync(this.diskCacheDir, { recursive: true });
        }
        
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const WORKER_PATH = path.resolve(currentDir, '../workers/terrain.worker.ts');
        this.workerService.createPool('terrain', WORKER_PATH, 2);
    }

    /**
     * getTile: Retrieves a terrain tile by coordinate and resolution.
     * Implements L1 (RAM) -> L2 (Disk) -> L3 (Remote) -> Fallback (Worker/AWS)
     */
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
                    const tile: TerrainTile = {
                        lat: decoded.lat,
                        lon: decoded.lon,
                        resolution: decoded.resolution,
                        data: decoded.data,
                        format: decoded.format
                    };
                    this.ramCache.set(key, tile);
                    return tile;
                } catch (err) {
                    console.error(`TerrainService: Failed to read disk cache at ${diskPath}`, err);
                }
            }

            // 4. Remote Node (L3) - Only if on Laptop (client-mode)
            if (this.remoteNodeUrl) {
                const remoteUrl = `${this.remoteNodeUrl}/terrain/tile/degree?lat=${floorLat}&lon=${floorLon}&res=${targetResolution}`;
                try {
                    const response = await fetch(remoteUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        
                        // Save to L2 Disk Cache
                        const dir = path.dirname(diskPath);
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(diskPath, buffer);

                        const decoded = WgtFormat.decode(buffer);
                        const tile: TerrainTile = {
                            lat: decoded.lat,
                            lon: decoded.lon,
                            resolution: decoded.resolution,
                            data: decoded.data,
                            format: decoded.format
                        };
                        this.ramCache.set(key, tile);
                        return tile;
                    }
                } catch (err) {
                    console.warn(`TerrainService: Remote fetch failed for ${remoteUrl}`, err);
                }
            }

            // 5. Fallback: Worker (Master-mode - AWS fetch + processing)
            const pool = this.workerService.getPool('terrain');
            const msg = await pool.execute<any>({ lat: floorLat, lon: floorLon, targetRes: targetResolution });
            
            if (!msg.success) throw new Error(msg.error);
            
            const encoded = targetResolution === 1201 ? msg.engineEncoded : msg.uiEncoded;
            const decoded = WgtFormat.decode(encoded);
            const tile: TerrainTile = {
                lat: msg.lat,
                lon: msg.lon,
                resolution: decoded.resolution,
                data: decoded.data,
                format: decoded.format
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

    /**
     * getElevation: High-speed point query.
     */
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

    /**
     * getElevationProfile: Batch point query for paths.
     */
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

    /**
     * prefetchTheater: Predictively loads a bounding box of tiles into RAM.
     * Use this before starting a simulation or when units approach an edge.
     */
    public async prefetchTheater(
        latMin: number, 
        latMax: number, 
        lonMin: number, 
        lonMax: number, 
        res: number = 1201
    ): Promise<number> {
        const floorLatMin = Math.floor(latMin);
        const floorLatMax = Math.ceil(latMax);
        const floorLonMin = Math.floor(lonMin);
        const floorLonMax = Math.ceil(lonMax);

        const tasks: Promise<any>[] = [];
        for (let lat = floorLatMin; lat <= floorLatMax; lat++) {
            for (let lon = floorLonMin; lon <= floorLonMax; lon++) {
                tasks.push(this.getTile(lat, lon, res));
            }
        }

        await Promise.all(tasks);
        return tasks.length;
    }

    /**
     * isLineOfSightClear: Offloads LOS math to the Remote Node Oracle.
     */
    public async isLineOfSightClear(
        p1: { lat: number, lon: number, alt: number },
        p2: { lat: number, lon: number, alt: number },
        numSamples: number = 10
    ): Promise<boolean> {
        if (this.remoteNodeUrl) {
            try {
                const response = await fetch(`${this.remoteNodeUrl}/env/math/los`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p1, p2, numSamples })
                });
                if (response.ok) {
                    const result = await response.json();
                    return !result.blocked;
                }
            } catch (err) {
                console.warn(`TerrainService: Math Oracle offload failed`, err);
            }
        }

        // Fallback: Local calculation using L1/L2 cache
        for (let i = 1; i < numSamples; i++) {
            const t = i / numSamples;
            const sampleAlt = p1.alt + (p2.alt - p1.alt) * t;
            const sampleLat = p1.lat + (p2.lat - p1.lat) * t;
            const sampleLon = p1.lon + (p2.lon - p1.lon) * t;
            
            const terrainHeight = await this.getElevation(sampleLat, sampleLon);
            
            if (sampleAlt < terrainHeight - 0.1) {
                return false;
            }
        }
        return true;
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
