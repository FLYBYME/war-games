import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';
import { latLonToWorld, worldToLatLon } from '../CoordUtils';
import { mapDataPipeline, WgtTile } from '../MapDataPipeline';
import { logger } from '../../Logger';

interface ActiveTile {
    sprite: Sprite;
    lat: number;
    lon: number;
}

/**
 * RegionalTerrainLayer: Renders on-demand terrain tiles.
 * Refactored to perform CPU-side colorization to ensure sub-pixel tile alignment 
 * and avoid PixiJS Filter snapping artifacts during zooming.
 */
export class RegionalTerrainLayer implements MapLayer {
    readonly id = 'terrain';
    readonly container = new Container();
    private activeTiles = new Map<string, ActiveTile>();
    private loadingTiles = new Set<string>();

    async init() {
        // We work on-demand
    }

    update(state: ViewState, viewScale: number, visibleWorldBounds?: Rectangle) {
        if (!visibleWorldBounds || !state.origin) return;

        const origin = state.origin as { lat: number, lon: number };
        
        // 1. Calculate Geographic Bounding Box
        const nw = worldToLatLon(visibleWorldBounds.x, visibleWorldBounds.y, origin);
        const se = worldToLatLon(visibleWorldBounds.x + visibleWorldBounds.width, visibleWorldBounds.y + visibleWorldBounds.height, origin);

        // Padding to ensure we have tiles for panned areas
        const minLat = Math.floor(Math.min(nw.lat, se.lat)) - 1;
        const maxLat = Math.ceil(Math.max(nw.lat, se.lat)) + 1;
        const minLon = Math.floor(Math.min(nw.lon, se.lon)) - 1;
        const maxLon = Math.ceil(Math.max(nw.lon, se.lon)) + 1;

        const neededTiles = new Set<string>();

        // 2. Identify and Load Tiles
        for (let lat = minLat; lat < maxLat; lat++) {
            for (let lon = minLon; lon < maxLon; lon++) {
                const key = `${lat},${lon}`;
                neededTiles.add(key);

                if (!this.activeTiles.has(key) && !this.loadingTiles.has(key)) {
                    this.loadTile(lat, lon, origin);
                }
            }
        }

        // 3. Update Positions and Culling
        for (const [key, tile] of this.activeTiles.entries()) {
            if (!neededTiles.has(key)) {
                // Out of view: Destroy
                tile.sprite.destroy({ children: true, texture: true });
                this.activeTiles.delete(key);
                continue;
            }

            // Update position (NW corner of the 1x1 degree tile)
            // Using tile.lat + 1 because our world Y is inverted (-lat)
            const pos = latLonToWorld(tile.lat + 1, tile.lon, origin);
            tile.sprite.position.set(pos.x, pos.y);

            // Update size (1 degree)
            const sePos = latLonToWorld(tile.lat, tile.lon + 1, origin);
            tile.sprite.width = sePos.x - pos.x;
            tile.sprite.height = sePos.y - pos.y;
        }
    }

    private async loadTile(lat: number, lon: number, origin: { lat: number, lon: number }) {
        const key = `${lat},${lon}`;
        this.loadingTiles.add(key);

        try {
            const wgt = await mapDataPipeline.getTile(lat, lon);
            if (!wgt) throw new Error('No data');

            const texture = this.createColorizedTexture(wgt);
            const sprite = new Sprite(texture);
            
            const pos = latLonToWorld(lat + 1, lon, origin);
            sprite.position.set(pos.x, pos.y);

            this.container.addChild(sprite);
            this.activeTiles.set(key, { sprite, lat, lon });

            logger.debug(`RegionalTerrainLayer: Tile loaded and colorized ${key}`);
        } catch (err) {
            // Silently fail for missing tiles (expected for edges of world)
        } finally {
            this.loadingTiles.delete(key);
        }
    }

    /**
     * Performs CPU-side colorization of raw elevation data.
     * This eliminates the need for a PixiJS Filter, which causes tile alignment issues.
     */
    private createColorizedTexture(wgt: WgtTile): Texture {
        const res = wgt.resolution;
        const buffer = new Uint8ClampedArray(res * res * 4);
        
        for (let i = 0; i < wgt.data.length; i++) {
            const elevation = wgt.data[i];
            const idx = i * 4;

            if (elevation < 0) {
                // Bathymetry (Ocean)
                const depth = -elevation;
                const factor = Math.min(1, depth / 5000);
                // Mix vec3(0.0, 0.1, 0.3) to vec3(0.0, 0.5, 0.7)
                buffer[idx] = 0;
                buffer[idx + 1] = Math.floor((0.1 + factor * 0.4) * 255);
                buffer[idx + 2] = Math.floor((0.3 + factor * 0.4) * 255);
            } else {
                // Topography (Land)
                if (elevation < 1000) {
                    const f = elevation / 1000;
                    // Mix vec3(0.1, 0.4, 0.1) to vec3(0.6, 0.7, 0.2)
                    buffer[idx] = Math.floor((0.1 + f * 0.5) * 255);
                    buffer[idx + 1] = Math.floor((0.4 + f * 0.3) * 255);
                    buffer[idx + 2] = Math.floor((0.1 + f * 0.1) * 255);
                } else if (elevation < 3000) {
                    const f = (elevation - 1000) / 2000;
                    // Mix vec3(0.6, 0.7, 0.2) to vec3(0.5, 0.3, 0.1)
                    buffer[idx] = Math.floor((0.6 - f * 0.1) * 255);
                    buffer[idx + 1] = Math.floor((0.7 - f * 0.4) * 255);
                    buffer[idx + 2] = Math.floor((0.2 - f * 0.1) * 255);
                } else {
                    const f = Math.min(1, (elevation - 3000) / 3000);
                    // Mix vec3(0.5, 0.3, 0.1) to vec3(0.9, 0.9, 0.9)
                    buffer[idx] = Math.floor((0.5 + f * 0.4) * 255);
                    buffer[idx + 1] = Math.floor((0.3 + f * 0.6) * 255);
                    buffer[idx + 2] = Math.floor((0.1 + f * 0.8) * 255);
                }
            }
            buffer[idx + 3] = 255; // Alpha
        }

        return Texture.from({
            resource: buffer,
            width: res,
            height: res,
        });
    }

    destroy() {
        this.activeTiles.forEach(tile => tile.sprite.destroy({ children: true, texture: true }));
        this.activeTiles.clear();
        this.loadingTiles.clear();
        this.container.removeChildren();
    }
}
