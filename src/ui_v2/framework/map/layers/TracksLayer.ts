import { Container, Graphics, Rectangle, Text, TextStyle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState, UIStore } from '../../UIStore';
import { SymbologyService, Affiliation, Domain } from '../SymbologyService';

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
            const size = 9 / viewScale;

            const g = new Graphics();
            
            // Map classification to MIL-STD categories
            let affiliation: Affiliation = 'Unknown';
            if (track.classification === 'Hostile') affiliation = 'Hostile';
            else if (track.classification === 'Friendly') affiliation = 'Friendly';
            else if (track.classification === 'Neutral') affiliation = 'Neutral';

            let domain: Domain = 'Surface';
            if (track.classification === 'Weapon') domain = 'Weapon';
            else if (track.pos.z > 20) domain = 'Air';
            else if (track.pos.z < -5) domain = 'Subsurface';

            SymbologyService.drawSymbol(g, {
                affiliation,
                domain,
                size,
                viewScale,
                isSelected
            });

            // 2. Heading Stem
            if (track.heading !== undefined) {
                const stemLen = size * 2.5;
                // Pixi headingation 0 is North (+Y), but Pixi screen Y is down, so we need to be careful.
                // In UnitsLayer we use headingation = deg * rad.
                // Here we draw directly in Graphics.
                const rad = (track.heading - 90) * Math.PI / 180;
                g.moveTo(0, 0).lineTo(
                    Math.cos(rad) * stemLen,
                    Math.sin(rad) * stemLen
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
                sel.circle(0, 0, size * 1.8);
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

    destroy() {
        this.trackContainers.forEach(c => c.destroy({ children: true }));
        this.trackContainers.clear();
        this.container.removeChildren();
    }
}

