import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';
import { latLonToWorld } from '../CoordUtils';
import { GeoJSON } from '../../../shared/types.js';

export class BathymetryLayer implements MapLayer {
    readonly id = 'bathymetry';
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
        const bathymetry = state.mapData?.bathymetry as GeoJSON | undefined;
        const origin = state.origin as { lat: number; lon: number };
        
        // --- Debug: Draw Origin Marker ---
        const markerSize = 50; // 50 meters
        this.graphics.moveTo(-markerSize, 0).lineTo(markerSize, 0);
        this.graphics.moveTo(0, -markerSize).lineTo(0, markerSize);
        this.graphics.stroke({ width: 2 / viewScale, color: 0x0ea5e9, alpha: 0.5 });

        if (!bathymetry || !bathymetry.features) return;

        for (const feature of bathymetry.features) {
            if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates as [number, number][];
                if (coords.length < 2) continue;

                const first = latLonToWorld(coords[0][1], coords[0][0], origin);
                this.graphics.moveTo(first.x, first.y);

                for (let i = 1; i < coords.length; i++) {
                    const next = latLonToWorld(coords[i][1], coords[i][0], origin);
                    this.graphics.lineTo(next.x, next.y);
                }
                
                // Use depth to determine color/alpha
                const depth = (feature.properties.depth as number) || 0;
                const alpha = Math.min(0.2 + (depth / 5000), 0.8);
                this.graphics.stroke({ width: 2 / viewScale, color: 0x0ea5e9, alpha });
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
