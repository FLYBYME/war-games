import { Component } from '../../framework/Component';
import { logger } from '../../framework/Logger';

interface SessionInfo {
    id: string;
    matchId: string;
    side: string;
    lastPing: number;
}

/**
 * SessionManager: Monitors active user connections.
 */
export class SessionManager extends Component {
    private listEl!: HTMLElement;
    private timer: any;

    constructor() {
        super('div', 'session-manager', 'session-manager');
    }

    protected styles(): string {
        return `
            .session-manager {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 100%;
                background: #1e1e1e;
                color: #ddd;
                font-family: monospace;
            }
            .session-list {
                flex: 1;
                overflow-y: auto;
                border: 1px solid #333;
                background: #111;
            }
            .session-row {
                display: grid;
                grid-template-columns: 80px 1fr 80px 80px;
                padding: 4px 8px;
                border-bottom: 1px solid #222;
                font-size: 11px;
            }
            .session-header {
                font-weight: bold;
                background: #222;
                color: #00d1ff;
            }
            .session-id { color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .session-match { color: #aaa; }
            .session-side { font-weight: bold; }
            .side-blue { color: #0077ff; }
            .side-red { color: #ff3333; }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'session-row session-header');
        header.appendChild(this.el('div', '', 'ID'));
        header.appendChild(this.el('div', '', 'MATCH'));
        header.appendChild(this.el('div', '', 'SIDE'));
        header.appendChild(this.el('div', '', 'PING'));
        
        this.listEl = this.el('div', 'session-list');
        
        this.element.appendChild(header);
        this.element.appendChild(this.listEl);
    }

    protected onMount(): void {
        this.refresh();
        this.timer = setInterval(() => this.refresh(), 2000);
    }

    protected onUnmount(): void {
        if (this.timer) clearInterval(this.timer);
    }

    private async refresh() {
        try {
            const resp = await fetch('/api/sessions');
            const sessions: SessionInfo[] = await resp.json();
            
            this.listEl.innerHTML = '';
            sessions.forEach(s => {
                const row = this.el('div', 'session-row');
                const idEl = this.el('div', 'session-id', s.id.substring(0, 8));
                idEl.title = s.id;
                
                row.appendChild(idEl);
                row.appendChild(this.el('div', 'session-match', s.matchId));
                row.appendChild(this.el('div', `session-side side-${s.side.toLowerCase()}`, s.side));
                row.appendChild(this.el('div', '', `${Date.now() - s.lastPing}ms`));
                
                this.listEl.appendChild(row);
            });
        } catch (err) {
            logger.error('Failed to fetch sessions', { err });
        }
    }
}
