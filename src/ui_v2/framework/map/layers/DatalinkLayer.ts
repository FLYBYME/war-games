import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';

export class DatalinkLayer implements MapLayer {
    readonly id = 'datalink';
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

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.graphics.clear();
        const graph = state.datalinkGraph;
        
        if (!graph || !graph.edges || graph.edges.length === 0) {
            return;
        }

        console.log(`[UI] DatalinkLayer: Rendering ${graph.edges.length} edges`);

        let drawnCount = 0;
        for (const edge of graph.edges) {
            const u1 = state.units.find(u => u.id === edge.a);
            const u2 = state.units.find(u => u.id === edge.b);
            
            if (u1 && u2) {
                this.graphics.moveTo(u1.pos.x, -u1.pos.y);
                this.graphics.lineTo(u2.pos.x, -u2.pos.y);
                drawnCount++;
            }
        }
        
        if (drawnCount > 0) {
            this.graphics.stroke({ width: 4 / viewScale, color: 0x00d1ff, alpha: 1.0 });
            console.log(`[UI] DatalinkLayer: Stroked ${drawnCount} lines`);
        }
    }

    destroy() {
        this.graphics.destroy();
        this.container.removeChildren();
    }
}
