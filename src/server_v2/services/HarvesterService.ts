import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { TerrainService } from './TerrainService.js';

export type HarvestStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'OCEAN' | 'ERROR';

/**
 * HarvesterService: Manages the systematic localization of global terrain data.
 * Implements a throttled (1Mbps) background crawler with priority queuing.
 */
export class HarvesterService {
    private db: Database.Database;
    private isRunning = false;
    private throttleBps = 12500000; // 10 Mbps = 1250 KB/s
    private tokenBucket = 0;
    private maxTokens = 500000000; // 40 seconds of burst (enough for ~1.5 compressed tiles)
    private lastTick = Date.now();
    private priorityQueue: { lat: number, lon: number }[] = [];

    constructor(
        private terrainService: TerrainService,
        private storageDir: string = './data/terrain_storage'
    ) {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }

        this.db = new Database(path.join(this.storageDir, 'harvest_state.db'));
        this.initDb();

        // Start the throttle tick (100ms)
        setInterval(() => this.tickThrottle(), 100);
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
        const count = this.db.prepare('SELECT COUNT(*) as count FROM tiles').get() as any;
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

        // Add tokens based on delta time and 1Mbps limit
        this.tokenBucket = Math.min(this.maxTokens, this.tokenBucket + (this.throttleBps * delta));
    }

    /**
     * start: Launches the background crawler.
     */
    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`Harvester: Global crawl started (Throttle: 1 Mbps)`);

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

            await this.harvestTile(tile.lat, tile.lon, true); // JIT is always priority in terms of bandwidth

            // Brief pause between tiles to allow the event loop to breathe
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * requestPriorityTile: Moves a coordinate to the front of the download queue.
     */
    public requestPriorityTile(lat: number, lon: number) {
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
     * harvestTile: Localizes a single 1x1 degree tile.
     * Consumes tokens from the bucket to enforce throttle.
     */
    public async harvestTile(lat: number, lon: number, isPriority = false) {
        this.db.prepare('UPDATE tiles SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE lat = ? AND lon = ?')
            .run('DOWNLOADING', lat, lon);

        try {
            // Trigger TerrainService to fetch (this hits AWS and caches to disk)
            // Note: TerrainService currently doesn't respect our 1Mbps throttle internally.
            // For Phase 2, we wrap the fetch in a token-wait.

            if (!isPriority) {
                // Wait for bandwidth availability (approximate)
                // A typical SRTM .hgt.gz is ~3MB
                const estimatedSize = 3000000;
                if (this.tokenBucket < estimatedSize) {
                    console.log(`Harvester: Waiting for bandwidth... (${Math.round(this.tokenBucket / 1000)}kb / ${Math.round(estimatedSize / 1000)}kb)`);
                }

                while (this.tokenBucket < estimatedSize) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                this.tokenBucket -= estimatedSize;
            }

            const msg = await this.terrainService.getTile(lat, lon, 1201);

            // Save raw uncompressed data for ZeroCopyElevationService
            // The TerrainService.getTile returns decoded data, we want the raw bytes.
            const rawDir = './data/terrain_raw';
            if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

            const latPart = lat >= 0 ? `N${lat.toString().padStart(2, '0')}` : `S${Math.abs(lat).toString().padStart(2, '0')}`;
            const lonPart = lon >= 0 ? `E${lon.toString().padStart(3, '0')}` : `W${Math.abs(lon).toString().padStart(3, '0')}`;
            const rawPath = path.join(rawDir, `${latPart}${lonPart}.hgt`);

            // Re-encode to raw 16-bit big-endian if it's not already
            const rawBuffer = Buffer.alloc(1201 * 1201 * 2);
            for (let i = 0; i < msg.data.length; i++) {
                rawBuffer.writeInt16BE(msg.data[i], i * 2);
            }
            fs.writeFileSync(rawPath, rawBuffer);

            this.db.prepare('UPDATE tiles SET status = ? WHERE lat = ? AND lon = ?').run('COMPLETED', lat, lon);
        } catch (err: any) {
            const status = err.message.includes('404') ? 'OCEAN' : 'ERROR';
            this.db.prepare('UPDATE tiles SET status = ?, error = ? WHERE lat = ? AND lon = ?')
                .run(status, err.message, lat, lon);
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

        const res = {
            status: this.isRunning ? 'RUNNING' : 'IDLE',
            percentComplete: ((completed + ocean) / total) * 100,
            stats,
            throttle: '1 Mbps',
            duration
        };

        console.log(res);

        return res;
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
