import fs from 'fs';
import path from 'path';

/**
 * ZeroCopyElevationService: Performs high-performance elevation sampling 
 * directly from disk without loading full tiles into memory.
 */
export class ZeroCopyElevationService {
    private fileHandles = new Map<string, number>();

    constructor(private rawDataDir: string = './data/terrain_raw') {
        if (!fs.existsSync(rawDataDir)) {
            fs.mkdirSync(rawDataDir, { recursive: true });
        }
    }

    /**
     * getElevationAt: Plucks a 2-byte sample directly from an SRTM .hgt file.
     * Uses fs.readSync for O(1) memory and O(1) disk access.
     */
    public getElevationAt(lat: number, lon: number): number | null {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        
        // SRTM files are named by their southwest corner (e.g., N19E108.hgt)
        const latPart = floorLat >= 0 ? `N${floorLat.toString().padStart(2, '0')}` : `S${Math.abs(floorLat).toString().padStart(2, '0')}`;
        const lonPart = floorLon >= 0 ? `E${floorLon.toString().padStart(3, '0')}` : `W${Math.abs(floorLon).toString().padStart(3, '0')}`;
        const fileName = `${latPart}${lonPart}.hgt`;
        const filePath = path.join(this.rawDataDir, fileName);

        if (!fs.existsSync(filePath)) return null;

        try {
            const fd = this.getFileDescriptor(filePath);
            
            // HGT is 1201x1201 big-endian 16-bit integers
            // Data starts from Northwest corner (row 0 is max lat)
            const row = Math.floor((1 - (lat - floorLat)) * 1200);
            const col = Math.floor((lon - floorLon) * 1200);
            const offset = (row * 1201 + col) * 2;

            const buffer = Buffer.alloc(2);
            fs.readSync(fd, buffer, 0, 2, offset);

            // SRTM is big-endian
            const elevation = buffer.readInt16BE(0);
            
            // -32768 is the "no data" value for SRTM
            return elevation === -32768 ? null : elevation;
        } catch (err) {
            console.error(`ZeroCopyElevationService: Error reading ${fileName}`, err);
            return null;
        }
    }

    private getFileDescriptor(path: string): number {
        const existing = this.fileHandles.get(path);
        if (existing !== undefined) {
            return existing;
        }
        
        const fd = fs.openSync(path, 'r');
        this.fileHandles.set(path, fd);
        
        // Limit open handles to prevent EMFILE
        if (this.fileHandles.size > 100) {
            const firstKey = this.fileHandles.keys().next().value;
            if (firstKey) {
                fs.closeSync(this.fileHandles.get(firstKey)!);
                this.fileHandles.delete(firstKey);
            }
        }
        
        return fd;
    }

    public closeAll() {
        for (const fd of this.fileHandles.values()) {
            fs.closeSync(fd);
        }
        this.fileHandles.clear();
    }
}
