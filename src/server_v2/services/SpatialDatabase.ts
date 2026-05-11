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
     */
    public syncWithFilesystem(rootDir: string) {
        if (!fs.existsSync(rootDir)) return;
        
        console.log(`🔍 SpatialDB: Syncing with filesystem at ${rootDir}...`);
        const startTime = Date.now();
        let count = 0;

        this.db.exec('PRAGMA synchronous = OFF');
        this.db.exec('BEGIN TRANSACTION');

        try {
            const resolutions = fs.readdirSync(rootDir);
            for (const resDir of resolutions) {
                if (!resDir.startsWith('res_')) continue;
                const res = parseInt(resDir.split('_')[1]);
                const resPath = path.join(rootDir, resDir);
                
                const lats = fs.readdirSync(resPath);
                for (const latDir of lats) {
                    const lat = parseInt(latDir);
                    if (isNaN(lat)) continue;
                    const latPath = path.join(resPath, latDir);
                    
                    const files = fs.readdirSync(latPath);
                    for (const file of files) {
                        if (!file.endsWith('.wgt')) continue;
                        const lon = parseInt(file.replace('.wgt', ''));
                        if (isNaN(lon)) continue;

                        const filePath = path.join(latPath, file);
                        const data = fs.readFileSync(filePath);
                        
                        this.putDegreeTile(lat, lon, res, data);
                        count++;
                    }
                }
            }

            this.db.exec('COMMIT');
        } catch (err) {
            this.db.exec('ROLLBACK');
            throw err;
        } finally {
            this.db.exec('PRAGMA synchronous = NORMAL');
        }
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ SpatialDB: Ingested ${count} tiles in ${duration.toFixed(2)}s`);
    }

    public close() {
        this.db.close();
    }
}
