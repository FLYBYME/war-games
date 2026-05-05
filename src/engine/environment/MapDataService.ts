import * as fs from 'fs';
import * as path from 'path';
import { GeoJSON, GeoJSONSchema } from '../core/Types.js';
import { logger } from '../core/Logger.js';

/**
 * MapDataService: Loads and provides GeoJSON map data (Bathymetry, Borders, EEZ).
 */
export class MapDataService {
    private bathymetry: GeoJSON | null = null;
    private borders: GeoJSON | null = null;

    constructor(private dataDir: string = 'data') { }

    /**
     * loadAll: Synchronously loads map data files from the data directory.
     */
    public loadAll(): void {
        try {
            const bathyPath = path.join(this.dataDir, 'bathymetry.json');
            if (fs.existsSync(bathyPath)) {
                const data = JSON.parse(fs.readFileSync(bathyPath, 'utf8'));
                this.bathymetry = GeoJSONSchema.parse(data);
                logger.info(`Loaded Bathymetry data: ${this.bathymetry.features.length} features`);
            }

            const bordersPath = path.join(this.dataDir, 'borders.json');
            if (fs.existsSync(bordersPath)) {
                const data = JSON.parse(fs.readFileSync(bordersPath, 'utf8'));
                this.borders = GeoJSONSchema.parse(data);
                logger.info(`Loaded Borders data: ${this.borders.features.length} features`);
            }
        } catch (err) {
            logger.error('Failed to load map data:', err);
        }
    }

    public getBathymetry(): GeoJSON | null {
        return this.bathymetry;
    }

    public getBorders(): GeoJSON | null {
        return this.borders;
    }
}
