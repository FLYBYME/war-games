import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';
import { latLonToWorld } from '../CoordUtils';
import { GeoJSON } from '../../../shared/types.js';

export class BordersLayer implements MapLayer {
    readonly id = 'borders';
    readonly container = new Container();
    private _graphics: Graphics | null = null;
    
    private get graphics(): Graphics {
        if (!this._graphics || (this._graphics as any).destroyed) {
            this._graphics = new Graphics();
            this.container.addChild(this._graphics);
        }
        return this._graphics;
    }

    constructor() {}

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.graphics.clear();
        const borders = state.mapData?.borders as GeoJSON | undefined;
        if (!borders || !borders.features) return;

        const origin = state.origin as { lat: number, lon: number };

        for (const feature of borders.features) {
            if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates as [number, number][];
                if (coords.length < 2) continue;

                const first = latLonToWorld(coords[0][1], coords[0][0], origin);
                this.graphics.moveTo(first.x, first.y);

                for (let i = 1; i < coords.length; i++) {
                    const next = latLonToWorld(coords[i][1], coords[i][0], origin);
                    this.graphics.lineTo(next.x, next.y);
                }
            }
        }
        
        this.graphics.stroke({ width: 2 / viewScale, color: 0x64748b, alpha: 0.8 });
    }

    destroy() {
        if (this._graphics) {
            this._graphics.destroy();
            this._graphics = null;
        }
        this.container.removeChildren();
    }
}
