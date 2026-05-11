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
        const row = this.db.prepare('SELECT data FROM quad_tiles WHERE z = ? AND x = ? AND y = ?').get(z, x, y) as any;
        return row ? row.data : null;
    }

    public putQuadTile(z: number, x: number, y: number, data: Buffer | Uint8Array) {
        this.db.prepare(`
            INSERT OR REPLACE INTO quad_tiles (z, x, y, data, last_updated) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(z, x, y, data);
    }

    public getDegreeTile(lat: number, lon: number, res: number): Buffer | null {
        const row = this.db.prepare('SELECT data FROM degree_tiles WHERE lat = ? AND lon = ? AND res = ?').get(lat, lon, res) as any;
        return row ? row.data : null;
    }

    public putDegreeTile(lat: number, lon: number, res: number, data: Buffer | Uint8Array) {
        this.db.prepare(`
            INSERT OR REPLACE INTO degree_tiles (lat, lon, res, data, last_updated) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(lat, lon, res, data);
    }

    public close() {
        this.db.close();
    }
}
