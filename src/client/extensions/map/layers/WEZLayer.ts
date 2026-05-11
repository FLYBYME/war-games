import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState, MapUnit } from '../MapState';

/**
 * WEZLayer — Weapon Engagement Zone overlay.
 *
 * Renders circular range rings around selected/all entities
 * to visualize weapon and sensor envelopes.
 */
export class WEZLayer implements MapLayer {
    readonly id = 'wez';
    readonly container = new Container();

    /** Whether to show WEZ for all entities or only selected */
    public showAllUnits = false;
    public selectedId: string | null = null;

    update(state: MapViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.container.removeChildren();

        const unitsToShow = this.showAllUnits
            ? state.units
            : state.units.filter(u => u.id === this.selectedId);

        for (const unit of unitsToShow) {
            if (unit.isDestroyed) continue;

            const sensorRange = this.getSensorRange(unit);
            const weaponRange = this.getWeaponRange(unit);

            // Sensor envelope (outer, dimmer)
            if (sensorRange > 0) {
                const sensorCircle = new Graphics();
                sensorCircle.circle(unit.pos.x, -unit.pos.y, sensorRange);
                sensorCircle.fill({ color: 0x2196f3, alpha: 0.03 });
                sensorCircle.stroke({ width: 1 / viewScale, color: 0x2196f3, alpha: 0.2 });
                this.container.addChild(sensorCircle);
            }

            // Weapon envelope (inner, brighter)
            if (weaponRange > 0) {
                const weaponCircle = new Graphics();
                weaponCircle.circle(unit.pos.x, -unit.pos.y, weaponRange);
                weaponCircle.fill({ color: 0xf44336, alpha: 0.04 });
                weaponCircle.stroke({ width: 1.5 / viewScale, color: 0xf44336, alpha: 0.35 });

                // Dashed ring effect (alternating segments)
                const segments = 36;
                for (let i = 0; i < segments; i += 2) {
                    const startAngle = (i / segments) * Math.PI * 2;
                    const endAngle = ((i + 1) / segments) * Math.PI * 2;
                    const dash = new Graphics();
                    dash.moveTo(
                        unit.pos.x + Math.cos(startAngle) * weaponRange,
                        -unit.pos.y + Math.sin(startAngle) * weaponRange
                    );
                    dash.lineTo(
                        unit.pos.x + Math.cos(endAngle) * weaponRange,
                        -unit.pos.y + Math.sin(endAngle) * weaponRange
                    );
                    dash.stroke({ width: 1 / viewScale, color: 0xff5252, alpha: 0.5 });
                    this.container.addChild(dash);
                }

                this.container.addChild(weaponCircle);
            }

            // Range label
            if (this.selectedId === unit.id && weaponRange > 0) {
                // Note: Text rendering would be handled via Canvas overlay or PIXI.Text
                // For now, the visual rings are the primary indicator
            }
        }
    }

    /**
     * Get estimated sensor range for a unit based on its category.
     * In production, this comes from the entity's sensor subsystem data.
     */
    private getSensorRange(unit: MapUnit): number {
        switch (unit.category) {
            case 'fighter': return 150000;   // 150km
            case 'awacs': return 400000;      // 400km
            case 'destroyer': return 200000;  // 200km
            case 'submarine': return 50000;   // 50km
            case 'sam-site': return 180000;    // 180km
            default: return 100000;           // 100km default
        }
    }

    /**
     * Get estimated weapon range for a unit based on its category.
     */
    private getWeaponRange(unit: MapUnit): number {
        switch (unit.category) {
            case 'fighter': return 80000;     // 80km (BVR missile)
            case 'destroyer': return 120000;  // 120km (SAM/SSM)
            case 'submarine': return 40000;   // 40km (torpedo)
            case 'sam-site': return 100000;    // 100km
            default: return 50000;
        }
    }

    destroy() {
        this.container.removeChildren();
    }
}
