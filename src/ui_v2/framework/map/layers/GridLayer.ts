import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';

export class GridLayer implements MapLayer {
    readonly id = 'grid';
    readonly container = new Container();
    private _graphics: Graphics | null = null;
    
    private get graphics(): Graphics {
        if (!this._graphics || this._graphics.destroyed) {
            this._graphics = new Graphics();
            this.container.addChild(this._graphics);
        }
        return this._graphics;
    }

    constructor() {}

    update(_state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.graphics.clear();
        
        const step = 100000; // 100km
        const count = 50;
        
        for (let i = -count; i <= count; i++) {
            const p = i * step;
            this.graphics.moveTo(p, -count * step);
            this.graphics.lineTo(p, count * step);
            this.graphics.moveTo(-count * step, p);
            this.graphics.lineTo(count * step, p);
        }

        this.graphics.stroke({ width: 1 / viewScale, color: 0x333333, alpha: 0.5 });
    }
}
