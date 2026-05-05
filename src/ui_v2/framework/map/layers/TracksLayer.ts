import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState, UIStore } from '../../UIStore';

/**
 * TracksLayer: Renders sensor contacts and tracks.
 */
export class TracksLayer implements MapLayer {
    readonly id = 'tracks';
    readonly container = new Container();
    private trackContainers = new Map<string, Container>();

    private readonly labelStyle = new TextStyle({
        fill: '#ffffff',
        fontSize: 10,
        fontFamily: 'monospace',
        stroke: { color: '#000000', width: 2 }
    });

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        const activeIds = new Set<string>();

        state.tracks.forEach(track => {
            activeIds.add(track.id);
            let c = this.trackContainers.get(track.id);

            if (!c) {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';
                c.on('pointerdown', (e) => {
                    e.stopPropagation();
                    UIStore.selectedEntityId.set(track.id);
                });
                this.container.addChild(c);
                this.trackContainers.set(track.id, c);
            }

            c.removeChildren();
            
            // Position (Invert Y)
            c.position.set(track.pos.x, -track.pos.y);

            const isSelected = UIStore.selectedEntityId.get() === track.id;
            const color = this.getColor(track);
            const size = 9 / viewScale;

            const g = new Graphics();
            
            // 1. Symbol Shape based on classification
            if (track.classification === 'Weapon') {
                // Vampire/Weapon Icon (Chevron)
                const w = size * 0.7;
                const h = size * 1.1;
                g.moveTo(0, -h).lineTo(w, h).lineTo(0, h * 0.5).lineTo(-w, h).closePath();
            } else {
                switch (track.classification) {
                    case 'Hostile':
                        // Diamond (MIL-STD-2525D)
                        g.moveTo(0, -size * 1.2).lineTo(size * 1.2, 0).lineTo(0, size * 1.2).lineTo(-size * 1.2, 0).closePath();
                        break;
                    case 'Friendly':
                        // Square
                        g.rect(-size, -size, size * 2, size * 2);
                        break;
                    case 'Neutral':
                        // Circle
                        g.circle(0, 0, size);
                        break;
                    default:
                        // Clover-ish/Circle for unknown
                        g.circle(0, 0, size);
                        g.moveTo(-size, 0).lineTo(size, 0);
                        g.moveTo(0, -size).lineTo(0, size);
                }
            }

            g.fill({ color, alpha: isSelected ? 0.9 : 0.65 });
            g.stroke({ width: 1.5 / viewScale, color: 0xffffff, alpha: 0.8 });

            // 2. Heading Stem
            if (track.rot !== undefined) {
                const stemLen = size * 2.5;
                g.moveTo(0, 0).lineTo(
                    Math.sin(track.rot * Math.PI / 180) * stemLen,
                    -Math.cos(track.rot * Math.PI / 180) * stemLen
                );
                g.stroke({ width: 2 / viewScale, color: 0xffffff, alpha: 0.7 });
            }

            c.addChild(g);

            // 3. ID Label
            const label = new Text({ text: track.id.substring(0, 8), style: this.labelStyle });
            label.scale.set(1 / viewScale);
            label.position.set(size + (2 / viewScale), -size);
            c.addChild(label);

            // 4. Selection Ring
            if (isSelected) {
                const sel = new Graphics();
                sel.circle(0, 0, size * 1.5);
                sel.stroke({ width: 2 / viewScale, color: 0xffff00 });
                c.addChild(sel);
            }
        });

        // Cleanup
        for (const [id, container] of this.trackContainers.entries()) {
            if (!activeIds.has(id)) {
                this.container.removeChild(container);
                this.trackContainers.delete(id);
            }
        }
    }

    private getColor(track: any): number {
        const identity = (track as any).identification || track.classification;
        switch (identity) {
            case 'Hostile': return 0xff3b30;
            case 'Friendly': return 0x4cd964;
            case 'Neutral': return 0x007aff;
            case 'Unknown': return 0xffcc00;
            default: return 0xffcc00;
        }
    }

    destroy() {
        this.trackContainers.forEach(c => c.destroy({ children: true }));
        this.trackContainers.clear();
        this.container.removeChildren();
    }
}
