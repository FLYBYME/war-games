/**
 * WgtFormat: World Grid Terrain binary format v2.
 * A high-performance binary layout for elevation grids.
 * 
 * Header (32 bytes, Little-Endian):
 * [0-3]   Magic 'WGT2' (0x32544757)
 * [4-7]   Resolution (N). Tile is N x N points.
 * [8-9]   Format (FMT). 0 = Int16 (default), 1 = Float32.
 * [10-13] Origin Lat (int32, scale 1000)
 * [14-17] Origin Lon (int32, scale 1000)
 * [18-31] Reserved
 * 
 * Body:
 * Int16Array or Float32Array of elevation values (row-major, top-to-bottom, west-to-east)
 */
export class WgtFormat {
    public static readonly MAGIC = 0x32544757; // 'WGT2'

    /**
     * encode: Converts elevation data into a WGTv2 binary buffer.
     */
    public static encode(
        resolution: number, 
        lat: number, 
        lon: number, 
        data: Int16Array | Float32Array
    ): Uint8Array {
        const fmt = data instanceof Float32Array ? 1 : 0;
        const bytesPerPoint = fmt === 1 ? 4 : 2;
        
        const buffer = new ArrayBuffer(32 + data.length * bytesPerPoint);
        const view = new DataView(buffer);

        view.setUint32(0, this.MAGIC, true);
        view.setUint32(4, resolution, true);
        view.setUint16(8, fmt, true);
        view.setInt32(10, Math.round(lat * 1000), true);
        view.setInt32(14, Math.round(lon * 1000), true);

        if (fmt === 1) {
            const floatView = new Float32Array(buffer, 32);
            floatView.set(data as Float32Array);
        } else {
            const intView = new Int16Array(buffer, 32);
            intView.set(data as Int16Array);
        }

        return new Uint8Array(buffer);
    }

    /**
     * decode: Reconstructs a terrain tile from a binary buffer.
     * Supports WGT1 (legacy) and WGT2.
     */
    public static decode(input: any): { resolution: number, lat: number, lon: number, data: Float32Array | Int16Array, format: number } {
        let bytes: Uint8Array;

        // 1. Normalize input to Uint8Array
        if (input instanceof Uint8Array) {
            bytes = input;
        } else if (input && typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {
            bytes = new Uint8Array(input.data);
        } else if (input && typeof input === 'object' && Array.isArray(input)) {
            bytes = new Uint8Array(input);
        } else if (input instanceof ArrayBuffer) {
            bytes = new Uint8Array(input);
        } else if (input && typeof input === 'object' && input.buffer instanceof ArrayBuffer) {
            bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        } else {
            bytes = new Uint8Array(input);
        }

        if (bytes.length < 32) {
            throw new Error(`Invalid WGT data: expected at least 32 bytes, got ${bytes.length}`);
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const magic = view.getUint32(0, true);

        // ─── WGT2 Handling ───────────────────────────────────────────────────
        if (magic === this.MAGIC) {
            const resolution = view.getUint32(4, true);
            const format = view.getUint16(8, true);
            const lat = view.getInt32(10, true) / 1000;
            const lon = view.getInt32(14, true) / 1000;

            let data: Float32Array | Int16Array;
            if (format === 1) {
                data = new Float32Array(bytes.buffer, bytes.byteOffset + 32, (bytes.byteLength - 32) / 4);
            } else {
                data = new Int16Array(bytes.buffer, bytes.byteOffset + 32, (bytes.byteLength - 32) / 2);
            }

            return { resolution, lat, lon, data, format };
        }

        // ─── Legacy WGT1 Handling ────────────────────────────────────────────
        if (magic === 0x31544757) {
            return {
                resolution: view.getUint32(4, true),
                lat: view.getInt32(8, true) / 1000,
                lon: view.getInt32(12, true) / 1000,
                data: new Float32Array(bytes.buffer, bytes.byteOffset + 32, (bytes.byteLength - 32) / 4),
                format: 1
            };
        }

        throw new Error(`Invalid WGT file magic: 0x${magic.toString(16)}`);
    }
}
