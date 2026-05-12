import { parentPort } from 'worker_threads';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';

interface WorkerJob {
    lat: number;
    lon: number;
    targetRes?: number; // UI resolution, e.g. 256
}

if (!parentPort) throw new Error('Worker must be started with parentPort');

// ─── Heartbeat & Performance Reporting ───────────────────────────────────────

function sendHeartbeat() {
    parentPort!.postMessage({
        type: 'heartbeat',
        __performance: {
            memory: process.memoryUsage()
        }
    });
}

// Send initial heartbeat immediately
sendHeartbeat();

// Periodic heartbeat every 5 seconds
setInterval(sendHeartbeat, 5000);

parentPort.on('message', async (job: WorkerJob) => {
    try {
        const { lat, lon, targetRes = 1201 } = job;
        const sourceRes = 3601; // SRTM-1 is 3601x3601

        // 1. Fetch from AWS
        const engineData = await fetchFromAws(lat, lon, targetRes);
        
        // 2. Encode
        const encoded = WgtFormat.encode(targetRes, lat, lon, engineData);

        parentPort!.postMessage({
            success: true,
            lat,
            lon,
            encoded,
            __performance: {
                memory: process.memoryUsage()
            }
        });
    } catch (err: unknown) {
        const error = err as Error;
        parentPort!.postMessage({
            success: false,
            lat: job.lat,
            lon: job.lon,
            error: error.message,
            __performance: {
                memory: process.memoryUsage()
            }
        });
    }
});

async function fetchFromAws(lat: number, lon: number, targetRes: number): Promise<Int16Array> {
    const floorLat = Math.floor(lat);
    const floorLon = Math.floor(lon);

    const latPart = floorLat >= 0 ? `N${String(Math.abs(floorLat)).padStart(2, '0')}` : `S${String(Math.abs(floorLat)).padStart(2, '0')}`;
    const lonPart = floorLon >= 0 ? `E${String(Math.abs(floorLon)).padStart(3, '0')}` : `W${String(Math.abs(floorLon)).padStart(3, '0')}`;
    const fileName = `${latPart}${lonPart}.hgt.gz`;
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${latPart}/${fileName}`;

    console.log(`[TERRAIN-WORKER] Downloading: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
            console.log(`[TERRAIN-WORKER] Tile not found (returning ocean/zero): ${url}`);
            // Fill with 0 for water or missing data
            return new Int16Array(targetRes * targetRes).fill(0);
        }
        throw new Error(`Failed to fetch AWS tile ${url}: ${response.status}`);
    }

    const ds = new DecompressionStream('gzip');
    const decompressedStream = response.body!.pipeThrough(ds);
    const buffer = await new Response(decompressedStream).arrayBuffer();

    const view = new DataView(buffer);
    const sourceRes = 3601; // SRTM-1 is 3601x3601
    const data = new Int16Array(targetRes * targetRes);

    const step = (sourceRes - 1) / (targetRes - 1);

    for (let y = 0; y < targetRes; y++) {
        for (let x = 0; x < targetRes; x++) {
            const sy = Math.round(y * step);
            const sx = Math.round(x * step);
            const idx = (sy * sourceRes + sx) * 2;
            
            if (idx + 1 >= view.byteLength) {
                data[y * targetRes + x] = 0;
                continue;
            }

            let val = view.getInt16(idx, false); // SRTM is big-endian
            if (val === -32768) val = 0; 

            data[y * targetRes + x] = val;
        }
    }

    return data;
}
