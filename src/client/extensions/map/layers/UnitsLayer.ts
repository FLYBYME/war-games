import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';
import { SymbologyService, Domain } from '../SymbologyService';
import { latLonToWorld } from '../CoordUtils';

/**
 * UnitsLayer: Renders all active entities on the tactical map.
 */
export class UnitsLayer implements MapLayer {
    readonly id = 'units';
    readonly container = new Container();
    private unitContainers = new Map<string, Container>();

    update(state: MapViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        const activeIds = new Set<string>();

        state.units.forEach(unit => {
            activeIds.add(unit.id);
            let c = this.unitContainers.get(unit.id);
            
            if (!c) {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';
                this.container.addChild(c);
                this.unitContainers.set(unit.id, c);
            }

            c.removeChildren();
            
            // Invert Y because engine is +Y up, Pixi is +Y down
            c.position.set(unit.pos.x, -unit.pos.y);

            // 3. Render Unit Icon
            const baseSize = 8;
            const size = baseSize / viewScale;

            const iconContainer = new Container();
            iconContainer.rotation = (unit.heading || 0) * (Math.PI / 180);
            
            const iconG = new Graphics();
            
            // Determine Domain from unit properties
            let domain: Domain = 'Surface';
            if (unit.pos.z > 20) domain = 'Air';
            else if (unit.pos.z < -5) domain = 'Subsurface';

            SymbologyService.drawSymbol(iconG, {
                affiliation: unit.side === 'Blue' ? 'Friendly' : 'Hostile',
                domain,
                size,
                viewScale,
                isSelected: false // TODO: Hook up selection from MapState
            });

            // Heading stem (Velocity Vector)
            const speed = unit.speedKts || 0;
            const stemLength = Math.max(size * 1.5, Math.min(size * 5, (speed / 100) * (baseSize * 10 / viewScale)));
            iconG.moveTo(0, -size);
            iconG.lineTo(0, -stemLength);
            iconG.stroke({ width: 2 / viewScale, color: 0xffffff, alpha: 0.9 });

            iconContainer.addChild(iconG);
            c.addChild(iconContainer);
        });

        // Cleanup removed units
        for (const [id, container] of this.unitContainers.entries()) {
            if (!activeIds.has(id)) {
                this.container.removeChild(container);
                this.unitContainers.delete(id);
            }
        }
    }

    destroy() {
        this.unitContainers.forEach(c => c.destroy({ children: true }));
        this.unitContainers.clear();
        this.container.removeChildren();
    }
}
