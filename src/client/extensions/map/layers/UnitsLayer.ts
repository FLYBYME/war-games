import { Container, Graphics, Rectangle, FederatedPointerEvent } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState, MapUnit } from '../MapState';
import { SymbologyService, Domain } from '../SymbologyService';

/**
 * UnitsLayer: Renders all active entities on the tactical map.
 *
 * Now with:
 * - Click-to-select (dispatches custom events for IDE.selection)
 * - Hover highlighting
 * - Selected entity ring
 * - Force-colored NATO-style symbology
 */
export class UnitsLayer implements MapLayer {
    readonly id = 'units';
    readonly container = new Container();
    private unitContainers = new Map<string, Container>();

    /** External callback — set by MapExtension to wire selection */
    public onEntityClicked: ((entityId: string, event: FederatedPointerEvent) => void) | null = null;
    public onEntityHovered: ((entityId: string | null) => void) | null = null;

    /** Currently selected entity ID (set externally) */
    public selectedId: string | null = null;
    public hoveredId: string | null = null;

    update(state: MapViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        const activeIds = new Set<string>();

        state.units.forEach((unit: MapUnit) => {
            if (unit.isDestroyed) return;

            activeIds.add(unit.id);
            let c = this.unitContainers.get(unit.id);

            if (!c) {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';

                // Click-to-select
                c.on('pointerdown', (e: FederatedPointerEvent) => {
                    e.stopPropagation();
                    this.onEntityClicked?.(unit.id, e);
                });

                // Hover
                c.on('pointerenter', () => {
                    this.hoveredId = unit.id;
                    this.onEntityHovered?.(unit.id);
                });
                c.on('pointerleave', () => {
                    if (this.hoveredId === unit.id) {
                        this.hoveredId = null;
                        this.onEntityHovered?.(null);
                    }
                });

                this.container.addChild(c);
                this.unitContainers.set(unit.id, c);
            }

            c.removeChildren();

            // Position (invert Y: engine +Y up, Pixi +Y down)
            c.position.set(unit.pos.x, -unit.pos.y);

            // ── Render ───────────────────────────────────────────────────
            const baseSize = 8;
            const size = baseSize / viewScale;
            const isSelected = unit.id === this.selectedId;
            const isHovered = unit.id === this.hoveredId;

            // Selection ring
            if (isSelected) {
                const ring = new Graphics();
                ring.circle(0, 0, size * 1.8);
                ring.stroke({ width: 2 / viewScale, color: 0x00bcd4, alpha: 0.8 });
                c.addChild(ring);
            }

            // Hover glow
            if (isHovered && !isSelected) {
                const glow = new Graphics();
                glow.circle(0, 0, size * 1.5);
                glow.fill({ color: 0xffffff, alpha: 0.05 });
                c.addChild(glow);
            }

            // Icon container with rotation
            const iconContainer = new Container();
            iconContainer.rotation = (unit.heading || 0) * (Math.PI / 180);

            const iconG = new Graphics();

            // Determine domain
            let domain: Domain = 'Surface';
            if (unit.pos.z > 20) domain = 'Air';
            else if (unit.pos.z < -5) domain = 'Subsurface';

            SymbologyService.drawSymbol(iconG, {
                affiliation: unit.side === 'Blue' ? 'Friendly' : 'Hostile',
                domain,
                size,
                viewScale,
                isSelected,
            });

            // Heading stem (velocity vector)
            const speed = unit.speedKts || 0;
            const stemLength = Math.max(
                size * 1.5,
                Math.min(size * 5, (speed / 100) * (baseSize * 10 / viewScale))
            );
            iconG.moveTo(0, -size);
            iconG.lineTo(0, -stemLength);
            iconG.stroke({ width: 2 / viewScale, color: 0xffffff, alpha: 0.9 });

            iconContainer.addChild(iconG);
            c.addChild(iconContainer);

            // HP bar (below the icon)
            if (unit.hp < 100 && unit.hp > 0) {
                const barWidth = size * 2;
                const barHeight = 2 / viewScale;
                const hpFraction = Math.max(0, Math.min(1, unit.hp / 100));

                const hpBarBg = new Graphics();
                hpBarBg.rect(-barWidth / 2, size * 1.2, barWidth, barHeight);
                hpBarBg.fill({ color: 0x333333, alpha: 0.8 });
                c.addChild(hpBarBg);

                const hpBarFg = new Graphics();
                const hpColor = hpFraction > 0.5 ? 0x4caf50 : hpFraction > 0.25 ? 0xff9800 : 0xf44336;
                hpBarFg.rect(-barWidth / 2, size * 1.2, barWidth * hpFraction, barHeight);
                hpBarFg.fill({ color: hpColor, alpha: 0.9 });
                c.addChild(hpBarFg);
            }

            // Fuel warning indicator
            if (unit.fuelPct < 0.2) {
                const fuelWarn = new Graphics();
                fuelWarn.circle(size * 1.2, -size * 0.3, 2 / viewScale);
                fuelWarn.fill({ color: 0xff9800, alpha: 0.9 });
                c.addChild(fuelWarn);
            }
        });

        // Cleanup removed units
        for (const [id, container] of this.unitContainers.entries()) {
            if (!activeIds.has(id)) {
                this.container.removeChild(container);
                container.destroy({ children: true });
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
