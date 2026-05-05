import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * NetworkWindow: Visual node graph showing datalink connectivity.
 * Ported to V2 WindowManager architecture.
 */
export class NetworkWindow extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    constructor() { super('div', 'datalink-widget'); }

    protected styles() {
        return `
        .datalink-widget { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
        .dl-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .dl-canvas { width: 100%; height: 250px; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-sm); }
        .dl-legend { display: flex; gap: var(--sp-3); margin-top: var(--sp-2); font-size: var(--text-xs); background: var(--bg-surface); padding: var(--sp-2); border-radius: var(--radius-sm); border: 1px solid var(--border-color); justify-content: center; }
        .dl-legend__item { display: flex; align-items: center; gap: 6px; color: var(--text-main); font-weight: 500; }
        .dl-legend__dot { width: 8px; height: 8px; border-radius: 50%; }
        `;
    }

    protected render() {
        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'dl-title', 'DATALINK TOPOLOGY'));

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'dl-canvas';
        this.canvas.width = 400;
        this.canvas.height = 250;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        const legend = this.el('div', 'dl-legend');
        legend.appendChild(this.legendItem('#00d4ff', 'Connected'));
        legend.appendChild(this.legendItem('#ff2d55', 'Isolated'));
        legend.appendChild(this.legendItem('#ffd60a', 'Relay'));
        this.element.appendChild(legend);

        this.subscribe(UIStore.viewState, vs => {
            if (!vs) return;
            this.drawTopology(vs.units);
        });
    }

    private drawTopology(units: any[]) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 400, 250);

        const cx = 200, cy = 125;
        const nodes: { x: number; y: number; id: string; connected: boolean; network: string }[] = [];

        // Assuming all units are blue friendly for this topology for now
        const dlUnits = units.filter(u => u.side === 'Blue'); 
        if (dlUnits.length === 0) return;

        for (let i = 0; i < dlUnits.length; i++) {
            const angle = (2 * Math.PI * i) / dlUnits.length;
            const r = 90;
            const u = dlUnits[i];
            // Just simulate connection for visual effect if datalink component isn't explicitly active
            nodes.push({
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r,
                id: u.id,
                connected: u.datalink ? u.datalink.isActive : true,
                network: u.datalink ? u.datalink.networkId : 'Link-16'
            });
        }

        // Draw edges
        ctx.strokeStyle = 'rgba(0,212,255,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (nodes[i].connected && nodes[j].connected) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw hub
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,212,255,0.15)';
        ctx.fill();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px var(--font-ui)';
        ctx.textAlign = 'center';
        ctx.fillText('NET', cx, cy + 3);

        // Draw edges from hub to nodes
        for (const n of nodes) {
            if (n.connected) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(n.x, n.y);
                ctx.strokeStyle = 'rgba(0,212,255,0.15)';
                ctx.stroke();
            }
        }

        // Draw nodes
        for (const n of nodes) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = n.connected ? 'rgba(0,212,255,0.3)' : 'rgba(255,45,85,0.3)';
            ctx.fill();
            ctx.strokeStyle = n.connected ? '#00d4ff' : '#ff2d55';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px var(--font-mono)';
            ctx.textAlign = 'center';
            ctx.fillText(n.id.substring(0, 8), n.x, n.y + 20);
        }
    }

    private legendItem(color: string, label: string): HTMLElement {
        const item = this.el('div', 'dl-legend__item');
        const dot = this.el('div', 'dl-legend__dot');
        dot.style.background = color;
        item.append(dot, this.el('span', undefined, label));
        return item;
    }
}
