/**
 * TheaterBundleFormat: A high-performance binary container for multiple terrain tiles.
 * 
 * Layout:
 * [0..3]   - Magic Number (0x5442554e - 'TBUN')
 * [4..7]   - Version (1)
 * [8..11]  - Tile Count (N)
 * [12..]   - Table of Contents (TOC) - N blocks of 20 bytes:
 *            [0..3] - Z (Zoom)
 *            [4..7] - X
 *            [8..11] - Y
 *            [12..15] - Offset into Payload
 *            [16..19] - Length of Tile Data
 * [HeaderEnd..] - Payload (Concatenated raw WGT tiles)
 */

export interface BundleEntry {
    z: number;
    x: number;
    y: number;
    data: Uint8Array;
}

export class TheaterBundleFormat {
    private static readonly MAGIC = 0x5442554e;
    private static readonly VERSION = 1;

    /**
     * pack: Concatenates multiple tiles into a single binary buffer.
     */
    static pack(entries: BundleEntry[]): Uint8Array {
        const tileCount = entries.length;
        const tocSize = tileCount * 20;
        const headerSize = 12 + tocSize;
        
        let totalPayloadSize = 0;
        for (const entry of entries) {
            totalPayloadSize += entry.data.length;
        }

        const buffer = new Uint8Array(headerSize + totalPayloadSize);
        const view = new DataView(buffer.buffer);

        // Header
        view.setUint32(0, this.MAGIC, true);
        view.setUint32(4, this.VERSION, true);
        view.setUint32(8, tileCount, true);

        // TOC and Payload
        let currentOffset = headerSize;
        for (let i = 0; i < tileCount; i++) {
            const entry = entries[i];
            const tocPos = 12 + i * 20;

            view.setUint32(tocPos + 0, entry.z, true);
            view.setUint32(tocPos + 4, entry.x, true);
            view.setUint32(tocPos + 8, entry.y, true);
            view.setUint32(tocPos + 12, currentOffset, true);
            view.setUint32(tocPos + 16, entry.data.length, true);

            buffer.set(entry.data, currentOffset);
            currentOffset += entry.data.length;
        }

        return buffer;
    }

    /**
     * unpack: Extracts all tiles from a binary bundle.
     */
    static unpack(buffer: Uint8Array): BundleEntry[] {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        
        const magic = view.getUint32(0, true);
        if (magic !== this.MAGIC) throw new Error('Invalid TheaterBundle magic number');

        const version = view.getUint32(4, true);
        if (version !== this.VERSION) throw new Error(`Unsupported TheaterBundle version: ${version}`);

        const tileCount = view.getUint32(8, true);
        const entries: BundleEntry[] = [];

        for (let i = 0; i < tileCount; i++) {
            const tocPos = 12 + i * 20;
            const z = view.getUint32(tocPos + 0, true);
            const x = view.getUint32(tocPos + 4, true);
            const y = view.getUint32(tocPos + 8, true);
            const offset = view.getUint32(tocPos + 12, true);
            const length = view.getUint32(tocPos + 16, true);

            const data = buffer.slice(offset, offset + length);
            entries.push({ z, x, y, data });
        }

        return entries;
    }
}
