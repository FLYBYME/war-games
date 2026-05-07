import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { MapLayer } from './MapLayer';
import { ViewState, UIStore } from '../framework/UIStore';

const SCALE = 0.01;

/** Grid lines layer */
export class GridLayer implements MapLayer {
    readonly id = 'grid';
    readonly container = new Container();

    update(_state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        const step = 100000 * SCALE;
        const count = 20;
        for (let i = -count; i <= count; i++) {
            const p = i * step;
            g.moveTo(p, -count * step); g.lineTo(p, count * step);
            g.moveTo(-count * step, p); g.lineTo(count * step, p);
        }
        g.stroke({ width: 0.5 / viewScale, color: 0x1e293b, alpha: 0.4 });
        this.container.addChild(g);
    }
}

/** Friendly unit symbols layer */
export class UnitsLayer implements MapLayer {
    readonly id = 'units';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        const items = state.units;
        while (this.container.children.length > items.length) {
            this.container.removeChildAt(this.container.children.length - 1);
        }
        for (let i = 0; i < items.length; i++) {
            let c: Container;
            if (i < this.container.children.length) {
                c = this.container.children[i] as Container;
                c.removeChildren();
            } else {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';
                c.on('pointerdown', (e) => { e.stopPropagation(); UIStore.selectedEntityId.set(items[i].id); });
                this.container.addChild(c);
            }
            const u = items[i];
            c.position.set(u.pos.x * SCALE, -u.pos.y * SCALE);
            c.rotation = u.rot * (Math.PI / 180); // Convert degrees to radians
            const s = 6 / viewScale;
            const selected = u.id === UIStore.selectedEntityId.get();

            const g = new Graphics();
            g.arc(0, 0, s, Math.PI, 0); g.lineTo(-s, 0); g.closePath();
            g.fill({ color: 0x00d4ff, alpha: selected ? 0.4 : 0.15 });
            g.stroke({ width: 1.5 / viewScale, color: 0x00d4ff });
            c.addChild(g);

            if (selected) {
                const ring = new Graphics();
                ring.circle(0, 0, s * 2);
                ring.stroke({ width: 1 / viewScale, color: 0x3b82f6, alpha: 0.5 });
                c.addChild(ring);
            }
        }
    }
}

/** Sensor track symbols layer */
export class TracksLayer implements MapLayer {
    readonly id = 'tracks';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        const items = state.tracks;
        while (this.container.children.length > items.length) {
            this.container.removeChildAt(this.container.children.length - 1);
        }
        for (let i = 0; i < items.length; i++) {
            let c: Container;
            if (i < this.container.children.length) {
                c = this.container.children[i] as Container;
                c.removeChildren();
            } else {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';
                c.on('pointerdown', (e) => { e.stopPropagation(); UIStore.selectedEntityId.set(items[i].id); });
                this.container.addChild(c);
            }
            const t = items[i];
            c.position.set(t.pos.x * SCALE, -t.pos.y * SCALE);
            const s = 6 / viewScale;
            const color = this.getTrackColor(t.identification || 'Unknown');
            const selected = t.id === UIStore.selectedEntityId.get();

            const g = new Graphics();
            
            // Draw shape based on classification (Domain)
            const cls = (t.classification || 'Unknown').toLowerCase();
            if (cls === 'air') {
                // Triangle Up
                g.moveTo(0, -s); g.lineTo(s, s); g.lineTo(-s, s); g.closePath();
            } else if (cls === 'surface') {
                // Square
                g.rect(-s, -s, s * 2, s * 2);
            } else if (cls === 'subsurface') {
                // Triangle Down
                g.moveTo(0, s); g.lineTo(s, -s); g.lineTo(-s, -s); g.closePath();
            } else if (cls === 'weapon') {
                // Diamond (smaller)
                const ws = s * 0.8;
                g.moveTo(0, -ws); g.lineTo(ws, 0); g.lineTo(0, ws); g.lineTo(-ws, 0); g.closePath();
            } else {
                // Default Diamond
                g.moveTo(0, -s); g.lineTo(s, 0); g.lineTo(0, s); g.lineTo(-s, 0); g.closePath();
            }

            g.stroke({ width: 1.5 / viewScale, color });
            if (selected) g.fill({ color, alpha: 0.3 });
            c.addChild(g);
        }
    }

    private getTrackColor(idStatus: string): number {
        const id = (idStatus || 'Unknown').toLowerCase();
        switch (id) {
            case 'hostile': 
            case 'suspect':
                return 0xff2d55;
            case 'friendly': 
            case 'assumedfriendly':
                return 0x00d4ff;
            case 'neutral': 
                return 0x30d158;
            default: 
                return 0xffd60a; // Unknown / Pending
        }
    }
}

