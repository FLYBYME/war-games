import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LRUCache } from 'lru-cache';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { WorkerService } from './WorkerService.js';
import { SpatialDatabase } from './SpatialDatabase.js';
import { ZeroCopyElevationService } from './ZeroCopyElevationService.js';

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

    constructor(
        private readonly workerService: WorkerService,
        private readonly spatialDb?: SpatialDatabase,
        private readonly zeroCopyElev?: ZeroCopyElevationService
    ) {
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
            // console.log(`[TerrainService] Waiting for active job: ${key}`);
            return this.activeJobs.get(key)!;
        }

        //console.log(`[TerrainService] Cache miss for ${key}, starting fetch...`);

        const job = (async () => {
            // 3. SQLite/Spatial Database (L2 - Optimized)
            if (this.spatialDb) {
                const cachedData = this.spatialDb.getDegreeTile(floorLat, floorLon, targetResolution);
                if (cachedData) {
                    console.log(`[TerrainService] L2 Hit (SpatialDB): ${key}`);
                    const decoded = WgtFormat.decode(cachedData);
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
            }

            // 4. Legacy File Disk Cache (L2 - Migration Fallback)
            const diskPath = path.join(this.diskCacheDir, `res_${targetResolution}`, `${floorLat}`, `${floorLon}.wgt`);
            if (fs.existsSync(diskPath)) {
                try {
                    const buffer = fs.readFileSync(diskPath);
                    console.log(`[TerrainService] L2 Hit (Legacy Disk): ${key}`);
                    const decoded = WgtFormat.decode(buffer);
                    const tile: TerrainTile = {
                        lat: decoded.lat,
                        lon: decoded.lon,
                        resolution: decoded.resolution,
                        data: decoded.data,
                        format: decoded.format
                    };

                    // Migrate to SQLite if available
                    if (this.spatialDb) {
                        this.spatialDb.putDegreeTile(floorLat, floorLon, targetResolution, buffer);
                    }

                    this.ramCache.set(key, tile);
                    return tile;
                } catch (err) {
                    console.error(`TerrainService: Failed to read disk cache at ${diskPath}`, err);
                }
            }

            // 5. Remote Node (L3) - Only if on Laptop (client-mode)
            if (this.remoteNodeUrl) {
                const remoteUrl = `${this.remoteNodeUrl}/api/v2/terrain/tile/degree?lat=${floorLat}&lon=${floorLon}&res=${targetResolution}`;
                try {
                    console.log(`[TerrainService] L3 Fetching: ${remoteUrl}`);
                    const response = await fetch(remoteUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Save to L2 (SQLite)
                        if (this.spatialDb) {
                            this.spatialDb.putDegreeTile(floorLat, floorLon, targetResolution, buffer);
                        }

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

            // 6. Zero-Wait Fallback: If in Master-mode and cache miss, return flat tile and trigger background harvest
            if (this.spatialDb && !this.remoteNodeUrl) {
                // console.log(`[TerrainService] Triggering background bake for ${key}`);
                // Trigger background bake (don't await)
                await this.triggerBackgroundBake(floorLat, floorLon, targetResolution);

                // Return Flat/Sea-Level Fallback instantly
                return this.getFallbackTile(floorLat, floorLon, targetResolution);
            }

            // 7. Fallback: Worker (Standard Master-mode wait)
            console.log(`[TerrainService] Executing worker bake for ${key}`);
            return this.executeWorkerBake(floorLat, floorLon, targetResolution);
        })().finally(() => {
            this.activeJobs.delete(key);
        });

        this.activeJobs.set(key, job);
        return job;
    }

    private async triggerBackgroundBake(lat: number, lon: number, res: number) {
        try {
            const tile = await this.executeWorkerBake(lat, lon, res);
            console.log(`✅ SmartServer: Background bake complete for ${lat}, ${lon}`);
        } catch (err) {
            console.error(`❌ SmartServer: Background bake failed for ${lat}, ${lon}`, err);
        }
    }

    private async executeWorkerBake(lat: number, lon: number, targetResolution: number): Promise<TerrainTile> {
        const pool = this.workerService.getPool('terrain');
        const msg = await pool.execute<any>({ lat, lon, targetRes: targetResolution });

        if (!msg.success) {
            console.error(`[TerrainService] Worker bake FAILED for ${lat},${lon}: ${msg.error}`);
            throw new Error(msg.error);
        }

        console.log(`[TerrainService] Worker bake SUCCESS for ${lat},${lon}`);
        const encoded = targetResolution === 1201 ? msg.engineEncoded : msg.uiEncoded;
        const decoded = WgtFormat.decode(encoded);
        const tile: TerrainTile = {
            lat: msg.lat,
            lon: msg.lon,
            resolution: decoded.resolution,
            data: decoded.data,
            format: decoded.format
        };

        // Save to SQLite (L2)
        if (this.spatialDb) {
            this.spatialDb.putDegreeTile(lat, lon, targetResolution, Buffer.from(encoded));
        }

        this.ramCache.set(`${lat},${lon}_${targetResolution}`, tile);
        return tile;
    }

    private getFallbackTile(lat: number, lon: number, res: number): TerrainTile {
        return {
            lat,
            lon,
            resolution: res,
            data: new Int16Array(res * res).fill(0), // Sea level
            format: 0
        };
    }

    /**
     * getElevationSync: Synchronous high-speed point query.
     * Returns elevation from RAM cache or ZeroCopy disk if available, otherwise null.
     */
    public getElevationSync(lat: number, lon: number): number | null {
        // 1. FAST PATH: ZeroCopy direct disk sampling (Master Mode)
        if (this.zeroCopyElev) {
            const elev = this.zeroCopyElev.getElevationAt(lat, lon);
            if (elev !== null) return elev;
        }

        // 2. RAM PATH: Check if tile is already in RAM
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}_1201`;

        const tile = this.ramCache.get(key);
        if (!tile) return null;

        const res = tile.resolution;
        const dLat = lat - floorLat;
        const dLon = lon - floorLon;

        const x = Math.round(dLon * (res - 1));
        const y = Math.round((1 - dLat) * (res - 1));

        const idx = y * res + x;
        return tile.data[idx] ?? 0;
    }

    /**
     * getElevation: High-speed point query.
     * Uses ZeroCopy disk sampling if available on Master node.
     */
    public async getElevation(lat: number, lon: number): Promise<number> {
        // Try synchronous path first
        const syncElev = this.getElevationSync(lat, lon);
        if (syncElev !== null) return syncElev;

        // Fallback to loaded tiles
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
        // 1. Check if we have the necessary tiles locally
        const tilesNeeded = new Set<string>();
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const lat = p1.lat + (p2.lat - p1.lat) * t;
            const lon = p1.lon + (p2.lon - p1.lon) * t;
            tilesNeeded.add(`${Math.floor(lat)},${Math.floor(lon)}`);
        }

        let allTilesLocal = true;
        for (const tileKey of tilesNeeded) {
            const [lat, lon] = tileKey.split(',').map(Number);
            const diskPath = path.join(this.diskCacheDir, `res_1201`, `${lat}`, `${lon}.wgt`);
            if (!fs.existsSync(diskPath)) {
                allTilesLocal = false;
                break;
            }
        }

        // 2. If NOT all tiles are local and we have a remote node, offload the math
        if (!allTilesLocal && this.remoteNodeUrl) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for math offload

            try {
                const response = await fetch(`${this.remoteNodeUrl}/api/v2/env/math/los`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p1, p2, numSamples }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    return !result.blocked;
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                // Only log if it's not a connection/timeout error to keep logs clean
                if (err.name !== 'AbortError' && err.code !== 'ECONNREFUSED') {
                    console.warn(`TerrainService: Math Oracle offload failed`, err.message);
                }
            }
        }

        // 3. Fallback: Local calculation (either we have the tiles, or we don't have a remote node)
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
