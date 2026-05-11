/**
 * MiniMap — Small overview map for spatial context.
 *
 * Renders a simplified, zoomed-out view of the tactical map
 * showing entity positions and the current viewport rectangle.
 * Lives in the corner of the main map or in a sidebar panel.
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface MiniMapUnit {
    id: string;
    x: number;
    y: number;
    side: 'Blue' | 'Red' | 'Neutral';
}

export interface MiniMapProps {
    units: MiniMapUnit[];
    /** Viewport rectangle in world coords */
    viewport?: { x: number; y: number; width: number; height: number };
    /** Canvas size in pixels */
    size?: number;
    /** World bounds (auto-computed from units if not set) */
    worldBounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

const SIDE_COLORS: Record<string, string> = {
    Blue: '#00bcd4',
    Red: '#ff9800',
    Neutral: '#78909c',
};

export class MiniMap extends BaseComponent<MiniMapProps> {
    private canvas: HTMLCanvasElement | null = null;

    constructor(props: MiniMapProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { size = 150 } = this.props;

        this.applyStyles({
            width: `${size}px`,
            height: `${size}px`,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            overflow: 'hidden',
            position: 'relative',
        });

        this.element.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.element.appendChild(this.canvas);

        this.draw();
    }

    public draw(): void {
        if (!this.canvas) return;

        const { units, viewport, size = 150 } = this.props;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, size, size);

        // Compute world bounds
        const bounds = this.computeBounds(units);
        if (!bounds) return;

        const worldW = bounds.maxX - bounds.minX || 1;
        const worldH = bounds.maxY - bounds.minY || 1;
        const scale = Math.min(size / worldW, size / worldH) * 0.8;
        const offsetX = (size - worldW * scale) / 2;
        const offsetY = (size - worldH * scale) / 2;

        const toScreen = (wx: number, wy: number): [number, number] => {
            return [
                offsetX + (wx - bounds.minX) * scale,
                offsetY + (wy - bounds.minY) * scale,
            ];
        };

        // Draw viewport rectangle
        if (viewport) {
            const [vx, vy] = toScreen(viewport.x, viewport.y);
            const vw = viewport.width * scale;
            const vh = viewport.height * scale;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(vx, vy, vw, vh);
        }

        // Draw units
        for (const unit of units) {
            const [sx, sy] = toScreen(unit.x, unit.y);
            ctx.fillStyle = SIDE_COLORS[unit.side] ?? '#9e9e9e';
            ctx.fillRect(sx - 2, sy - 2, 4, 4);
        }

        // Border grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
            const p = (i / 4) * size;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(size, p);
            ctx.stroke();
        }
    }

    private computeBounds(units: MiniMapUnit[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
        if (this.props.worldBounds) return this.props.worldBounds;
        if (units.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const u of units) {
            minX = Math.min(minX, u.x);
            minY = Math.min(minY, u.y);
            maxX = Math.max(maxX, u.x);
            maxY = Math.max(maxY, u.y);
        }

        // Add padding
        const padX = (maxX - minX) * 0.1 || 10000;
        const padY = (maxY - minY) * 0.1 || 10000;

        return {
            minX: minX - padX,
            minY: minY - padY,
            maxX: maxX + padX,
            maxY: maxY + padY,
        };
    }
}
