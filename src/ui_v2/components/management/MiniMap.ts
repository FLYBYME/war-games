import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { latLonToWorld, worldToLatLon } from '../../framework/map/CoordUtils';

/**
 * MiniMap: A high-level situational awareness display.
 */
export class MiniMap extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private worldSize = 1000000; // 1000km default range

    constructor() {
        super('div', 'mini-map');
    }

    protected styles(): string {
        return `
            .mini-map {
                width: 100%;
                height: 200px;
                background: #05080f;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                position: relative;
                overflow: hidden;
                cursor: crosshair;
            }
            .mm-canvas {
                width: 100%;
                height: 100%;
            }
            .mm-overlay {
                position: absolute;
                top: 4px;
                left: 6px;
                font-size: 9px;
                color: var(--text-dim);
                pointer-events: none;
                text-transform: uppercase;
                font-family: var(--font-mono);
            }
        `;
    }

    protected render(): void {
        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'mm-overlay', 'STRAT-VIEW'));
        
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'mm-canvas';
        this.canvas.width = 300;
        this.canvas.height = 200;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        this.subscribe(UIStore.viewState, vs => {
            if (vs) this.draw(vs);
        });

        this.listen(this.canvas, 'click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            // Map click to world coords
            const worldX = (x - 0.5) * this.worldSize;
            const worldY = (0.5 - y) * this.worldSize;
            
            const vs = UIStore.viewState.get();
            if (vs) {
                const lla = worldToLatLon(worldX, worldY, vs.origin as { lat: number, lon: number });
                UIStore.cameraTarget.set({ lat: lla.lat, lon: lla.lon });
            }
        });
    }

    private draw(vs: any) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Center is origin
        const cx = w / 2;
        const cy = h / 2;
        const scale = w / this.worldSize;

        // Draw Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i = -5; i <= 5; i++) {
            const gx = cx + (i * 100000 * scale);
            ctx.moveTo(gx, 0); ctx.lineTo(gx, h);
            const gy = cy + (i * 100000 * scale);
            ctx.moveTo(0, gy); ctx.lineTo(w, gy);
        }
        ctx.stroke();

        // Draw Units
        vs.units.forEach((u: any) => {
            const ux = cx + u.pos.x * scale;
            const uy = cy - u.pos.y * scale;
            
            ctx.fillStyle = u.side === 'Blue' ? '#00d4ff' : '#ff3b30';
            ctx.beginPath();
            ctx.arc(ux, uy, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Tracks
        vs.tracks.forEach((t: any) => {
            const tx = cx + t.pos.x * scale;
            const ty = cy - t.pos.y * scale;
            
            ctx.fillStyle = t.classification === 'Hostile' ? '#ff3b30' : t.classification === 'Friendly' ? '#34c759' : '#ffcc00';
            ctx.beginPath();
            ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Viewport Bounds (Simplified)
        // In a real app we'd get the actual viewport bounds from MapRenderer
    }
}
