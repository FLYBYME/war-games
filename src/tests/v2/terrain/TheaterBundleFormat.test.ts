import { describe, it, expect } from 'vitest';
import { TheaterBundleFormat, BundleEntry } from '../../../engine/environment/utils/TheaterBundleFormat';

describe('TheaterBundleFormat', () => {
    it('should pack and unpack 0, 1, and 2 tiles into a single bundle', () => {
        // 0 tiles
        const bundle0 = TheaterBundleFormat.pack([]);
        expect(TheaterBundleFormat.unpack(bundle0)).toEqual([]);

        // 1 tile
        const entries1: BundleEntry[] = [
            { z: 10, x: 500, y: 300, data: new Uint8Array([1, 2, 3, 4]) }
        ];
        const bundle1 = TheaterBundleFormat.pack(entries1);
        const unpacked1 = TheaterBundleFormat.unpack(bundle1);
        expect(unpacked1.length).toBe(1);
        expect(unpacked1[0].z).toBe(10);
        expect(unpacked1[0].x).toBe(500);
        expect(unpacked1[0].y).toBe(300);
        expect(Array.from(unpacked1[0].data)).toEqual([1, 2, 3, 4]);

        // 2 tiles
        const entries2: BundleEntry[] = [
            { z: 10, x: 500, y: 300, data: new Uint8Array([1, 2, 3, 4]) },
            { z: 10, x: 501, y: 300, data: new Uint8Array([5, 6, 7, 8, 9]) }
        ];
        const bundle2 = TheaterBundleFormat.pack(entries2);
        const unpacked2 = TheaterBundleFormat.unpack(bundle2);
        expect(unpacked2.length).toBe(2);
        expect(unpacked2[1].x).toBe(501);
        expect(Array.from(unpacked2[1].data)).toEqual([5, 6, 7, 8, 9]);
    });

    it('should pack and unpack 20 tiles and verify z/x/y coordinates', () => {
        const entries: BundleEntry[] = [];
        for (let i = 0; i < 20; i++) {
            entries.push({
                z: 12,
                x: 1000 + i,
                y: 2000 + i,
                data: new Uint8Array([i])
            });
        }
        const bundle = TheaterBundleFormat.pack(entries);
        const unpacked = TheaterBundleFormat.unpack(bundle);
        expect(unpacked.length).toBe(20);
        for (let i = 0; i < 20; i++) {
            expect(unpacked[i].z).toBe(12);
            expect(unpacked[i].x).toBe(1000 + i);
            expect(unpacked[i].y).toBe(2000 + i);
            expect(unpacked[i].data[0]).toBe(i);
        }
    });

    it('should verify data integrity (checksum or parity)', () => {
        const data = new Uint8Array(1024).map((_, i) => i % 256);
        const entries: BundleEntry[] = [{ z: 1, x: 1, y: 1, data }];
        const bundle = TheaterBundleFormat.pack(entries);
        const unpacked = TheaterBundleFormat.unpack(bundle);
        expect(unpacked[0].data).toEqual(data);
    });

    it('should reject invalid magic numbers in bundles', () => {
        const invalidBuffer = new Uint8Array(20).fill(0);
        expect(() => TheaterBundleFormat.unpack(invalidBuffer)).toThrow('Invalid TheaterBundle magic number');
    });

    it('should handle zero-length tile data within a bundle', () => {
        const entries: BundleEntry[] = [
            { z: 1, x: 1, y: 1, data: new Uint8Array(0) },
            { z: 1, x: 1, y: 2, data: new Uint8Array([255]) }
        ];
        const bundle = TheaterBundleFormat.pack(entries);
        const unpacked = TheaterBundleFormat.unpack(bundle);
        expect(unpacked[0].data.length).toBe(0);
        expect(unpacked[1].data.length).toBe(1);
        expect(unpacked[1].data[0]).toBe(255);
    });
});
