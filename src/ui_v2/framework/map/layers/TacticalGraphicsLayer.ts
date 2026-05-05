import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';

export class TacticalGraphicsLayer implements MapLayer {
    readonly id = 'tactical';
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

        // 0. Diagnostic Origin (only visible if layer is on)
        this.graphics.moveTo(-1000 / viewScale, 0);
        this.graphics.lineTo(1000 / viewScale, 0);
        this.graphics.moveTo(0, -1000 / viewScale);
        this.graphics.lineTo(0, 1000 / viewScale);
        this.graphics.stroke({ width: 1 / viewScale, color: 0xff00ff, alpha: 0.3 });

        // 1. ESM Bearings
        if (state.esmBearings) {
            for (const b of state.esmBearings) {
                const u = state.units.find(unit => unit.id === b.observerId);
                if (u) {
                    const length = 200000; // 200km line
                    // Bearing 0 is North (+Y in engine, -Y in Pixi)
                    const rad = (b.bearingDeg - 90) * Math.PI / 180;
                    this.graphics.moveTo(u.pos.x, -u.pos.y);
                    this.graphics.lineTo(
                        u.pos.x + Math.cos(rad) * length,
                        -(u.pos.y + Math.sin(rad) * length)
                    );
                    this.graphics.stroke({ width: 2 / viewScale, color: 0xffcc00, alpha: 0.6 });
                }
            }
        }

        // 2. Weapon Bindings (Targets)
        if (state.weaponBindings) {
            for (const bind of state.weaponBindings) {
                const u = state.units.find(unit => unit.id === bind.shooterId);
                // Try to find target in tracks OR units
                const target = state.tracks.find(t => t.id === bind.targetId) || 
                             state.units.find(unit => unit.id === bind.targetId);
                
                if (u && target) {
                    this.graphics.moveTo(u.pos.x, -u.pos.y);
                    this.graphics.lineTo(target.pos.x, -target.pos.y);
                    this.graphics.stroke({ width: 3 / viewScale, color: 0xff3300, alpha: 0.8 });
                }
            }
        }
    }

    destroy() {
        this.graphics.destroy();
        this.container.removeChildren();
    }
}
