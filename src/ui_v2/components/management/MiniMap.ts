import { Component } from '../../framework/Component';
import { UIStore, ViewState } from '../../framework/UIStore';
import { Side } from '../../../sdk/schemas';
import { worldToLatLon } from '../../framework/map/CoordUtils';

/**
 * MiniMap: A simple 2D tactical overview.
 */
export class MiniMap extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private worldSize = 1000000; // 1000km

    constructor() {
        super('div', 'minimap', 'minimap');
    }

    protected styles(): string {
        return `
            .minimap {
                width: 300px;
                height: 200px;
                background: #050505;
                border: 1px solid #1a1a1a;
                position: relative;
                overflow: hidden;
            }
            .mm-canvas {
                width: 100%;
                height: 100%;
            }
        `;
    }

    protected render(): void {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'mm-canvas';
        this.canvas.width = 300;
        this.canvas.height = 200;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        this.subscribe(UIStore.viewState, vs => {
            if (vs) this.draw(vs);
        });

        this.listen<MouseEvent>(this.canvas, 'click', (e) => {
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

    private draw(vs: ViewState) {
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
        vs.units.forEach((u) => {
            const ux = cx + u.pos.x * scale;
            const uy = cy - u.pos.y * scale;
            
            ctx.fillStyle = u.side === Side.Blue ? '#00d4ff' : '#ff3b30';
            ctx.beginPath();
            ctx.arc(ux, uy, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Tracks
        vs.tracks.forEach((t) => {
            const tx = cx + t.pos.x * scale;
            const ty = cy - t.pos.y * scale;
            
            ctx.fillStyle = t.identification === 'Hostile' ? '#ff3b30' : t.identification === 'Friendly' ? '#34c759' : '#ffcc00';
            ctx.beginPath();
            ctx.fillRect(tx - 1, ty - 1, 2, 2);
        });
    }
}
