import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';
import { MapDataPipeline, WgtTile } from '../MapDataPipeline';
import { worldToLatLon } from '../CoordUtils';

/**
 * TerrainLayer: Renders elevation data from the MapDataPipeline.
 * Professional Upgrade: Uses QuadTree (z/x/y) tiles with dynamic LOD scaling.
 */
export class TerrainLayer implements MapLayer {
    readonly id = 'terrain';
    readonly container = new Container();
    private pipeline: MapDataPipeline;
    private tileContainers = new Map<string, Container>();
    private activeTiles = new Set<string>();

    constructor(pipeline: MapDataPipeline) {
        this.pipeline = pipeline;
    }

    public update(vs: MapViewState, viewScale: number, visibleBounds?: Rectangle): void {
        const origin = vs.origin;
        if (!origin || !visibleBounds) return;

        // 1. Determine optimal Zoom Level (z) based on viewScale (meters/pixel)
        // metersPerPixel: >5000 (z2), 1000-5000 (z4), 100-1000 (z7), <100 (z10)
        let z = 10;
        if (viewScale > 5000) z = 2;
        else if (viewScale > 1000) z = 4;
        else if (viewScale > 200) z = 7;

        // 2. Calculate geodetic bounds of the viewport
        const nw = worldToLatLon(visibleBounds.x, visibleBounds.y, origin);
        const se = worldToLatLon(visibleBounds.x + visibleBounds.width, visibleBounds.y + visibleBounds.height, origin);

        // 3. Convert Geodetic to Tile Coordinates (z/x/y)
        const tileNW = this.latLonToTile(nw.lat, nw.lon, z);
        const tileSE = this.latLonToTile(se.lat, se.lon, z);

        const xMin = Math.floor(Math.min(tileNW.x, tileSE.x));
        const xMax = Math.ceil(Math.max(tileNW.x, tileSE.x));
        const yMin = Math.floor(Math.min(tileNW.y, tileSE.y));
        const yMax = Math.ceil(Math.max(tileNW.y, tileSE.y));

        const newVisibleTiles = new Set<string>();
        const neededTiles: { z: number; x: number; y: number }[] = [];

        // 4. Request tiles for the viewport + Buffer (Overscan)
        const BUFFER = 1; // 1 tile extra in all directions
        for (let x = xMin - BUFFER; x <= xMax + BUFFER; x++) {
            for (let y = yMin - BUFFER; y <= yMax + BUFFER; y++) {
                const key = `${z}_${x}_${y}`;
                const isVisible = x >= xMin && x <= xMax && y >= yMin && y <= yMax;
                
                if (isVisible) {
                    newVisibleTiles.add(key);
                }

                neededTiles.push({ z, x, y });
            }
        }

        // Trigger smart batch fetch
        void this.pipeline.fetchViewport(neededTiles).then(() => {
            // After batch is ready, trigger individual renders for visible tiles
            for (const key of newVisibleTiles) {
                if (!this.tileContainers.has(key)) {
                    const [tz, tx, ty] = key.split('_').map(Number);
                    void this.loadTile(tz, tx, ty, origin);
                }
            }
        });

        // 5. Cleanup tiles no longer visible
        for (const key of this.activeTiles) {
            if (!newVisibleTiles.has(key)) {
                const container = this.tileContainers.get(key);
                if (container) {
                    this.container.removeChild(container);
                    container.destroy({ children: true });
                    this.tileContainers.delete(key);
                }
            }
        }

        this.activeTiles = newVisibleTiles;

        // 6. Update container positions (sync with rest of map)
        this.tileContainers.forEach((container, key) => {
            const [tz, tx, ty] = key.split('_').map(Number);
            const bounds = this.getTileBounds(tz, tx, ty);
            
            // Re-project based on current origin
            const cosLat = Math.cos(origin.lat * (Math.PI / 180));
            const METERS_PER_DEGREE = 111319.9;
            
            container.x = (bounds.minLon - origin.lon) * METERS_PER_DEGREE * cosLat;
            container.y = -(bounds.maxLat - origin.lat) * METERS_PER_DEGREE;
        });
    }

    private async loadTile(z: number, x: number, y: number, origin: { lat: number, lon: number }): Promise<void> {
        const key = `${z}_${x}_${y}`;
        const tile = await this.pipeline.getQuadTile(z, x, y);
        if (!tile || !this.activeTiles.has(key)) return;

        this.renderTile(key, tile, origin);
    }

    private renderTile(key: string, tile: WgtTile, origin: { lat: number, lon: number }): void {
        const res = tile.resolution;
        
        const canvas = document.createElement('canvas');
        canvas.width = res;
        canvas.height = res;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.createImageData(res, res);
        const data = imageData.data;

        for (let i = 0; i < tile.data.length; i++) {
            const h = tile.data[i];
            let val = Math.floor(((h + 100) / 9100) * 255);
            val = Math.max(0, Math.min(255, val));

            const idx = i * 4;
            data[idx] = val;     // R
            data[idx + 1] = val; // G
            data[idx + 2] = val; // B
            data[idx + 3] = 180; // A (slightly transparent)
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = Texture.from(canvas);
        const sprite = new Sprite(texture);
        
        // Calculate world-space dimensions of this tile
        const [tz, tx, ty] = key.split('_').map(Number);
        const bounds = this.getTileBounds(tz, tx, ty);
        const cosLat = Math.cos(origin.lat * (Math.PI / 180));
        const METERS_PER_DEGREE = 111319.9;

        sprite.width = (bounds.maxLon - bounds.minLon) * METERS_PER_DEGREE * cosLat;
        sprite.height = (bounds.maxLat - bounds.minLat) * METERS_PER_DEGREE;

        const tileContainer = new Container();
        tileContainer.addChild(sprite);
        
        this.container.addChild(tileContainer);
        this.tileContainers.set(key, tileContainer);
    }

    private latLonToTile(lat: number, lon: number, z: number) {
        const n = Math.pow(2, z);
        const x = ((lon + 180) / 360) * n;
        const latRad = (lat * Math.PI) / 180;
        const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
        return { x, y };
    }

    private getTileBounds(z: number, x: number, y: number) {
        const n = Math.pow(2, z);
        const lonMin = (x / n) * 360 - 180;
        const lonMax = ((x + 1) / n) * 360 - 180;
        const latMinRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
        const latMaxRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
        return { 
            minLat: (latMinRad * 180) / Math.PI, 
            maxLat: (latMaxRad * 180) / Math.PI, 
            minLon: lonMin, 
            maxLon: lonMax 
        };
    }

    public destroy(): void {
        this.tileContainers.forEach(c => c.destroy({ children: true }));
        this.tileContainers.clear();
        this.activeTiles.clear();
        this.container.removeChildren();
    }
}
