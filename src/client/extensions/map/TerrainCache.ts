import { openDB, IDBPDatabase } from 'idb';

/**
 * TerrainCache: Manages persistent client-side storage for terrain tiles using IndexedDB.
 * This significantly reduces network traffic for repeated visits to the same area.
 */
export class TerrainCache {
    private static readonly DB_NAME = 'war-games-terrain';
    private static readonly VERSION = 1;
    private static readonly STORE_NAME = 'tiles';
    private db: IDBPDatabase | null = null;
    public enabled = true;

    async init() {
        if (!this.enabled) return;
        this.db = await openDB(TerrainCache.DB_NAME, TerrainCache.VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(TerrainCache.STORE_NAME)) {
                    db.createObjectStore(TerrainCache.STORE_NAME);
                }
            },
        });
    }

    /**
     * getDb: Ensures the database is initialized and returns it.
     */
    private async getDb(): Promise<IDBPDatabase | null> {
        if (!this.enabled) return null;
        if (!this.db) {
            await this.init();
        }
        return this.db;
    }

    private getKey(z: number, x: number, y: number): string {
        return `tile:${z}:${x}:${y}`;
    }

    /**
     * getTile: Retrieves a tile from IndexedDB.
     */
    async getTile(z: number, x: number, y: number): Promise<Uint8Array | null> {
        const db = await this.getDb();
        if (!db) return null;
        return (await db.get(TerrainCache.STORE_NAME, this.getKey(z, x, y))) || null;
    }

    /**
     * putTile: Saves a tile to IndexedDB.
     */
    async putTile(z: number, x: number, y: number, data: Uint8Array): Promise<void> {
        const db = await this.getDb();
        if (!db) return;
        await db.put(TerrainCache.STORE_NAME, data, this.getKey(z, x, y));
    }

    /**
     * putTiles: Saves multiple tiles to IndexedDB in a single transaction.
     */
    async putTiles(entries: { z: number; x: number; y: number; data: Uint8Array }[]): Promise<void> {
        const db = await this.getDb();
        if (!db) return;
        const tx = db.transaction(TerrainCache.STORE_NAME, 'readwrite');
        await Promise.all([
            ...entries.map(e => tx.store.put(e.data, this.getKey(e.z, e.x, e.y))),
            tx.done
        ]);
    }

    /**
     * clear: Wipes the entire terrain cache.
     */
    async clear() {
        const db = await this.getDb();
        if (!db) return;
        await db.clear(TerrainCache.STORE_NAME);
    }
}
