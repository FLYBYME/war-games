import { Component } from '../../framework/Component';
import { UIStore, LogEntry } from '../../framework/UIStore';

/**
 * EventTicker: A rolling list of tactical alerts at the bottom of the screen.
 */
export class EventTicker extends Component {
    constructor() {
        super('div', 'event-ticker');
    }

    protected styles(): string {
        return `
            .event-ticker {
                position: absolute;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: 500px;
                max-height: 120px;
                overflow-y: hidden;
                display: flex;
                flex-direction: column-reverse;
                gap: 4px;
                pointer-events: none;
                z-index: 100;
            }

            .ticker-item {
                background: rgba(0, 0, 0, 0.7);
                border-left: 3px solid #888;
                padding: 6px 12px;
                border-radius: 0 4px 4px 0;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                animation: ticker-slide-in 0.3s ease-out;
                backdrop-filter: blur(4px);
                flex-shrink: 0;
                display: flex;
                gap: 10px;
                align-items: center;
                border: 1px solid rgba(255,255,255,0.1);
            }

            .ticker-item.Warning { border-left-color: #ffcc00; }
            .ticker-item.Critical { border-left-color: #ff3b30; }
            .ticker-item.Combat { border-left-color: #ff3b30; background: rgba(255, 59, 48, 0.2); }
            .ticker-item.Info { border-left-color: #00d1ff; }

            .ticker-tick {
                font-family: monospace;
                color: #888;
                font-size: 10px;
                min-width: 40px;
            }

            .ticker-msg {
                flex: 1;
                font-weight: 500;
                letter-spacing: 0.02em;
            }

            @keyframes ticker-slide-in {
                from { transform: translateY(10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
    }

    protected render(): void {
        this.subscribe(UIStore.logs, (logs) => {
            // Only show last 5 logs in the ticker
            const recent = logs.slice(-5);
            this.element.innerHTML = '';
            recent.forEach(log => this.addTickerItem(log));
        });
    }

    private addTickerItem(log: LogEntry) {
        const item = this.el('div', `ticker-item ${log.severity}`);
        
        const tick = this.el('span', 'ticker-tick', `T+${log.tick}`);
        const msg = this.el('span', 'ticker-msg', log.message);

        item.appendChild(tick);
        item.appendChild(msg);
        
        this.element.appendChild(item);

        // Auto-fade out after 5 seconds
        setTimeout(() => {
            item.style.transition = 'opacity 1s, transform 1s';
            item.style.opacity = '0';
            item.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (item.parentNode === this.element) {
                    this.element.removeChild(item);
                }
            }, 1000);
        }, 5000);
    }
}
