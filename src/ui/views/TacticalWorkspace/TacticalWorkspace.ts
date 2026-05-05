import { Component } from '../../framework/Component';
import { Ribbon } from './Ribbon';
import { LeftPanelOOB } from './LeftPanelOOB';
import { RightPanelInspector } from './RightPanelInspector';
import { BottomPanelLogs } from './BottomPanelLogs';
import { TacticalMap } from './TacticalMap';

export class TacticalWorkspace extends Component {
    constructor() { super('div', 'workspace'); }

    protected styles() {
        return `
        .workspace {
            display: grid;
            grid-template-columns: var(--left-panel-width) 1fr var(--right-panel-width);
            grid-template-rows: var(--ribbon-height) 1fr var(--bottom-panel-height);
            grid-template-areas:
                "ribbon  ribbon  ribbon"
                "left    map     right"
                "bottom  bottom  right";
            height: 100vh; width: 100vw; overflow: hidden; background: var(--bg-base);
        }
        .workspace > .ribbon       { grid-area: ribbon; }
        .workspace > .panel-left   { grid-area: left;   }
        .workspace > .viewport-map { grid-area: map;    }
        .workspace > .panel-right  { grid-area: right;  }
        .workspace > .panel-bottom { grid-area: bottom; }
        `;
    }

    protected render() {
        // Children are added in onMount
    }

    protected onMount() {
        this.addChild(new Ribbon());
        this.addChild(new LeftPanelOOB());
        this.addChild(new TacticalMap());
        this.addChild(new RightPanelInspector());
        this.addChild(new BottomPanelLogs());
    }
}
