import { parentPort, workerData } from 'worker_threads';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.ts';

interface WorkerJob {
    lat: number;
    lon: number;
    targetRes?: number; // UI resolution, e.g. 256
}

if (!parentPort) throw new Error('Worker must be started with parentPort');

parentPort.on('message', async (job: WorkerJob) => {
    try {
        const { lat, lon, targetRes = 256 } = job;
        const engineRes = 1201;

        // 1. Fetch from AWS
        const engineData = await fetchFromAws(lat, lon, engineRes);
        
        // 2. Downsample for UI
        const uiData = downsample(engineData, engineRes, targetRes);

        // 3. Encode both
        const engineEncoded = WgtFormat.encode(engineRes, lat, lon, engineData);
        const uiEncoded = WgtFormat.encode(targetRes, lat, lon, uiData);

        parentPort!.postMessage({
            success: true,
            lat,
            lon,
            engineEncoded,
            uiEncoded
        });
    } catch (err: any) {
        parentPort!.postMessage({
            success: false,
            lat: job.lat,
            lon: job.lon,
            error: err.message
        });
    }
});

async function fetchFromAws(lat: number, lon: number, targetRes: number): Promise<Float32Array> {
    const floorLat = Math.floor(lat);
    const floorLon = Math.floor(lon);

    const latPart = floorLat >= 0 ? `N${String(Math.abs(floorLat)).padStart(2, '0')}` : `S${String(Math.abs(floorLat)).padStart(2, '0')}`;
    const lonPart = floorLon >= 0 ? `E${String(Math.abs(floorLon)).padStart(3, '0')}` : `W${String(Math.abs(floorLon)).padStart(3, '0')}`;
    const fileName = `${latPart}${lonPart}.hgt.gz`;
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/skadi/${latPart}/${fileName}`;

    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
            return new Float32Array(targetRes * targetRes).fill(0);
        }
        throw new Error(`Failed to fetch AWS tile ${url}: ${response.status}`);
    }

    const ds = new DecompressionStream('gzip');
    const decompressedStream = response.body!.pipeThrough(ds);
    const buffer = await new Response(decompressedStream).arrayBuffer();

    const view = new DataView(buffer);
    const sourceRes = 3601;
    const data = new Float32Array(targetRes * targetRes);

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

            let val = view.getInt16(idx, false); 
            if (val === -32768) val = 0; 

            data[y * targetRes + x] = val;
        }
    }

    return data;
}

function downsample(source: Float32Array, sourceRes: number, targetRes: number): Float32Array {
    const target = new Float32Array(targetRes * targetRes);
    const step = (sourceRes - 1) / (targetRes - 1);

    for (let y = 0; y < targetRes; y++) {
        for (let x = 0; x < targetRes; x++) {
            const sy = Math.round(y * step);
            const sx = Math.round(x * step);
            target[y * targetRes + x] = source[sy * sourceRes + sx];
        }
    }

    return target;
}