/** Entity labels layer */
export class LabelsLayer implements MapLayer {
    readonly id = 'labels';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        const all = [...state.units.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })),
                     ...state.tracks.map(t => ({ id: t.id, x: t.pos.x, y: t.pos.y }))];
        while (this.container.children.length > all.length) {
            this.container.removeChildAt(this.container.children.length - 1);
        }
        for (let i = 0; i < all.length; i++) {
            const item = all[i];
            let label: Text;
            if (i < this.container.children.length) {
                label = this.container.children[i] as Text;
                label.text = item.id;
            } else {
                label = new Text({
                    text: item.id,
                    style: new TextStyle({ fontSize: 10, fill: 0x94a3b8, fontFamily: 'Inter, sans-serif' }),
                });
                label.anchor.set(0, 1);
                this.container.addChild(label);
            }
            label.position.set(item.x * SCALE + 8 / viewScale, -item.y * SCALE - 2 / viewScale);
            label.scale.set(1 / viewScale);
        }
    }
}

/** Velocity vectors layer */
export class VelocityVectorsLayer implements MapLayer {
    readonly id = 'velocityVecs';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const t of state.tracks) {
            const vx = t.vel.x * SCALE * 30;
            const vy = -t.vel.y * SCALE * 30;
            if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
                const ox = t.pos.x * SCALE;
                const oy = -t.pos.y * SCALE;
                g.moveTo(ox, oy); g.lineTo(ox + vx, oy + vy);
            }
        }
        g.stroke({ width: 1 / viewScale, color: 0x64748b, alpha: 0.6 });
        this.container.addChild(g);
    }
}

/** Radar coverage rings layer */
export class RadarRingsLayer implements MapLayer {
    readonly id = 'radarRings';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const u of state.units) {
            const ox = u.pos.x * SCALE;
            const oy = -u.pos.y * SCALE;
            const sensors = u.sensors || [];
            const maxRange = sensors.length > 0 ? Math.max(...sensors.map(s => s.rangeM)) : 0;
            if (maxRange > 0) {
                g.circle(ox, oy, maxRange * SCALE);
            }
        }
        g.stroke({ width: 0.8 / viewScale, color: 0x00d4ff, alpha: 0.2 });
        this.container.addChild(g);
    }
}

/** Engagement tethers layer — lines from units to their tracked targets */
export class EngageTethersLayer implements MapLayer {
    readonly id = 'engageTethers';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        if (!state.weaponBindings || state.weaponBindings.length === 0) return;
        const g = new Graphics();
        for (const binding of state.weaponBindings) {
            const shooter = state.units.find(u => u.id === binding.shooterId);
            const target = state.tracks.find(t => t.id === binding.targetId) || state.units.find(u => u.id === binding.targetId);
            if (shooter && target) {
                g.moveTo(shooter.pos.x * SCALE, -shooter.pos.y * SCALE);
                g.lineTo(target.pos.x * SCALE, -target.pos.y * SCALE);
            }
        }
        g.stroke({ width: 1.0 / viewScale, color: 0xff8c00, alpha: 0.5 });
        this.container.addChild(g);
    }
}

/** WEZ (Weapon Engagement Zone) placeholder */
export class WEZLayer implements MapLayer {
    readonly id = 'wez';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const u of state.units) {
            const ox = u.pos.x * SCALE;
            const oy = -u.pos.y * SCALE;
            // wezRadius is not currently in the schema, using 0 as fallback
            const r = (u as unknown as { wezRadius?: number }).wezRadius || 0;
            if (r > 0) {
                g.circle(ox, oy, r * SCALE);
            }
        }
        g.fill({ color: 0xff2d55, alpha: 0.04 });
        g.stroke({ width: 0.6 / viewScale, color: 0xff2d55, alpha: 0.15 });
        this.container.addChild(g);
    }
}

/** Datalink network lines between friendly units */
export class DatalinkLayer implements MapLayer {
    readonly id = 'datalinkLines';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const graph = state.datalinkGraph;
        if (!graph || !graph.edges) return;
        const g = new Graphics();
        for (const edge of graph.edges) {
            const a = state.units.find(u => u.id === edge.a);
            const b = state.units.find(u => u.id === edge.b);
            if (a && b) {
                g.moveTo(a.pos.x * SCALE, -a.pos.y * SCALE);
                g.lineTo(b.pos.x * SCALE, -b.pos.y * SCALE);
            }
        }
        g.stroke({ width: 0.8 / viewScale, color: 0x06b6d4, alpha: 0.4 });
        this.container.addChild(g);
    }
}

// --- Stubs for V1 compatibility ---
export class BordersLayer implements MapLayer { readonly id = 'borders'; readonly container = new Container(); update() {} }
export class BathymetryLayer implements MapLayer { readonly id = 'bathymetry'; readonly container = new Container(); update() {} }
export class RegionalTerrainLayer implements MapLayer { readonly id = 'terrain'; readonly container = new Container(); update() {} async init() {} }
export class RasterBordersLayer implements MapLayer { readonly id = 'bordersRaster'; readonly container = new Container(); update() {} async init() {} }
export class CoverageLayer implements MapLayer { readonly id = 'coverage'; readonly container = new Container(); update() {} }
export class UnitLabelsLayer extends LabelsLayer {}
export class TacticalGraphicsLayer implements MapLayer { readonly id = 'tactical'; readonly container = new Container(); update() {} }
export class WeatherOverlayLayer implements MapLayer { readonly id = 'weather'; readonly container = new Container(); update() {} }

