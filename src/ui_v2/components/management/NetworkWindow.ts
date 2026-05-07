import { Component } from '../../framework/Component';
import { UIStore, ViewState } from '../../framework/UIStore';
import { ViewUnit } from '../../framework/UIStore';

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
        legend.appendChild(this.legendItem('var(--color-friendly)', 'Connected'));
        legend.appendChild(this.legendItem('var(--color-hostile)', 'Disconnected'));
        legend.appendChild(this.legendItem('var(--color-unknown)', 'Relay'));
        this.element.appendChild(legend);

        this.subscribe(UIStore.viewState, vs => {
            if (!vs) return;
            this.drawTopology(vs);
        });
    }

    private drawTopology(vs: ViewState) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 400, 250);

        const graph = vs.datalinkGraph;
        if (!graph) return;

        const cx = 200, cy = 125;
        const nodes: Map<string, { x: number; y: number; id: string; status: 'Connected' | 'Disconnected' | 'Relay' }> = new Map();

        const units = vs.units.filter((u: ViewUnit) => u.side === 'Blue' || u.side === 'Neutral');
        if (units.length === 0) return;

        // Position nodes in a circle
        for (let i = 0; i < units.length; i++) {
            const angle = (2 * Math.PI * i) / units.length;
            const r = 85;
            const u = units[i];
            const isConnected = graph.nodes.includes(u.id);
            nodes.set(u.id, {
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r,
                id: u.id,
                status: isConnected ? 'Connected' : 'Disconnected'
            });
        }

        // Draw edges from graph
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.lineWidth = 1;
        if (graph.edges) {
            for (const edge of graph.edges) {
                const n1 = nodes.get(edge.a);
                const n2 = nodes.get(edge.b);
                if (n1 && n2) {
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.stroke();
                    
                    // Optional: Draw latency label
                    if (edge.latencyMs > 0) {
                        ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
                        ctx.font = '8px var(--font-mono)';
                        ctx.fillText(`${edge.latencyMs}ms`, (n1.x + n2.x) / 2, (n1.y + n2.y) / 2);
                    }
                }
            }
        }

        // Draw hub (The Network itself)
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,212,255,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'var(--color-friendly)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'var(--text-main)';
        ctx.font = 'bold 9px var(--font-ui)';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', cx, cy + 4);

        // Draw nodes
        nodes.forEach((n) => {
            const color = n.status === 'Connected' ? '#00d4ff' : '#ff2d55';
            
            // Halo
            ctx.beginPath();
            ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = `${color}22`;
            ctx.fill();

            // Node dot
            ctx.beginPath();
            ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '9px var(--font-mono)';
            ctx.textAlign = 'center';
            ctx.fillText(n.id.substring(0, 8), n.x, n.y + 18);
        });
    }


    private legendItem(color: string, label: string): HTMLElement {
        const item = this.el('div', 'dl-legend__item');
        const dot = this.el('div', 'dl-legend__dot');
        dot.style.background = color;
        item.append(dot, this.el('span', undefined, label));
        return item;
    }
}
