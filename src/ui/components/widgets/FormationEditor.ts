import { Component } from '../../framework/Component';

interface StationNode { id: string; name: string; offsetX: number; offsetY: number; }
type FormationType = 'Line Abreast' | 'Wedge' | 'Diamond' | 'Column' | 'Custom';

/**
 * FormationEditor: Drag-and-drop graphical formation editor.
 */
export class FormationEditor extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private nodes: StationNode[] = [];
    private draggingIdx = -1;
    private formationType: FormationType = 'Line Abreast';

    constructor() { super('div', 'formation-editor'); }

    protected styles() {
        return `
        .formation-editor { padding:var(--sp-3); }
        .fe-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .fe-canvas { width:100%; height:200px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); cursor:crosshair; }
        .fe-presets { display:flex; gap:4px; margin-bottom:var(--sp-2); flex-wrap:wrap; }
        .fe-info { font-size:var(--text-xs); color:var(--text-dim); margin-top:4px; font-family:var(--font-mono); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'fe-title', 'FORMATION EDITOR'));

        const presets = this.el('div', 'fe-presets');
        for (const type of ['Line Abreast', 'Wedge', 'Diamond', 'Column'] as FormationType[]) {
            const btn = document.createElement('button');
            btn.className = 'btn btn--ghost btn--sm';
            btn.textContent = type;
            btn.addEventListener('click', () => this.applyPreset(type));
            presets.appendChild(btn);
        }
        this.element.appendChild(presets);

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fe-canvas';
        this.canvas.width = 280; this.canvas.height = 200;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        this.element.appendChild(this.el('div', 'fe-info', 'Drag units to set station offsets'));

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => { this.draggingIdx = -1; });

        this.applyPreset('Line Abreast');
    }

    private applyPreset(type: FormationType) {
        this.formationType = type;
        const cx = 140, cy = 100;
        const spacing = 40;
        this.nodes = [];
        switch (type) {
            case 'Line Abreast':
                for (let i = -2; i <= 2; i++) this.nodes.push({ id: `U${i + 3}`, name: `Unit ${i + 3}`, offsetX: cx + i * spacing, offsetY: cy });
                break;
            case 'Wedge':
                this.nodes.push({ id: 'U1', name: 'Lead', offsetX: cx, offsetY: cy - spacing });
                this.nodes.push({ id: 'U2', name: 'Left', offsetX: cx - spacing, offsetY: cy + spacing / 2 });
                this.nodes.push({ id: 'U3', name: 'Right', offsetX: cx + spacing, offsetY: cy + spacing / 2 });
                break;
            case 'Diamond':
                this.nodes.push({ id: 'U1', name: 'Lead', offsetX: cx, offsetY: cy - spacing });
                this.nodes.push({ id: 'U2', name: 'Left', offsetX: cx - spacing, offsetY: cy });
                this.nodes.push({ id: 'U3', name: 'Right', offsetX: cx + spacing, offsetY: cy });
                this.nodes.push({ id: 'U4', name: 'Trail', offsetX: cx, offsetY: cy + spacing });
                break;
            case 'Column':
                for (let i = 0; i < 4; i++) this.nodes.push({ id: `U${i + 1}`, name: `Unit ${i + 1}`, offsetX: cx, offsetY: cy - spacing + i * spacing });
                break;
        }
        this.drawFormation();
    }

    private drawFormation() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw lines between nodes
        ctx.strokeStyle = 'rgba(0,212,255,0.2)';
        ctx.lineWidth = 1;
        if (this.nodes.length > 1) {
            for (let i = 1; i < this.nodes.length; i++) {
                ctx.beginPath();
                ctx.moveTo(this.nodes[0].offsetX, this.nodes[0].offsetY);
                ctx.lineTo(this.nodes[i].offsetX, this.nodes[i].offsetY);
                ctx.stroke();
            }
        }

        // Draw nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            ctx.beginPath();
            ctx.arc(n.offsetX, n.offsetY, 8, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.25)';
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(n.name, n.offsetX, n.offsetY + 20);
        }
    }

    private onMouseDown(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for (let i = 0; i < this.nodes.length; i++) {
            const dx = mx - this.nodes[i].offsetX, dy = my - this.nodes[i].offsetY;
            if (dx * dx + dy * dy < 200) { this.draggingIdx = i; return; }
        }
    }

    private onMouseMove(e: MouseEvent) {
        if (this.draggingIdx < 0) return;
        const rect = this.canvas.getBoundingClientRect();
        this.nodes[this.draggingIdx].offsetX = e.clientX - rect.left;
        this.nodes[this.draggingIdx].offsetY = e.clientY - rect.top;
        this.drawFormation();
    }
}
