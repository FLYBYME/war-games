import { describe, it, expect } from 'vitest';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';

describe('WgtFormat', () => {
    it('should round-trip Int16 data with exact parity', () => {
        const resolution = 4;
        const lat = 10.5;
        const lon = 20.5;
        const data = new Int16Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160]);
        
        const encoded = WgtFormat.encode(resolution, lat, lon, data);
        const decoded = WgtFormat.decode(encoded);
        
        expect(decoded.resolution).toBe(resolution);
        expect(decoded.lat).toBe(lat);
        expect(decoded.lon).toBe(lon);
        expect(decoded.format).toBe(0);
        expect(decoded.data).toBeInstanceOf(Int16Array);
        expect(Array.from(decoded.data)).toEqual(Array.from(data));
    });

    it('should round-trip Float32 data with exact parity', () => {
        const resolution = 2;
        const lat = -45.0;
        const lon = 170.0;
        const data = new Float32Array([1.1, 2.2, 3.3, 4.4]);
        
        const encoded = WgtFormat.encode(resolution, lat, lon, data);
        const decoded = WgtFormat.decode(encoded);
        
        expect(decoded.resolution).toBe(resolution);
        expect(decoded.lat).toBe(lat);
        expect(decoded.lon).toBe(lon);
        expect(decoded.format).toBe(1);
        expect(decoded.data).toBeInstanceOf(Float32Array);
        for (let i = 0; i < data.length; i++) {
            expect(decoded.data[i]).toBeCloseTo(data[i], 5);
        }
    });

    it('should handle invalid magic numbers', () => {
        const buffer = new Uint8Array(32).fill(0);
        expect(() => WgtFormat.decode(buffer)).toThrow('Invalid WGT file magic');
    });

    it('should handle truncated buffers (shorter than 32 bytes)', () => {
        const buffer = new Uint8Array(31).fill(0);
        expect(() => WgtFormat.decode(buffer)).toThrow('expected at least 32 bytes');
    });

    it('should handle mismatched data lengths vs resolution', () => {
        // Encode with 4x4 resolution but provide 4x4 data.
        // Then manually truncate the buffer.
        const resolution = 4;
        const data = new Int16Array(16).fill(100);
        const encoded = WgtFormat.encode(resolution, 0, 0, data);
        
        // Truncate the body by 2 bytes (one Int16)
        const truncated = encoded.slice(0, encoded.length - 2);
        
        // WgtFormat.decode uses (bytes.byteLength - 32) / 2 to determine length, 
        // so it might not throw but will return a smaller array.
        const decoded = WgtFormat.decode(truncated);
        expect(decoded.data.length).toBe(15);
    });

    it('should validate Lat/Lon coordinate scale (round-trip * 1000)', () => {
        const resolution = 1;
        const lat = 12.3456; // Should be rounded to 12.346
        const lon = 98.7654; // Should be rounded to 98.765
        const data = new Int16Array([0]);
        
        const encoded = WgtFormat.encode(resolution, lat, lon, data);
        const decoded = WgtFormat.decode(encoded);
        
        expect(decoded.lat).toBe(12.346);
        expect(decoded.lon).toBe(98.765);
    });

    it('should handle zero-resolution tiles', () => {
        const resolution = 0;
        const data = new Int16Array(0);
        const encoded = WgtFormat.encode(resolution, 0, 0, data);
        const decoded = WgtFormat.decode(encoded);
        
        expect(decoded.resolution).toBe(0);
        expect(decoded.data.length).toBe(0);
    });

    it('should support legacy WGT1 magic numbers', () => {
        const buffer = new ArrayBuffer(64);
        const view = new DataView(buffer);
        view.setUint32(0, 0x31544757, true); // WGT1
        view.setUint32(4, 2, true); // resolution
        view.setInt32(8, 10000, true); // lat 10.0
        view.setInt32(12, 20000, true); // lon 20.0
        
        const decoded = WgtFormat.decode(buffer);
        expect(decoded.resolution).toBe(2);
        expect(decoded.lat).toBe(10);
        expect(decoded.lon).toBe(20);
        expect(decoded.format).toBe(1); // WGT1 is always Float32 in this implementation
    });

    it('should have proper data view offsets and byte lengths', () => {
        const resolution = 2;
        const data = new Int16Array([1, 2, 3, 4]);
        const encoded = WgtFormat.encode(resolution, 0, 0, data);
        
        // Offset 32 is where data starts
        const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
        expect(view.getInt16(32, true)).toBe(1);
        expect(view.getInt16(34, true)).toBe(2);
        expect(view.getInt16(36, true)).toBe(3);
        expect(view.getInt16(38, true)).toBe(4);
    });

    it('should be resilient against null/undefined input buffers', () => {
        // @ts-ignore
        expect(() => WgtFormat.decode(null)).toThrow();
        // @ts-ignore
        expect(() => WgtFormat.decode(undefined)).toThrow();
    });
});
