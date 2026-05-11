/**
 * Timeline — Horizontal time scrubber for simulation replay.
 *
 * Features:
 * - Draggable playhead
 * - Tick markers with labels
 * - Event markers (engagement, spawn, destruction dots)
 * - Range selection for time segments
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TimelineEvent {
    tick: number;
    type: string;
    color?: string;
}

export interface TimelineProps {
    minTick: number;
    maxTick: number;
    currentTick: number;
    events?: TimelineEvent[];
    onChange?: (tick: number) => void;
    height?: number;
}

export class Timeline extends BaseComponent<TimelineProps> {
    private isDragging = false;
    private trackEl: HTMLElement | null = null;

    constructor(props: TimelineProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            minTick,
            maxTick,
            currentTick,
            events = [],
            height = 40,
        } = this.props;

        this.applyStyles({
            width: '100%',
            height: `${height}px`,
            position: 'relative',
            userSelect: 'none',
            cursor: 'pointer',
        });

        this.element.innerHTML = '';

        // Track background
        const track = document.createElement('div');
        Object.assign(track.style, {
            position: 'absolute',
            left: '0',
            right: '0',
            top: `${height / 2 - 2}px`,
            height: '4px',
            backgroundColor: 'var(--border, #3e3e42)',
            borderRadius: '2px',
        });
        this.trackEl = track;
        this.element.appendChild(track);

        // Progress fill
        const range = maxTick - minTick || 1;
        const progressPct = ((currentTick - minTick) / range) * 100;
        const fill = document.createElement('div');
        Object.assign(fill.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: 'var(--accent, #007acc)',
            borderRadius: '2px',
            transition: 'width 0.1s ease',
        });
        track.appendChild(fill);

        // Event dots
        for (const evt of events) {
            const evtPct = ((evt.tick - minTick) / range) * 100;
            if (evtPct < 0 || evtPct > 100) continue;

            const dot = document.createElement('div');
            Object.assign(dot.style, {
                position: 'absolute',
                left: `${evtPct}%`,
                top: `${height / 2 - 3}px`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: evt.color ?? getEventColor(evt.type),
                transform: 'translateX(-3px)',
                zIndex: '2',
            });
            dot.title = `${evt.type} @ tick ${evt.tick}`;
            this.element.appendChild(dot);
        }

        // Playhead
        const playhead = document.createElement('div');
        Object.assign(playhead.style, {
            position: 'absolute',
            left: `${progressPct}%`,
            top: `${height / 2 - 8}px`,
            width: '12px',
            height: '16px',
            backgroundColor: 'var(--accent, #007acc)',
            borderRadius: '3px',
            transform: 'translateX(-6px)',
            cursor: 'grab',
            zIndex: '3',
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'left 0.1s ease',
        });
        this.element.appendChild(playhead);

        // Tick labels
        const tickCount = 5;
        for (let i = 0; i <= tickCount; i++) {
            const pct = (i / tickCount) * 100;
            const tickValue = minTick + (range * i / tickCount);

            const label = document.createElement('span');
            Object.assign(label.style, {
                position: 'absolute',
                left: `${pct}%`,
                bottom: '0',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-muted, #888)',
            });
            label.textContent = String(Math.round(tickValue));
            this.element.appendChild(label);
        }

        // ── Mouse interaction ────────────────────────────────────────────
        const getTickFromEvent = (e: MouseEvent): number => {
            const rect = this.element.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const fraction = x / rect.width;
            return Math.round(minTick + fraction * range);
        };

        this.element.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            playhead.style.cursor = 'grabbing';
            const tick = getTickFromEvent(e);
            this.props.onChange?.(tick);
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const tick = getTickFromEvent(e);
            this.props.onChange?.(tick);
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            playhead.style.cursor = 'grab';
        });
    }
}

function getEventColor(type: string): string {
    switch (type) {
        case 'EntitySpawned': return '#4caf50';
        case 'EntityDestroyed': return '#f44336';
        case 'WeaponFired': return '#ff9800';
        case 'DamageDealt': return '#e91e63';
        case 'Detection': return '#2196f3';
        default: return '#9e9e9e';
    }
}
