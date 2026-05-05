import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * TimeControls: Manage simulation pause/resume and time compression.
 */
export class TimeControls extends Component {
    private timeEl: HTMLElement | null = null;
    private pauseBtn: HTMLElement | null = null;

    constructor() {
        super('div', 'time-controls', 'time-controls');
    }

    protected styles(): string {
        return `
            .time-controls {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;
                height: 100%;
                background: rgba(0,0,0,0.2);
                border-left: 1px solid var(--bg-surface-3, #3a3a3a);
                font-family: var(--font-mono, 'JetBrains Mono', monospace);
                font-size: 11px;
                color: var(--text-main, #eee);
            }

            .time-display {
                color: var(--accent-info, #00d1ff);
                min-width: 80px;
                text-align: right;
                font-variant-numeric: tabular-nums;
                margin-right: 4px;
            }

            .time-buttons {
                display: flex;
                gap: 2px;
            }

            .time-btn {
                background: var(--bg-surface-1, #1a1a1a);
                border: 1px solid var(--bg-surface-3, #3a3a3a);
                color: var(--text-muted, #888);
                padding: 1px 6px;
                cursor: pointer;
                border-radius: 2px;
                font-size: 10px;
                transition: all 0.1s;
                min-width: 32px;
            }

            .time-btn:hover {
                background: var(--bg-surface-3, #3a3a3a);
                color: var(--text-bright, #fff);
            }

            .time-btn.active {
                background: var(--accent-primary, #3b82f6);
                color: white;
                border-color: var(--accent-primary, #3b82f6);
                box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
            }

            .pause-btn {
                width: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: var(--accent-warning, #f59e0b);
            }
            
            .pause-btn.playing {
                color: var(--accent-success, #22c55e);
            }
        `;
    }

    protected render(): void {
        this.timeEl = this.el('div', 'time-display', '00:00:00:000', 'sim-time');
        
        this.pauseBtn = this.el('button', 'time-btn pause-btn', '▶', 'btn-pause-play');
        this.listen(this.pauseBtn, 'click', () => {
            UIStore.setPaused(!UIStore.isPaused.get());
        });

        const speedContainer = this.el('div', 'time-buttons');
        const speeds = [1, 5, 15, 30, 60];
        
        speeds.forEach(s => {
            const btn = this.el('button', 'time-btn', `${s}x`, `btn-speed-${s}`);
            this.listen(btn, 'click', () => UIStore.setTimeCompression(s));
            
            this.subscribe(UIStore.timeCompression, current => {
                btn.classList.toggle('active', current === s);
            });
            
            speedContainer.appendChild(btn);
        });

        this.element.appendChild(this.timeEl);
        this.element.appendChild(this.pauseBtn);
        this.element.appendChild(speedContainer);

        // Reactive updates
        this.subscribe(UIStore.isPaused, paused => {
            if (this.pauseBtn) {
                this.pauseBtn.textContent = paused ? '▶' : '⏸';
                this.pauseBtn.classList.toggle('playing', !paused);
            }
        });

        this.subscribe(UIStore.currentTimestamp, ts => {
            if (this.timeEl) this.timeEl.textContent = this.formatTime(ts);
        });
    }

    private formatTime(ts: number): string {
        if (!ts) return '00:00:00:000';
        
        // Handle both seconds and milliseconds (heuristic)
        const date = new Date(ts > 1e11 ? ts : ts * 1000);
        
        const h = date.getUTCHours().toString().padStart(2, '0');
        const m = date.getUTCMinutes().toString().padStart(2, '0');
        const s = date.getUTCSeconds().toString().padStart(2, '0');
        const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
        
        return `${h}:${m}:${s}.${ms}`;
    }
}
