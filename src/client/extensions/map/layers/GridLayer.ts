import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';
import { latLonToWorld, worldToLatLon } from '../CoordUtils';

/**
 * GridLayer: Renders a geographic lat/lon grid on the map.
 */
export class GridLayer implements MapLayer {
    readonly id = 'grid';
    readonly container = new Container();
    private graphics = new Graphics();

    constructor() {
        this.container.addChild(this.graphics);
    }

    update(state: MapViewState, viewScale: number, visibleWorldBounds?: Rectangle) {
        if (!visibleWorldBounds || !state.origin) return;

        this.graphics.clear();
        const origin = state.origin;

        // Determine grid spacing based on zoom
        let spacing = 1.0; // 1 degree
        if (viewScale > 0.05) spacing = 0.1;
        if (viewScale > 0.5) spacing = 0.01;

        const nw = worldToLatLon(visibleWorldBounds.x, visibleWorldBounds.y, origin);
        const se = worldToLatLon(visibleWorldBounds.x + visibleWorldBounds.width, visibleWorldBounds.y + visibleWorldBounds.height, origin);

        const startLat = Math.floor(Math.min(nw.lat, se.lat) / spacing) * spacing;
        const endLat = Math.ceil(Math.max(nw.lat, se.lat) / spacing) * spacing;
        const startLon = Math.floor(Math.min(nw.lon, se.lon) / spacing) * spacing;
        const endLon = Math.ceil(Math.max(nw.lon, se.lon) / spacing) * spacing;

        const strokeWidth = 1 / viewScale;
        
        // Draw Lat lines
        for (let lat = startLat; lat <= endLat; lat += spacing) {
            const p1 = latLonToWorld(lat, startLon, origin);
            const p2 = latLonToWorld(lat, endLon, origin);
            this.graphics.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y);
        }

        // Draw Lon lines
        for (let lon = startLon; lon <= endLon; lon += spacing) {
            const p1 = latLonToWorld(startLat, lon, origin);
            const p2 = latLonToWorld(endLat, lon, origin);
            this.graphics.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y);
        }

        this.graphics.stroke({ width: strokeWidth, color: 0x444444, alpha: 0.5 });
    }
}
