import { Container, Text, Rectangle, TextStyle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';

/**
 * UnitLabelsLayer: Renders tactical data blocks next to units.
 */
export class UnitLabelsLayer implements MapLayer {
    readonly id = 'labels';
    readonly container = new Container();
    private labelMap = new Map<string, Text>();
    
    private readonly textStyle = new TextStyle({
        fill: '#00d1ff',
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        stroke: { color: '#000000', width: 3, join: 'round' }
    });

    update(state: ViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        const activeIds = new Set<string>();

        for (const unit of state.units) {
            activeIds.add(unit.id);
            let label = this.labelMap.get(unit.id);

            if (!label) {
                label = new Text({ text: '', style: this.textStyle });
                this.container.addChild(label);
                this.labelMap.set(unit.id, label);
            }

            const altK = (unit.lla.alt / 1000).toFixed(1);
            const speedKts = unit.desiredSpeedKts || 0;
            
            label.text = `${unit.id.substring(0, 10)}\n${altK}k ft | ${speedKts}kts`;
            
            // Positioning: Offset to the top-right of the unit icon
            // Engine Y is up, Pixi Y is down
            label.position.set(unit.pos.x + (15 / viewScale), -unit.pos.y - (15 / viewScale));
            
            // Counter-scale the label so it stays readable
            label.scale.set(1 / viewScale);
            label.visible = true;
        }

        // Cleanup stale labels
        for (const [id, label] of this.labelMap.entries()) {
            if (!activeIds.has(id)) {
                label.destroy();
                this.labelMap.delete(id);
            }
        }
    }

    destroy() {
        for (const label of this.labelMap.values()) {
            label.destroy();
        }
        this.labelMap.clear();
        this.container.removeChildren();
    }
}
