import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState, UIStore } from '../../UIStore';

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
            const g = new Graphics();
            
            // 1. Render WEZ (Weapon Engagement Zone) if enabled
            if (showWEZ && (unit as any).coveragePolygons?.wez) {
                const wez = (unit as any).coveragePolygons.wez;
                if (wez.length > 0) {
                    const wezG = new Graphics();
                    wezG.poly(wez.map((p: any) => ({ x: p.x - unit.pos.x, y: -p.y + unit.pos.y })));
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

            // Rotation (Engine is degrees, Pixi is radians)
            const iconContainer = new Container();
            iconContainer.rotation = (unit.rot) * (Math.PI / 180);
            
            const iconG = new Graphics();
            
            // Standard Friendly Symbol: Square (MIL-STD-2525D)
            const color = unit.side === 'Blue' ? 0x00d4ff : 0xff2d55;
            iconG.rect(-size, -size, size * 2, size * 2);
            iconG.fill({ color, alpha: isSelected ? 0.9 : 0.7 });
            iconG.stroke({ width: 1.5 / viewScale, color: 0xffffff, alpha: 0.8 });
            
            // Heading stem (Velocity Vector) - always points up in local icon space
            const speed = unit.desiredSpeedKts || 0;
            const stemLength = Math.max(size * 1.5, Math.min(size * 5, (speed / 100) * (baseSize * 10 / viewScale)));
            iconG.moveTo(0, -size);
            iconG.lineTo(0, -stemLength);
            iconG.stroke({ width: 2 / viewScale, color: 0xffffff, alpha: 0.9 });

            iconContainer.addChild(iconG);
            c.addChild(iconContainer);
            
            // 4. Selection Highlight
            if (isSelected) {
                const selG = new Graphics();
                selG.circle(0, 0, size * 1.5);
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

    destroy() {
        this.unitContainers.forEach(c => c.destroy({ children: true }));
        this.unitContainers.clear();
        this.container.removeChildren();
    }
}
