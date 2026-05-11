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
    private throttleBps = 125000; // 1 Mbps = 125 KB/s
    private tokenBucket = 0;
    private maxTokens = 5000000; // 40 seconds of burst (enough for ~1.5 compressed tiles)
    private lastTick = Date.now();

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
            // 1. Get next pending tile (North to South priority)
            const tile = this.db.prepare(`
                SELECT lat, lon FROM tiles 
                WHERE status = 'PENDING' 
                ORDER BY lat DESC, lon ASC 
                LIMIT 1
            `).get() as { lat: number, lon: number } | undefined;

            if (!tile) {
                console.log('Harvester: All tiles processed. Standing by.');
                this.isRunning = false;
                break;
            }

            await this.harvestTile(tile.lat, tile.lon);
            
            // Brief pause between tiles to allow the event loop to breathe
            await new Promise(resolve => setTimeout(resolve, 100));
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
                    console.log(`Harvester: Waiting for bandwidth... (${Math.round(this.tokenBucket/1000)}kb / ${Math.round(estimatedSize/1000)}kb)`);
                }

                while (this.tokenBucket < estimatedSize) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                this.tokenBucket -= estimatedSize;
            }

            await this.terrainService.getTile(lat, lon, 1201);
            
            this.db.prepare('UPDATE tiles SET status = ? WHERE lat = ? AND lon = ?').run('COMPLETED', lat, lon);
        } catch (err: any) {
            const status = err.message.includes('404') ? 'OCEAN' : 'ERROR';
            this.db.prepare('UPDATE tiles SET status = ?, error = ? WHERE lat = ? AND lon = ?')
                .run(status, err.message, lat, lon);
        }
    }

    public getStatus() {
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

        return {
            status: this.isRunning ? 'RUNNING' : 'IDLE',
            percentComplete: ((completed + ocean) / total) * 100,
            stats,
            throttle: '1 Mbps'
        };
    }

    public stop() {
        this.isRunning = false;
    }
}
