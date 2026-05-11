import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';
import { MapDataPipeline, WgtTile } from '../MapDataPipeline';
import { worldToLatLon } from '../CoordUtils';

/**
 * TerrainLayer: Renders elevation data from the MapDataPipeline.
 * Uses a dynamic grid of tiles loaded at multiple LODs.
 */
export class TerrainLayer implements MapLayer {
    readonly id = 'terrain';
    readonly container = new Container();
    private pipeline: MapDataPipeline;
    private tileContainers = new Map<string, Container>();
    private tileSprites = new Map<string, Sprite>();
    private activeTiles = new Set<string>();

    constructor(pipeline: MapDataPipeline) {
        this.pipeline = pipeline;
    }

    public update(vs: MapViewState, viewScale: number, visibleBounds?: Rectangle): void {
        const origin = vs.origin;
        if (!origin || !visibleBounds) return;

        // 1. Calculate geodetic bounds of the viewport
        const nw = worldToLatLon(visibleBounds.x, visibleBounds.y, origin);
        const se = worldToLatLon(visibleBounds.x + visibleBounds.width, visibleBounds.y + visibleBounds.height, origin);

        const latMin = Math.floor(Math.min(nw.lat, se.lat)) - 1;
        const latMax = Math.ceil(Math.max(nw.lat, se.lat)) + 1;
        const lonMin = Math.floor(Math.min(nw.lon, se.lon)) - 1;
        const lonMax = Math.ceil(Math.max(nw.lon, se.lon)) + 1;

        // Limit range to prevent massive accidental fetches
        const latRange = Math.min(10, latMax - latMin);
        const lonRange = Math.min(10, lonMax - lonMin);

        const newVisibleTiles = new Set<string>();

        // 2. Request tiles from pipeline
        for (let i = 0; i <= latRange; i++) {
            for (let j = 0; j <= lonRange; j++) {
                const lat = latMin + i;
                const lon = lonMin + j;
                
                // Sanity check lat
                if (lat < -90 || lat > 90) continue;

                const key = `${lat},${lon}`;
                newVisibleTiles.add(key);

                if (!this.activeTiles.has(key)) {
                    void this.loadTile(lat, lon, vs);
                }
            }
        }

        // 3. Cleanup tiles no longer visible
        for (const key of this.activeTiles) {
            if (!newVisibleTiles.has(key)) {
                const tileContainer = this.tileContainers.get(key);
                if (tileContainer) {
                    this.container.removeChild(tileContainer);
                    tileContainer.destroy({ children: true });
                    this.tileContainers.delete(key);
                    this.tileSprites.delete(key);
                }
            }
        }

        this.activeTiles = newVisibleTiles;

        // 4. Update container positions
        this.tileContainers.forEach((tileContainer, key) => {
            const [lat, lon] = key.split(',').map(Number);
            
            // Re-project based on current origin
            const cosLat = Math.cos(origin.lat * (Math.PI / 180));
            const METERS_PER_DEGREE = 111319.9;
            
            tileContainer.x = (lon - origin.lon) * METERS_PER_DEGREE * cosLat;
            tileContainer.y = -(lat - origin.lat) * METERS_PER_DEGREE;
        });
    }

    private async loadTile(lat: number, lon: number, vs: MapViewState): Promise<void> {
        const key = `${lat},${lon}`;
        const tile = await this.pipeline.getTile(lat, lon, 256);
        if (!tile || !this.activeTiles.has(key)) return;

        this.renderTile(tile, vs);
    }

    private renderTile(tile: WgtTile, vs: MapViewState): void {
        const key = `${tile.lat},${tile.lon}`;
        const res = tile.resolution;
        
        // Create a canvas to generate a heightmap texture
        const canvas = document.createElement('canvas');
        canvas.width = res;
        canvas.height = res;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.createImageData(res, res);
        const data = imageData.data;

        for (let i = 0; i < tile.data.length; i++) {
            const h = tile.data[i];
            
            // Simple grayscale heightmap
            // Normalize -100m (ocean) to 9000m (everest) to 0-255
            let val = Math.floor(((h + 100) / 9100) * 255);
            val = Math.max(0, Math.min(255, val));

            const idx = i * 4;
            data[idx] = val;     // R
            data[idx + 1] = val; // G
            data[idx + 2] = val; // B
            data[idx + 3] = 255; // A
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = Texture.from(canvas);
        const sprite = new Sprite(texture);
        
        // Scale sprite to fit the 1-degree geographic block
        sprite.width = 100000;
        sprite.height = 100000;
        sprite.alpha = 0.6; // Subtle overlay

        const tileContainer = new Container();
        tileContainer.addChild(sprite);
        
        this.container.addChild(tileContainer);
        this.tileContainers.set(key, tileContainer);
        this.tileSprites.set(key, sprite);
    }

    public destroy(): void {
        this.tileContainers.forEach(c => c.destroy({ children: true }));
        this.tileContainers.clear();
        this.tileSprites.clear();
        this.activeTiles.clear();
        this.container.removeChildren();
    }
}
