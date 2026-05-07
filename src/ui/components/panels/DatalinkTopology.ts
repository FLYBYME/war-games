import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * DatalinkTopology: Visual node graph showing network connectivity.
 */
export class DatalinkTopology extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    constructor() {
        super('div', 'datalink-topology', 'datalink-topology');
    }

    protected styles(): string {
        return `
            .datalink-topology {
                padding: var(--sp-4);
                background: var(--bg-panel);
                border: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: var(--sp-2);
                min-height: 200px;
            }
            .dl-header { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
            .dl-canvas { border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); width: 100%; height: 150px; }
            .dl-legend { display: flex; gap: var(--sp-3); font-size: 10px; color: var(--text-dim); margin-top: 4px; }
            .dl-legend__item { display: flex; align-items: center; gap: 4px; }
            .dl-legend__dot { width: 6px; height: 6px; border-radius: 50%; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="dl-header">Datalink Network Graph</div>
            <canvas class="dl-canvas" width="300" height="150"></canvas>
            <div class="dl-legend">
                <!-- Legend items -->
            </div>
        `;

        this.canvas = this.element.querySelector('.dl-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        const legend = this.element.querySelector('.dl-legend')!;
        legend.append(
            this.createLegendItem('#00d4ff', 'Active Node'),
            this.createLegendItem('#1e293b', 'Offline'),
            this.createLegendItem('#00d4ff33', 'Link')
        );

        this.subscribe(UIStore.viewState, (vs) => {
            if (!vs) return;
            this.drawTopology(vs.units as unknown as { id: string }[]);
        });
    }

    private drawTopology(units: { id: string, datalink?: { isActive: boolean, networkId: string } }[]) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 300, 150);

        const cx = 150, cy = 75;
        const nodes: { x: number; y: number; id: string; connected: boolean; network: string }[] = [];
        const dlUnits = units.filter(u => u.datalink);

        if (dlUnits.length === 0) {
            ctx.fillStyle = '#444';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('NO NETWORK NODES DETECTED', cx, cy);
            return;
        }

        // Arrange in circle
        const radius = 50;
        dlUnits.forEach((u, i) => {
            const angle = (i / dlUnits.length) * Math.PI * 2;
            nodes.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                id: u.id,
                connected: u.datalink?.isActive || false,
                network: u.datalink?.networkId || 'None'
            });
        });

        // Draw Links
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (nodes[i].network === nodes[j].network && nodes[i].connected && nodes[j].connected) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw Nodes
        nodes.forEach(n => {
            ctx.fillStyle = n.connected ? '#00d4ff' : '#1e293b';
            ctx.beginPath();
            ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#888';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(n.id.slice(-4), n.x, n.y + 12);
        });
    }

    private createLegendItem(color: string, label: string): HTMLElement {
        const item = this.el('div', 'dl-legend__item');
        const dot = this.el('div', 'dl-legend__dot');
        dot.style.background = color;
        item.append(dot, this.el('span', undefined, label));
        return item;
    }
}
