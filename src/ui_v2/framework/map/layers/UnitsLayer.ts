import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState, UIStore, ViewUnit } from '../../UIStore';
import { SymbologyService, Domain } from '../SymbologyService';
import { latLonToWorld } from '../CoordUtils';

export class UnitsLayer implements MapLayer {
    readonly id = 'units';
    readonly container = new Container();
    private unitContainers = new Map<string, Container>();

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        const activeIds = new Set<string>();
        const showLOS = UIStore.getLayerSignal('losShading').get();
        const showWEZ = UIStore.getLayerSignal('wez').get();

        state.units.forEach(unit => {
            activeIds.add(unit.id);
            let c = this.unitContainers.get(unit.id);
            
            if (!c) {
                c = new Container();
                c.eventMode = 'static';
                c.cursor = 'pointer';
                c.on('pointerdown', (e) => {
                    e.stopPropagation();
                    UIStore.selectedEntityId.set(unit.id);
                });
                this.container.addChild(c);
                this.unitContainers.set(unit.id, c);
            }

            c.removeChildren();
            
            // Invert Y because engine is +Y up, Pixi is +Y down
            c.position.set(unit.pos.x, -unit.pos.y);

            const isSelected = UIStore.selectedEntityId.get() === unit.id;
            
            // 1. Render WEZ (Weapon Engagement Zone) if enabled
            if (showWEZ && unit.coveragePolygons?.wez) {
                const wez = unit.coveragePolygons.wez;
                if (wez.length > 0) {
                    const origin = state.origin as { lat: number; lon: number };
                    const wezG = new Graphics();
                    wezG.poly(wez.map((p) => {
                        const world = latLonToWorld(p.lat, p.lon, origin);
                        return { x: world.x - unit.pos.x, y: -world.y + unit.pos.y };
                    }));
                    wezG.fill({ color: 0xff0000, alpha: 0.1 });
                    wezG.stroke({ width: 1 / viewScale, color: 0xff0000, alpha: 0.3 });
                    c.addChild(wezG);
                }
            }

            // 2. Render LOS Polygon if enabled
            if (showLOS && unit.losPolygon) {
                const losG = new Graphics();
                losG.poly(unit.losPolygon.map(p => ({ x: p.x - unit.pos.x, y: -p.y + unit.pos.y })));
                losG.fill({ color: 0x00ff00, alpha: 0.1 });
                losG.stroke({ width: 1 / viewScale, color: 0x00ff00, alpha: 0.2 });
                c.addChild(losG);
            }

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

            // Heuristic for type from profileId
            let type: string | undefined = undefined;
            if (unit.profileId) {
                if (unit.profileId.includes('F-') || unit.profileId.includes('Su-')) type = 'Fighter';
                else if (unit.profileId.includes('DDG') || unit.profileId.includes('Type 052')) type = 'Destroyer';
                else if (unit.profileId.includes('CVN') || unit.profileId.includes('Carrier')) type = 'Carrier';
                else if (unit.profileId.includes('KC-') || unit.profileId.includes('Tanker')) type = 'Tanker';
            }

            SymbologyService.drawSymbol(iconG, {
                affiliation: 'Friendly', // Units layer is for friendlies
                domain,
                type,
                size,
                viewScale,
                isSelected
            });

            // Overdraw a damage indicator if health is low
            if (unit.hp < 100) {
                const dmgG = new Graphics();
                const dmgSize = size * 0.8;
                dmgG.moveTo(-dmgSize, -dmgSize).lineTo(dmgSize, dmgSize);
                dmgG.moveTo(dmgSize, -dmgSize).lineTo(-dmgSize, dmgSize);
                dmgG.stroke({ width: 2 / viewScale, color: 0xff0000, alpha: (100 - unit.hp) / 100 });
                iconG.addChild(dmgG);
            }
            
            // Heading stem (Velocity Vector)
            const speed = unit.speedKts || 0;
            const stemLength = Math.max(size * 1.5, Math.min(size * 5, (speed / 100) * (baseSize * 10 / viewScale)));
            iconG.moveTo(0, -size);
            iconG.lineTo(0, -stemLength);
            iconG.stroke({ width: 2 / viewScale, color: 0xffffff, alpha: 0.9 });

            iconContainer.addChild(iconG);
            c.addChild(iconContainer);
            
            // 4. Selection Highlight
            if (isSelected) {
                const selG = new Graphics();
                selG.circle(0, 0, size * 1.8);
                selG.stroke({ width: 2 / viewScale, color: 0xffff00, alpha: 0.8 });
                c.addChild(selG);
            }
        });

        // Cleanup removed units
        for (const [id, container] of this.unitContainers.entries()) {
            if (!activeIds.has(id)) {
                this.container.removeChild(container);
                this.unitContainers.delete(id);
            }
        }
    }

    private tooltipEl: HTMLElement | null = null;

    private showTooltip(unit: ViewUnit, x: number, y: number) {
        if (!this.tooltipEl) {
            this.tooltipEl = document.createElement('div');
            this.tooltipEl.className = 'map-tooltip';
            document.body.appendChild(this.tooltipEl);
        }
        
        this.tooltipEl.innerHTML = `
            <div style="color: var(--color-friendly); font-weight: bold; border-bottom: 1px solid var(--border-color); margin-bottom: 4px; padding-bottom: 2px;">${unit.profileId || unit.id}</div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <span>ALT:</span> <span style="color: var(--text-main);">${Math.round(unit.pos.z)}m</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <span>SPD:</span> <span style="color: var(--text-main);">${Math.round(unit.speedKts || 0)}kts</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
                <span>HP:</span> <span style="color: ${unit.hp > 50 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${Math.round(unit.hp)}%</span>
            </div>
        `;
        
        this.tooltipEl.style.display = 'block';
        this.tooltipEl.style.left = `${x + 15}px`;
        this.tooltipEl.style.top = `${y + 15}px`;
    }

    private hideTooltip() {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none';
    }

    destroy() {
        if (this.tooltipEl) {
            document.body.removeChild(this.tooltipEl);
            this.tooltipEl = null;
        }
        this.unitContainers.forEach(c => c.destroy({ children: true }));
        this.unitContainers.clear();
        this.container.removeChildren();
    }
}

