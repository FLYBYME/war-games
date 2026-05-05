import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { ITileProvider } from '../../engine/environment/TerrainOracle.js';
import { ServiceConfig, IStorageProvider, ILogger, IImageProvider } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MapRegion {
    id: string;
    name: string;
    bounds: {
        minLat: number;
        maxLat: number;
        minLon: number;
        maxLon: number;
    };
    landPng: string;
    oceanPng: string;
    metadata: any;
}

/**
 * TerrainService: Manages World Map Assembly.
 */
export class TerrainService implements ITileProvider {
    private readonly engineDir: string;
    private readonly uiDir: string;
    private readonly regionsDir: string;
    private readonly storage: IStorageProvider;
    private readonly logger: ILogger;
    private readonly image?: IImageProvider;
    private regions: MapRegion[] = [];
    private readonly tileCache = new Map<string, Float32Array>();
    private readonly worker: Worker;
    private readonly pendingJobs = new Map<string, Array<{ resolve: (v: any) => void, reject: (e: any) => void }>>();

    constructor(config: ServiceConfig) {
        this.storage = config.storage;
        this.logger = config.logger;
        this.image = config.image;

        const base = config.baseDir || '';
        this.engineDir = this.storage.join(base, 'data', 'terrain', 'engine');
        this.uiDir = this.storage.join(base, 'data', 'terrain', 'ui');
        this.regionsDir = this.storage.join(base, 'metadata', 'grayscale-maps');

        // Start worker
        const workerPath = path.resolve(__dirname, '../../server/workers/terrain.worker.ts');
        this.worker = new Worker(workerPath, {
            execArgv: [...process.execArgv, '--no-warnings']
        });
        this.worker.on('message', (msg) => this.handleWorkerMessage(msg));
        this.worker.on('error', (err) => {
            this.logger.error('Terrain Worker Startup Error', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
        });
        this.worker.on('exit', (code) => {
            if (code !== 0) this.logger.error(`Terrain Worker stopped with exit code ${code}`);
        });
    }

    public async init() {
        if (!(await this.storage.exists(this.engineDir))) await this.storage.mkdir(this.engineDir, { recursive: true });
        if (!(await this.storage.exists(this.uiDir))) await this.storage.mkdir(this.uiDir, { recursive: true });

        await this.scanRegions();
        this.logger.info(`TerrainService initialized. Cache: ${this.engineDir}`);
    }

    private async scanRegions() {
        this.logger.warn('Region cache is deprecated.');
    }

    public getRegions() { return this.regions; }

    public async getStats() {
        const engineFiles = await this.storage.readdir(this.engineDir);
        const uiFiles = await this.storage.readdir(this.uiDir);

        let engineSize = 0;
        for (const f of engineFiles) {
            const stat = await this.storage.stat(this.storage.join(this.engineDir, f));
            engineSize += stat.size;
        }

        let uiSize = 0;
        for (const f of uiFiles) {
            const stat = await this.storage.stat(this.storage.join(this.uiDir, f));
            uiSize += stat.size;
        }

        return {
            regions: this.regions.length,
            cachedEngineTiles: engineFiles.filter(f => f.endsWith('.wgt')).length,
            cachedUITiles: uiFiles.filter(f => f.endsWith('.wgt')).length,
            engineSizeMb: Math.round(engineSize / 1024 / 1024 * 10) / 10,
            uiSizeMb: Math.round(uiSize / 1024 / 1024 * 10) / 10,
            memoryCacheSize: this.tileCache.size,
            pendingJobs: Array.from(this.pendingJobs.keys()),
        };
    }

    public async clearCache() {
        const engineFiles = await this.storage.readdir(this.engineDir);
        for (const file of engineFiles) {
            if (file.endsWith('.wgt')) {
                await this.storage.unlink(this.storage.join(this.engineDir, file));
            }
        }

        const uiFiles = await this.storage.readdir(this.uiDir);
        for (const file of uiFiles) {
            if (file.endsWith('.wgt')) {
                await this.storage.unlink(this.storage.join(this.uiDir, file));
            }
        }

        this.tileCache.clear();
        this.logger.info('Terrain cache cleared');
    }

    public async getTile(lat: number, lon: number): Promise<Float32Array | undefined> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;

        if (this.tileCache.has(key)) return this.tileCache.get(key);

        const fileName = `${this.coordToName(floorLat, floorLon)}.wgt`;
        const filePath = this.storage.join(this.engineDir, fileName);

        if (await this.storage.exists(filePath)) {
            const buffer = await this.storage.readFile(filePath) as ArrayBuffer;
            const decoded = WgtFormat.decode(buffer);
            this.tileCache.set(key, decoded.data);
            return decoded.data;
        }

        // Dispatch to worker
        return (await this.dispatchToWorker(floorLat, floorLon)).engineData;
    }

    public async getTileEncoded(lat: number, lon: number): Promise<Uint8Array | undefined> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const fileName = `${this.coordToName(floorLat, floorLon)}.wgt`;
        const filePath = this.storage.join(this.uiDir, fileName);

        if (await this.storage.exists(filePath)) {
            const buffer = await this.storage.readFile(filePath) as ArrayBuffer;
            return new Uint8Array(buffer);
        }

        // Dispatch to worker
        const result = await this.dispatchToWorker(floorLat, floorLon);
        return result.uiEncoded;
    }

    private coordToName(lat: number, lon: number): string {
        const latPart = lat >= 0 ? `N${lat}` : `S${Math.abs(lat)}`;
        const lonPart = lon >= 0 ? `E${lon}` : `W${Math.abs(lon)}`;
        return `${latPart}${lonPart}`;
    }

    private async dispatchToWorker(lat: number, lon: number): Promise<{ engineData: Float32Array, uiEncoded: Uint8Array }> {
        const key = `${lat},${lon}`;
        if (!this.pendingJobs.has(key)) {
            this.pendingJobs.set(key, []);
            this.worker.postMessage({ lat, lon });
        }

        return new Promise((resolve, reject) => {
            this.pendingJobs.get(key)!.push({ resolve, reject });
        });
    }

    private async handleWorkerMessage(msg: any) {
        const { success, lat, lon, engineEncoded, uiEncoded, error } = msg;
        const key = `${lat},${lon}`;
        const waiters = this.pendingJobs.get(key) || [];
        this.pendingJobs.delete(key);

        if (!success) {
            waiters.forEach(w => w.reject(new Error(error)));
            return;
        }

        // Write to disk cache
        const fileName = `${this.coordToName(lat, lon)}.wgt`;
        await this.storage.writeFile(this.storage.join(this.engineDir, fileName), engineEncoded);
        await this.storage.writeFile(this.storage.join(this.uiDir, fileName), uiEncoded);

        const decoded = WgtFormat.decode(engineEncoded.buffer);
        this.tileCache.set(key, decoded.data);

        waiters.forEach(w => w.resolve({ engineData: decoded.data, uiEncoded }));
    }
}
