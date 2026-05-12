import { WorkerService } from '../services/WorkerService.js';
import { TerrainService } from '../services/TerrainService.js';
import { SpatialDatabase } from '../services/SpatialDatabase.js';

/**
 * bake_base_globe.ts
 * Generates a low-resolution (32x32) terrain dataset for the entire planet.
 * This provides the "Base Globe" fallback for JIT streaming.
 */

async function main() {
    console.log('🌍 Base Globe Generator: Initializing...');
    
    const spatialDb = new SpatialDatabase();
    const workerService = new WorkerService();
    const terrainService = new TerrainService(workerService, spatialDb);

    const START_LAT = 89;
    const END_LAT = -90;
    const START_LON = -180;
    const END_LON = 179;
    const RESOLUTION = 32;

    const total = 64800; // 180 * 360
    let count = 0;
    const startTime = Date.now();

    console.log(`🌍 Base Globe Generator: Baking ${total} tiles at res ${RESOLUTION}...`);

    // Process in batches to avoid overwhelming the worker pool / event loop
    const BATCH_SIZE = 50;

    for (let lat = START_LAT; lat >= END_LAT; lat--) {
        const rowTasks = [];
        for (let lon = START_LON; lon <= END_LON; lon++) {
            rowTasks.push((async (l, o) => {
                try {
                    await terrainService.getTile(l, o, RESOLUTION);
                    count++;
                    
                    if (count % 100 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const rate = count / elapsed;
                        const remaining = (total - count) / rate;
                        console.log(`[Base Globe] Progress: ${count}/${total} (${((count/total)*100).toFixed(1)}%) - Rate: ${rate.toFixed(1)} tiles/sec - Remaining: ${Math.round(remaining)}s`);
                    }
                } catch (err) {
                    console.error(`[Base Globe] Failed tile ${l},${o}:`, err);
                }
            })(lat, lon));

            if (rowTasks.length >= BATCH_SIZE) {
                await Promise.all(rowTasks);
                rowTasks.length = 0;
            }
        }
        await Promise.all(rowTasks);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Base Globe Generator: Complete! Baked ${count} tiles in ${duration.toFixed(2)}s`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Base Globe Generator FAILED:', err);
    process.exit(1);
});
