import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * StatusBar: Displays global application state at the bottom of the screen.
 */
export class StatusBar extends Component {
    constructor() {
        super('div', 'status-bar');
    }

    protected styles(): string {
        return `
            .status-bar {
                display: flex;
                height: 24px;
                background: var(--bg-header);
                border-top: 1px solid var(--border-color);
                align-items: center;
                padding: 0 var(--sp-3);
                font-size: 10px;
                color: var(--text-muted);
                gap: var(--sp-5);
                z-index: 2000;
            }

            .status-group {
                display: flex;
                align-items: center;
                gap: var(--sp-2);
            }

            .status-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--accent-success);
                box-shadow: 0 0 5px var(--accent-success);
            }
            .status-dot.offline { background: var(--accent-danger); box-shadow: 0 0 5px var(--accent-danger); }

            .status-label { text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
            .status-value { color: var(--text-main); font-family: var(--font-mono); }
        `;
    }

    protected render(): void {
        const connGroup = this.el('div', 'status-group');
        const dot = this.el('div', 'status-dot');
        connGroup.appendChild(dot);
        connGroup.appendChild(this.el('span', 'status-label', 'SERVER:'));
        const connVal = this.el('span', 'status-value', 'ONLINE');
        connGroup.appendChild(connVal);

        const matchGroup = this.el('div', 'status-group');
        matchGroup.appendChild(this.el('span', 'status-label', 'MATCH:'));
        const matchVal = this.el('span', 'status-value', 'NONE');
        matchGroup.appendChild(matchVal);

        const tickGroup = this.el('div', 'status-group');
        tickGroup.appendChild(this.el('span', 'status-label', 'SIM TIME:'));
        const tickVal = this.el('span', 'status-value', 'T+00:00:00');
        tickGroup.appendChild(tickVal);

        const entityGroup = this.el('div', 'status-group');
        entityGroup.appendChild(this.el('span', 'status-label', 'ENTITIES:'));
        const entityVal = this.el('span', 'status-value', '0');
        entityGroup.appendChild(entityVal);

        this.element.appendChild(connGroup);
        this.element.appendChild(matchGroup);
        this.element.appendChild(tickGroup);
        this.element.appendChild(entityGroup);

        this.subscribe(UIStore.viewState, vs => {
            if (!vs) {
                dot.classList.add('offline');
                connVal.textContent = 'OFFLINE';
                return;
            }
            dot.classList.remove('offline');
            connVal.textContent = 'ONLINE';
            matchVal.textContent = UIStore.currentMatchId.get()?.toUpperCase() || 'NONE';
            
            // Format tick to HH:MM:SS
            const seconds = vs.tick;
            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            tickVal.textContent = `T+${h}:${m}:${s}`;
            
            entityVal.textContent = (vs.units.length + vs.tracks.length).toString();
        });
    }
}
