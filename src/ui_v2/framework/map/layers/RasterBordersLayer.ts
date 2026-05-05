import { Container, Sprite, Assets, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState, UIStore } from '../../UIStore';
import { latLonToWorld } from '../CoordUtils';
import { MapRegion } from '../../../shared/types.js';

export class RasterBordersLayer implements MapLayer {
    readonly id = 'bordersRaster';
    readonly container = new Container();
    private regions = new Map<string, { sprite: Sprite, metadata: MapRegion }>();

    async init() {
        try {
            const manifest = await UIStore.client.terrain.fetchManifest();
            const regions = manifest?.regions || [];

            for (const region of regions) {
                await this.loadRegion(region);
            }
        } catch (error) {
            console.warn('RasterBordersLayer: Failed to load manifest (expected if using WGT)', error);
        }
    }

    update(state: ViewState, _viewScale: number, _visibleWorldBounds?: Rectangle) {
        const origin = state.origin as { lat: number, lon: number };
        this.regions.forEach(({ sprite, metadata }) => {
            const nw = latLonToWorld(metadata.bounds.maxLat, metadata.bounds.minLon, origin);
            const se = latLonToWorld(metadata.bounds.minLat, metadata.bounds.maxLon, origin);
            
            sprite.position.set(nw.x, nw.y);
            sprite.width = se.x - nw.x;
            sprite.height = se.y - nw.y;
        });
    }

    private async loadRegion(region: MapRegion) {
        try {
            const texture = await Assets.load(`/maps/${region.id}/render-borders.png`);
            const sprite = new Sprite(texture);
            
            sprite.alpha = 0.6;

            this.container.addChild(sprite);
            this.regions.set(region.id, { sprite, metadata: region });
        } catch (e) {
            // No border raster for this region
        }
    }

    destroy() {
        this.regions.forEach(({ sprite }) => {
            sprite.destroy({ children: true, texture: true });
        });
        this.regions.clear();
        this.container.removeChildren();
    }
}
