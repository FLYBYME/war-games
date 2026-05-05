import { Component } from '../framework/Component';
import { SplitPane } from '../components/layout/SplitPane';
import { ForceOOB } from '../components/ForceOOB';
import { TacticalMap } from '../components/TacticalMap';
import { UnitInspector } from '../components/UnitInspector';
import { EventTicker } from '../components/layout/EventTicker';

/**
 * TacticalView: The primary gameplay view.
 * Orchestrates the OOB, Map, and Inspector using resizable split panes.
 */
export class TacticalView extends Component {
    constructor() {
        super('div', 'tactical-view', 'tactical-view');
    }

    protected styles(): string {
        return `
            .tactical-view {
                width: 100%;
                height: 100%;
                display: flex;
                position: relative;
                overflow: hidden;
            }
        `;
    }

    protected render(): void {
        const oob = new ForceOOB();
        const map = new TacticalMap();
        const inspector = new UnitInspector();
        const ticker = new EventTicker();

        // Inner Split: [ Map | Inspector ]
        const innerSplit = new SplitPane(map, inspector, 'horizontal', 0.75);
        
        // Outer Split: [ OOB | [ Map | Inspector ] ]
        const outerSplit = new SplitPane(oob, innerSplit, 'horizontal', 0.2);

        this.addChild(outerSplit);
        this.addChild(ticker);
    }
}
