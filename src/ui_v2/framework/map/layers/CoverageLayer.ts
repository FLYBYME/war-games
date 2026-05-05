import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';
import { latLonToWorld } from '../CoordUtils';

/**
 * CoverageLayer: Visualizes radar horizon and WEZ (Weapon Engagement Zones).
 */
export class CoverageLayer implements MapLayer {
    readonly id = 'coverage';
    readonly container = new Container();
    private _graphics: Graphics | null = null;

    private get graphics(): Graphics {
        if (!this._graphics || (this._graphics as any).destroyed) {
            this._graphics = new Graphics();
            this.container.addChild(this._graphics);
        }
        return this._graphics;
    }

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.graphics.clear();
        const origin = state.origin as { lat: number; lon: number };

        for (const unit of state.units) {
            if (!unit.coveragePolygons) continue;

            // 1. Radar Coverage (Cyan)
            if (unit.coveragePolygons.radar && unit.coveragePolygons.radar.length > 2) {
                const poly = unit.coveragePolygons.radar.map((p: any) => {
                    const world = latLonToWorld(p.lat, p.lon, origin);
                    return { x: world.x, y: world.y };
                });

                this.graphics.poly(poly);
                this.graphics.fill({ color: 0x00ffff, alpha: 0.05 });
                this.graphics.stroke({ width: 1 / viewScale, color: 0x00ffff, alpha: 0.3 });
            }

            // 2. Weapon Engagement Zone (Red)
            if (unit.coveragePolygons.wez && unit.coveragePolygons.wez.length > 2) {
                const poly = unit.coveragePolygons.wez.map((p: any) => {
                    const world = latLonToWorld(p.lat, p.lon, origin);
                    return { x: world.x, y: world.y };
                });

                this.graphics.poly(poly);
                this.graphics.fill({ color: 0xff3300, alpha: 0.08 });
                this.graphics.stroke({ width: 1.5 / viewScale, color: 0xff3300, alpha: 0.5 });
            }
        }
    }

    destroy() {
        if (this._graphics) {
            this._graphics.destroy();
            this._graphics = null;
        }
        this.container.removeChildren();
    }
}
