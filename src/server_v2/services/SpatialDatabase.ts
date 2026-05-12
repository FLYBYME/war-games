import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * SpatialDatabase: High-performance SQLite storage for baked terrain tiles.
 * Optimized for O(1) disk lookups of binary QuadTree and Degree tiles.
 */
export class SpatialDatabase {
    private db: Database.Database;

    constructor(storageDir: string = './data/spatial_storage') {
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        this.db = new Database(path.join(storageDir, 'terrain_tiles.db'));
        this.init();
    }

    private init() {
        this.db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            
            CREATE TABLE IF NOT EXISTS quad_tiles (
                z INTEGER,
                x INTEGER,
                y INTEGER,
                data BLOB,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (z, x, y)
            );

            CREATE TABLE IF NOT EXISTS degree_tiles (
                lat INTEGER,
                lon INTEGER,
                res INTEGER,
                data BLOB,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (lat, lon, res)
            );

            CREATE INDEX IF NOT EXISTS idx_quad_coords ON quad_tiles(z, x, y);
        `);
    }

    public getQuadTile(z: number, x: number, y: number): Buffer | null {
        const row = this.db.prepare('SELECT data FROM quad_tiles WHERE z = ? AND x = ? AND y = ?').get(z, x, y) as { data: Buffer } | undefined;
        return row ? row.data : null;
    }

    public putQuadTile(z: number, x: number, y: number, data: Buffer | Uint8Array) {
        this.db.prepare(`
            INSERT OR REPLACE INTO quad_tiles (z, x, y, data, last_updated) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(z, x, y, data);
    }

    public getDegreeTile(lat: number, lon: number, res: number): Buffer | null {
        const row = this.db.prepare('SELECT data FROM degree_tiles WHERE lat = ? AND lon = ? AND res = ?').get(lat, lon, res) as { data: Buffer } | undefined;
        return row ? row.data : null;
    }

    public putDegreeTile(lat: number, lon: number, res: number, data: Buffer | Uint8Array) {
        this.db.prepare(`
            INSERT OR REPLACE INTO degree_tiles (lat, lon, res, data, last_updated) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(lat, lon, res, data);
    }

    /**
     * syncWithFilesystem: Crawls an existing terrain_data directory and indexes all .wgt files.
     * This ensures we build upon existing data instead of re-downloading.
     * Runs asynchronously to avoid blocking the main thread.
     */
    public async syncWithFilesystem(rootDir: string) {
        if (!fs.existsSync(rootDir)) return;

        console.log(`🔍 SpatialDB: Syncing with filesystem at ${rootDir}...`);
        const startTime = Date.now();
        let count = 0;

        // Run in background without blocking
        void (async () => {
            try {
                // Set performance pragmas outside transaction
                this.db.exec('PRAGMA synchronous = OFF');
                this.db.exec('BEGIN TRANSACTION');

                const resolutions = await fs.promises.readdir(rootDir);
                for (const resDir of resolutions) {
                    if (!resDir.startsWith('res_')) continue;
                    const res = parseInt(resDir.split('_')[1]);
                    const resPath = path.join(rootDir, resDir);

                    const lats = await fs.promises.readdir(resPath);
                    for (const latDir of lats) {
                        const lat = parseInt(latDir);
                        if (isNaN(lat)) continue;
                        const latPath = path.join(resPath, latDir);

                        const files = await fs.promises.readdir(latPath);
                        for (const file of files) {
                            if (!file.endsWith('.wgt')) continue;
                            const lon = parseInt(file.replace('.wgt', ''));
                            if (isNaN(lon)) continue;

                            const filePath = path.join(latPath, file);
                            const data = await fs.promises.readFile(filePath);

                            this.putDegreeTile(lat, lon, res, data);
                            count++;

                            // Yield and Commit periodically to keep the event loop and DB healthy
                            if (count % 200 === 0) {
                                this.db.exec('COMMIT');
                                await new Promise(resolve => setTimeout(resolve, 0));
                                this.db.exec('BEGIN TRANSACTION');
                            }
                        }
                    }
                }

                this.db.exec('COMMIT');
            } catch (err) {
                console.error(`❌ SpatialDB Sync Error: ${err}`);
                try { this.db.exec('ROLLBACK'); } catch { /* ignore */ }
            } finally {
                this.db.exec('PRAGMA synchronous = NORMAL');
                const duration = (Date.now() - startTime) / 1000;
                if (count > 0) {
                    console.log(`✅ SpatialDB: Background sync complete. Ingested ${count} tiles in ${duration.toFixed(2)}s`);
                }
            }
        })();
    }

    public getStats() {
        const start = process.hrtime();
        const quadCount = this.db.prepare('SELECT COUNT(*) as count FROM quad_tiles').get() as { count: number };
        const degreeCount = this.db.prepare('SELECT COUNT(*) as count FROM degree_tiles').get() as { count: number };
        const [s, ns] = process.hrtime(start);
        const duration = (s * 1000 + ns / 1000000).toFixed(2);

        // Get database file size
        const dbPath = path.join('./data/spatial_storage', 'terrain_tiles.db');
        let dbSize = 0;
        try {
            const stats = fs.statSync(dbPath);
            dbSize = stats.size;
        } catch (e) { /* ignore */ }

        const res = {
            quadCount: quadCount.count,
            degreeCount: degreeCount.count,
            dbSize,
            duration
        };

        console.log(res);

        return res;
    }

    public close() {
        this.db.close();
    }
}
