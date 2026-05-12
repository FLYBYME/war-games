import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WorkerService } from './WorkerService.js';
import { SpatialDatabase } from './SpatialDatabase.js';

export type HarvestStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'OCEAN' | 'ERROR';

/**
 * HarvesterService: Manages the systematic localization of global terrain data.
 * Implements a throttled (1Mbps) background crawler with priority queuing.
 */
export class HarvesterService {
    private db: Database.Database;
    private isRunning = false;
    private throttleBps = 1250000; // 10 Mbps = 1.25 MB/s
    private tokenBucket = 0;
    private maxTokens = 50000000; // 40 seconds of burst
    private lastTick = Date.now();
    private priorityQueue: { lat: number, lon: number }[] = [];

    constructor(
        private workerService: WorkerService,
        private spatialDb: SpatialDatabase,
        private storageDir: string = './data/terrain_storage'
    ) {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }

        this.db = new Database(path.join(this.storageDir, 'harvest_state.db'));
        this.initDb();

        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const WORKER_PATH = path.resolve(currentDir, '../workers/terrain.worker.ts');
        this.workerService.createPool('harvester', WORKER_PATH, 2);

        // Start the throttle tick (100ms)
        setInterval(() => this.tickThrottle(), 100);

        // On startup, reset any 'DOWNLOADING' tiles back to 'PENDING'
        this.db.prepare("UPDATE tiles SET status = 'PENDING' WHERE status = 'DOWNLOADING'").run();
    }

    private initDb() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tiles (
                lat INTEGER,
                lon INTEGER,
                status TEXT DEFAULT 'PENDING',
                error TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (lat, lon)
            );
            CREATE INDEX IF NOT EXISTS idx_status ON tiles(status);
        `);

        // Seed global tiles if empty (64,800 tiles)
        const count = this.db.prepare('SELECT COUNT(*) as count FROM tiles').get() as { count: number };
        if (count.count === 0) {
            console.log('Harvester: Seeding global tile registry (64,800 entries)...');
            const insert = this.db.prepare('INSERT INTO tiles (lat, lon) VALUES (?, ?)');
            this.db.transaction(() => {
                for (let lat = 89; lat >= -90; lat--) {
                    for (let lon = -180; lon <= 179; lon++) {
                        insert.run(lat, lon);
                    }
                }
            })();
            console.log('Harvester: Seeding complete.');
        }
    }

    private tickThrottle() {
        const now = Date.now();
        const delta = (now - this.lastTick) / 1000;
        this.lastTick = now;

        // Add tokens based on delta time and throttle limit
        this.tokenBucket = Math.min(this.maxTokens, this.tokenBucket + (this.throttleBps * delta));
    }

    /**
     * start: Launches the background crawler.
     */
    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`Harvester: Global crawl started (Throttle: ${Math.round(this.throttleBps * 8 / 1000000)} Mbps)`);

        void this.runCrawlLoop();
    }

    private async runCrawlLoop() {
        while (this.isRunning) {
            // 1. Check Priority Queue first
            let tile = this.priorityQueue.shift();

            if (!tile) {
                // 2. Get next pending tile (North to South priority)
                tile = this.db.prepare(`
                    SELECT lat, lon FROM tiles 
                    WHERE status = 'PENDING' 
                    ORDER BY lat DESC, lon ASC 
                    LIMIT 1
                `).get() as { lat: number, lon: number } | undefined;
            }

            if (!tile) {
                console.log('Harvester: All tiles processed. Standing by.');
                this.isRunning = false;
                break;
            }

            // Perform harvest (this throttles internally if not priority)
            await this.harvestTile(tile.lat, tile.lon, !!this.priorityQueue.length);

            // Brief pause between tiles to allow the event loop to breathe
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    /**
     * requestPriorityTile: Moves a coordinate to the front of the download queue.
     */
    public requestPriorityTile(lat: number, lon: number) {
        // Only if it's currently PENDING or ERROR
        const row = this.db.prepare('SELECT status FROM tiles WHERE lat = ? AND lon = ?').get(lat, lon) as { status: string } | undefined;
        if (!row || (row.status !== 'PENDING' && row.status !== 'ERROR')) return;

        // Avoid duplicates in the queue
        if (this.priorityQueue.some(t => t.lat === lat && t.lon === lon)) return;

        console.log(`🚀 Harvester: Priority request for ${lat}, ${lon}`);
        this.priorityQueue.push({ lat, lon });

        // Auto-start if stopped
        if (!this.isRunning) {
            void this.start();
        }
    }

    /**
     * harvestTile: Localizes a single 1x1 degree tile using the worker pool.
     */
    public async harvestTile(lat: number, lon: number, isPriority = false) {
        this.db.prepare('UPDATE tiles SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE lat = ? AND lon = ?')
            .run('DOWNLOADING', lat, lon);

        try {
            if (!isPriority) {
                // Wait for bandwidth availability (approximate)
                const estimatedSize = 3000000; // ~3MB compressed
                while (this.tokenBucket < estimatedSize) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (!this.isRunning) return;
                }
                this.tokenBucket -= estimatedSize;
            }

            const pool = this.workerService.getPool('harvester');
            const msg = await pool.execute<any>({ lat, lon, targetRes: 1201 });

            if (!msg.success) {
                if (msg.error?.includes('404') || msg.error?.includes('403')) {
                    this.db.prepare('UPDATE tiles SET status = ? WHERE lat = ? AND lon = ?').run('OCEAN', lat, lon);
                } else {
                    throw new Error(msg.error);
                }
                return;
            }

            // Save to SpatialDB
            this.spatialDb.putDegreeTile(lat, lon, 1201, Buffer.from(msg.encoded));

            this.db.prepare('UPDATE tiles SET status = ? WHERE lat = ? AND lon = ?').run('COMPLETED', lat, lon);
            console.log(`✅ Harvester: Saved N${lat}E${lon}`);

        } catch (err: any) {
            console.error(`❌ Harvester Error for ${lat},${lon}:`, err.message);
            this.db.prepare('UPDATE tiles SET status = ?, error = ? WHERE lat = ? AND lon = ?')
                .run('ERROR', err.message, lat, lon);
        }
    }

    public getStatus() {
        const start = process.hrtime();
        const stats = this.db.prepare(`
            SELECT 
                status, 
                COUNT(*) as count 
            FROM tiles 
            GROUP BY status
        `).all() as { status: string, count: number }[];

        const total = 64800;
        const completed = stats.find(s => s.status === 'COMPLETED')?.count || 0;
        const ocean = stats.find(s => s.status === 'OCEAN')?.count || 0;
        const [s, ns] = process.hrtime(start);
        const duration = (s * 1000 + ns / 1000000).toFixed(2);

        return {
            status: this.isRunning ? 'RUNNING' : 'IDLE',
            percentComplete: ((completed + ocean) / total) * 100,
            stats,
            throttle: `${(this.throttleBps * 8 / 1000000).toFixed(1)} Mbps`,
            duration
        };
    }

    public getCoverage() {
        return this.db.prepare(`
            SELECT lat, lon, status 
            FROM tiles 
            WHERE status != 'PENDING'
        `).all() as { lat: number, lon: number, status: string }[];
    }

    public stop() {
        this.isRunning = false;
    }
}
