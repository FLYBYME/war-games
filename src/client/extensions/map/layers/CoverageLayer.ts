import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';
import { Graphics, Container } from 'pixi.js';
import { latLonToWorld } from '../CoordUtils';

export class CoverageLayer implements MapLayer {
    public id = 'coverage';
    public container = new Container();
    private graphics = new Graphics();
    private data: { lat: number, lon: number, status: string }[] | null = null;
    private lastFetch = 0;

    constructor(private apiBase: string) {
        this.container.addChild(this.graphics);
        this.container.alpha = 0.4;
    }

    public async update(vs: MapViewState) {
        // Poll coverage data every 10 seconds if visible
        if (Date.now() - this.lastFetch > 10000) {
            await this.fetchData();
        }

        this.render(vs);
    }

    private async fetchData() {
        try {
            // strip /terrain from apiBase to get root for harvester
            const root = this.apiBase.replace('/terrain', '');
            const resp = await fetch(`${root}/harvester/coverage`);
            if (resp.ok) {
                this.data = await resp.json();
                this.lastFetch = Date.now();
            }
        } catch (e) {
            console.error('CoverageLayer: Failed to fetch coverage', e);
        }
    }

    private render(vs: MapViewState) {
        this.graphics.clear();
        if (!this.data || !vs.origin) return;

        for (const tile of this.data) {
            let color = 0xff0000; // Default Red (Error?)
            
            switch (tile.status) {
                case 'COMPLETED': color = 0x00ff00; break;
                case 'DOWNLOADING': color = 0xffff00; break;
                case 'OCEAN': color = 0x00ffff; break;
                case 'ERROR': color = 0xff0000; break;
            }

            // Draw 1x1 degree square
            // We draw from NW corner (lat, lon) to (lat-1, lon+1)
            const nw = latLonToWorld(tile.lat, tile.lon, vs.origin);
            const se = latLonToWorld(tile.lat - 1, tile.lon + 1, vs.origin);

            const width = se.x - nw.x;
            const height = se.y - nw.y;

            this.graphics.rect(nw.x, nw.y, width, height).fill({ color });
        }
    }
}
