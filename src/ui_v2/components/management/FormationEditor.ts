import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { commandDispatcher } from '../../framework/CommandDispatcher';

interface StationNode { id: string; name: string; offsetX: number; offsetY: number; }
type FormationType = 'Line Abreast' | 'Wedge' | 'Diamond' | 'Column' | 'Custom';

/**
 * FormationEditor: Drag-and-drop graphical formation editor.
 * Ported to V2 with command dispatch.
 */
export class FormationEditor extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private nodes: StationNode[] = [];
    private draggingIdx = -1;
    private formationType: FormationType = 'Line Abreast';

    constructor() {
        super('div', 'formation-editor');
    }

    protected styles(): string {
        return `
            .formation-editor {
                padding: var(--sp-2);
                background: var(--bg-surface);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
            }
            .fe-title {
                font-size: var(--text-xs);
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                margin-bottom: var(--sp-2);
                letter-spacing: 0.05em;
            }
            .fe-canvas {
                width: 100%;
                height: 180px;
                background: var(--bg-base);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                cursor: crosshair;
                touch-action: none;
            }
            .fe-presets {
                display: flex;
                gap: 4px;
                margin-bottom: var(--sp-2);
                flex-wrap: wrap;
            }
            .fe-info {
                font-size: var(--text-xs);
                color: var(--text-dim);
                margin-top: 4px;
                font-style: italic;
            }
            .fe-controls {
                margin-top: var(--sp-3);
                display: flex;
                flex-direction: column;
                gap: var(--sp-2);
            }
        `;
    }

    protected render(): void {
        this.element.appendChild(this.el('div', 'fe-title', 'FORMATION EDITOR'));

        const presets = this.el('div', 'fe-presets');
        (['Line Abreast', 'Wedge', 'Diamond', 'Column'] as FormationType[]).forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'btn btn--ghost btn--xs';
            btn.textContent = type;
            btn.onclick = () => this.applyPreset(type);
            presets.appendChild(btn);
        });
        this.element.appendChild(presets);

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fe-canvas';
        this.canvas.width = 280;
        this.canvas.height = 180;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        this.element.appendChild(this.el('div', 'fe-info', 'Drag nodes to adjust station offsets (Scale: 1px = 100m)'));

        const controls = this.el('div', 'fe-controls');
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn--primary btn--sm';
        saveBtn.textContent = 'SAVE FORMATION';
        saveBtn.onclick = () => this.saveFormation();
        controls.appendChild(saveBtn);
        this.element.appendChild(controls);

        this.listen<MouseEvent>(this.canvas, 'mousedown', (e) => this.onMouseDown(e));
        this.listen<MouseEvent>(window, 'mousemove', (e) => this.onMouseMove(e));
        this.listen<MouseEvent>(window, 'mouseup', () => { this.draggingIdx = -1; });

        this.applyPreset('Line Abreast');
    }

    private applyPreset(type: FormationType) {
        this.formationType = type;
        const cx = 140, cy = 90;
        const spacing = 30;
        this.nodes = [];
        switch (type) {
            case 'Line Abreast':
                for (let i = -2; i <= 2; i++) this.nodes.push({ id: `S${i + 3}`, name: i === 0 ? 'LEAD' : `STN ${i + 3}`, offsetX: cx + i * spacing, offsetY: cy });
                break;
            case 'Wedge':
                this.nodes.push({ id: 'S1', name: 'LEAD', offsetX: cx, offsetY: cy - spacing });
                this.nodes.push({ id: 'S2', name: 'STN 2', offsetX: cx - spacing, offsetY: cy + spacing });
                this.nodes.push({ id: 'S3', name: 'STN 3', offsetX: cx + spacing, offsetY: cy + spacing });
                break;
            case 'Diamond':
                this.nodes.push({ id: 'S1', name: 'LEAD', offsetX: cx, offsetY: cy - spacing });
                this.nodes.push({ id: 'S2', name: 'STN 2', offsetX: cx - spacing, offsetY: cy });
                this.nodes.push({ id: 'S3', name: 'STN 3', offsetX: cx + spacing, offsetY: cy });
                this.nodes.push({ id: 'S4', name: 'STN 4', offsetX: cx, offsetY: cy + spacing });
                break;
            case 'Column':
                for (let i = 0; i < 4; i++) this.nodes.push({ id: `S${i + 1}`, name: i === 0 ? 'LEAD' : `STN ${i + 1}`, offsetX: cx, offsetY: cy - spacing + i * spacing });
                break;
        }
        this.drawFormation();
    }

    private drawFormation() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.canvas.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke(); }
        for (let y = 0; y <= this.canvas.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke(); }

        // Draw lines from lead
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        if (this.nodes.length > 0) {
            const lead = this.nodes[0];
            for (let i = 1; i < this.nodes.length; i++) {
                ctx.beginPath();
                ctx.moveTo(lead.offsetX, lead.offsetY);
                ctx.lineTo(this.nodes[i].offsetX, this.nodes[i].offsetY);
                ctx.stroke();
            }
        }

        // Draw nodes
        this.nodes.forEach((n, i) => {
            ctx.beginPath();
            ctx.arc(n.offsetX, n.offsetY, 6, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? 'rgba(0, 212, 255, 0.8)' : 'rgba(0, 212, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(n.name, n.offsetX, n.offsetY + 16);
        });
    }

    private onMouseDown(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        this.nodes.forEach((n, i) => {
            const dx = mx - n.offsetX, dy = my - n.offsetY;
            if (dx * dx + dy * dy < 150) { this.draggingIdx = i; }
        });
    }

    private onMouseMove(e: MouseEvent) {
        if (this.draggingIdx < 0) return;
        const rect = this.canvas.getBoundingClientRect();
        this.nodes[this.draggingIdx].offsetX = e.clientX - rect.left;
        this.nodes[this.draggingIdx].offsetY = e.clientY - rect.top;
        this.drawFormation();
    }

    private saveFormation() {
        const selectedId = UIStore.selectedEntityId.get();
        if (!selectedId) return;

        const lead = this.nodes[0];
        // Convert pixels to meters (1px = 100m as a heuristic)
        const stations = this.nodes.slice(1).map(n => ({
            offsetX: (n.offsetX - lead.offsetX) * 100,
            offsetY: (n.offsetY - lead.offsetY) * 100
        }));

        void UIStore.issueCommand({
            type: 'JoinFormation',
            entityId: selectedId,
            leaderId: 'LEAD', // Placeholder
            offset: { x: stations[0]?.offsetX || 0, y: stations[0]?.offsetY || 0, z: 0 }
        });
        
        console.log(`Saved formation for ${selectedId}`, stations);
    }
}
