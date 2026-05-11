/**
 * WgtFormat: World Grid Terrain binary format.
 * A high-performance binary layout for elevation grids.
 * 
 * Header (32 bytes):
 * [0-3]   Magic 'WGT1'
 * [4-7]   Resolution (e.g., 1201)
 * [8-11]  Origin Lat (int32, scale 1000)
 * [12-15] Origin Lon (int32, scale 1000)
 * [16-31] Reserved
 * 
 * Body:
 * Float32Array of elevation values (row-major, top-to-bottom, west-to-east)
 */
export class WgtFormat {
    public static readonly MAGIC = 0x31544757; // 'WGT1' in little-endian

    public static encode(resolution: number, lat: number, lon: number, data: Float32Array): Uint8Array {
        const buffer = new ArrayBuffer(32 + data.length * 4);
        const view = new DataView(buffer);

        view.setUint32(0, this.MAGIC, true);
        view.setUint32(4, resolution, true);
        view.setInt32(8, Math.round(lat * 1000), true);
        view.setInt32(12, Math.round(lon * 1000), true);

        const floatView = new Float32Array(buffer, 32);
        floatView.set(data);

        return new Uint8Array(buffer);
    }

    public static decode(input: any): { resolution: number, lat: number, lon: number, data: Float32Array } {
        let bytes: Uint8Array;

        if (input instanceof Uint8Array) {
            bytes = input;
        } else if (input && typeof input === 'object' && input.type === 'Buffer' && Array.isArray(input.data)) {
            // Handle Node.js Buffer JSON serialization: { type: 'Buffer', data: [...] }
            bytes = new Uint8Array(input.data);
        } else if (input && typeof input === 'object' && Array.isArray(input)) {
            bytes = new Uint8Array(input);
        } else if (input instanceof ArrayBuffer) {
            bytes = new Uint8Array(input);
        } else if (input && typeof input === 'object' && input.buffer instanceof ArrayBuffer) {
            bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        } else {
            // Fallback for array-like objects or other types
            bytes = new Uint8Array(input);
        }

        if (bytes.length < 32) {
            throw new Error(`Invalid WGT data: expected at least 32 bytes, got ${bytes.length}`);
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const magic = view.getUint32(0, true);

        if (magic !== this.MAGIC) {
            throw new Error('Invalid WGT file magic');
        }

        return {
            resolution: view.getUint32(4, true),
            lat: view.getInt32(8, true) / 1000,
            lon: view.getInt32(12, true) / 1000,
            data: new Float32Array(bytes.buffer, bytes.byteOffset + 32, (bytes.byteLength - 32) / 4)
        };
    }
}
