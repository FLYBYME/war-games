import * as fs from 'fs/promises';
import { existsSync } from 'fs';
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
     * loadAll: Asynchronously loads map data files from the data directory.
     */
    public async loadAll(): Promise<void> {
        try {
            const bathyPath = path.join(this.dataDir, 'bathymetry.json');
            if (existsSync(bathyPath)) {
                const content = await fs.readFile(bathyPath, 'utf8');
                const data = JSON.parse(content);
                this.bathymetry = GeoJSONSchema.parse(data);
                logger.info(`Loaded Bathymetry data: ${this.bathymetry.features.length} features`);
            }

            const bordersPath = path.join(this.dataDir, 'borders.json');
            if (existsSync(bordersPath)) {
                const content = await fs.readFile(bordersPath, 'utf8');
                const data = JSON.parse(content);
                this.borders = GeoJSONSchema.parse(data);
                logger.info(`Loaded Borders data: ${this.borders.features.length} features`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('Failed to load map data:', { error: message });
        }
    }

    public getBathymetry(): GeoJSON | null {
        return this.bathymetry;
    }

    public getBorders(): GeoJSON | null {
        return this.borders;
    }
}
