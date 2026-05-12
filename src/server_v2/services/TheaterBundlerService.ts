import { QuadTreeBaker } from './QuadTreeBaker.js';
import { TheaterBundleFormat, BundleEntry } from '../../engine/environment/utils/TheaterBundleFormat.js';

/**
 * TheaterBundlerService: Orchestrates the creation of multi-tile binary bundles.
 * 
 * This service reduces network overhead by allowing the client to request
 * many tiles in a single POST request.
 */
export class TheaterBundlerService {
    constructor(private readonly baker: QuadTreeBaker) { }

    /**
     * createBundle: Fetches and packs a list of tiles into a TheaterBundle.
     * @param tiles List of {z, x, y} coordinates to include.
     */
    async createBundle(tiles: { z: number; x: number; y: number }[]): Promise<Uint8Array> {
        const entries: BundleEntry[] = [];

        // Fetch all tiles in parallel
        const tasks = tiles.map(async (t) => {
            try {
                const start = performance.now();
                const data = await this.baker.getTile(t.z, t.x, t.y);
                const end = performance.now();
                console.log(`TheaterBundlerService: Fetched tile z${t.z}/x${t.x}/y${t.y} in ${end - start}ms`);
                return { z: t.z, x: t.x, y: t.y, data };
            } catch (err) {
                console.error(`TheaterBundlerService: Failed to bake tile z${t.z}/x${t.x}/y${t.y}`, err);
                return null;
            }
        });

        const results = await Promise.all(tasks);

        // Filter out failed tiles
        for (const res of results) {
            if (res) entries.push(res);
        }

        if (entries.length === 0) {
            throw new Error('TheaterBundlerService: Failed to fetch any tiles for the requested bundle.');
        }

        // Pack into binary format
        const start = performance.now();
        const bundle = TheaterBundleFormat.pack(entries);
        const end = performance.now();
        console.log(`TheaterBundlerService: Packed ${entries.length} tiles into bundle in ${end - start}ms`);
        return bundle;
    }
}
