import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore, LAYER_DEFS } from '../../framework/UIStore';

const TIME_RATES = [1, 2, 5, 15, 60, 300];

export class Ribbon extends Component {
    private tickSpan!: HTMLSpanElement;
    private timeBtns: HTMLButtonElement[] = [];

    constructor() { super('div', 'ribbon'); }

    protected styles() {
        return `
        .ribbon { display:flex; align-items:center; background:var(--bg-panel); border-bottom:1px solid var(--border-color); padding:0 var(--sp-3); gap:var(--sp-2); z-index:100; overflow-x:auto; }
        .ribbon__group { display:flex; align-items:center; gap:var(--sp-1); padding:0 var(--sp-2); border-right:1px solid var(--border-color); height:100%; flex-shrink:0; }
        .ribbon__group:last-child { border-right:none; }
        .ribbon__label { font-size:var(--text-xs); color:var(--text-dim); font-weight:500; margin-right:var(--sp-1); text-transform:uppercase; letter-spacing:0.05em; }
        .ribbon__spacer { flex:1; }
        .ribbon__tick { font-family:var(--font-mono); font-size:var(--text-sm); color:var(--color-friendly); text-shadow:var(--glow-friendly); }
        .time-btn { font-family:var(--font-mono); font-size:var(--text-xs); padding:2px 6px; border-radius:var(--radius-sm); color:var(--text-muted); background:var(--bg-surface); border:1px solid var(--border-color); cursor:pointer; transition:all var(--transition-fast); }
        .time-btn:hover { background:var(--bg-hover); color:var(--text-main); }
        .time-btn.is-active { background:var(--accent-primary); color:#fff; border-color:var(--accent-primary); }
        .layer-chip { font-size:var(--text-xs); padding:2px 8px; border-radius:12px; background:rgba(17,24,39,0.8); border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer; transition:all var(--transition-fast); flex-shrink:0; }
        .layer-chip:hover { border-color:var(--border-light); color:var(--text-main); }
        .layer-chip.is-active { background:rgba(0,212,255,0.12); border-color:var(--color-friendly); color:var(--color-friendly); }
        .layer-group { display:flex; flex-direction:column; gap:2px; padding:var(--sp-2); background:var(--bg-panel); border:1px solid var(--border-color); border-radius:var(--radius-md); position:absolute; top:calc(var(--ribbon-height) + 2px); z-index:200; min-width:160px; }
        .layer-group__title { font-size:var(--text-xs); color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; padding:2px 0; }
        `;
    }

    protected render() {
        // Sim controls
        const simGroup = this.el('div', 'ribbon__group');
        simGroup.appendChild(this.el('span', 'ribbon__label', 'SIM'));
        const pauseBtn = this.makeBtn('⏸', 'btn btn--sm btn--ghost');
        const playBtn = this.makeBtn('▶', 'btn btn--sm btn--ghost');
        const stepBtn = this.makeBtn('⏭', 'btn btn--sm btn--ghost');
        simGroup.append(pauseBtn, playBtn, stepBtn);

        // Speed
        const speedGroup = this.el('div', 'ribbon__group');
        speedGroup.appendChild(this.el('span', 'ribbon__label', 'SPEED'));
        for (const rate of TIME_RATES) {
            const btn = this.makeBtn(`${rate}×`, 'time-btn');
            btn.dataset.rate = String(rate);
            this.timeBtns.push(btn);
            speedGroup.appendChild(btn);
        }

        // Layers — grouped by category, rendered as chip bar
        const layerGroup = this.el('div', 'ribbon__group');
        layerGroup.appendChild(this.el('span', 'ribbon__label', 'LAYERS'));
        layerGroup.style.flexWrap = 'wrap';
        layerGroup.style.maxWidth = '500px';

        for (const def of LAYER_DEFS) {
            const sig = UIStore.getLayerSignal(def.id);
            const chip = this.makeBtn(def.label, `layer-chip${sig.get() ? ' is-active' : ''}`);
            chip.title = `${def.group} · ${def.label}`;
            chip.addEventListener('click', () => {
                UIStore.toggleLayer(def.id);
                chip.classList.toggle('is-active', sig.get());
            });
            layerGroup.appendChild(chip);
        }

        // Spacer + Tick
        const spacer = this.el('div', 'ribbon__spacer');
        const tickGroup = this.el('div', 'ribbon__group');
        tickGroup.appendChild(this.el('span', 'ribbon__label', 'TICK'));
        this.tickSpan = this.el('span', 'ribbon__tick', '0');
        tickGroup.appendChild(this.tickSpan);

        this.element.append(simGroup, speedGroup, layerGroup, spacer, tickGroup);

        // Events
        pauseBtn.addEventListener('click', () => {
            UIStore.setPaused(true);
        });
        playBtn.addEventListener('click', () => {
            UIStore.setPaused(false);
        });
        stepBtn.addEventListener('click', () => {
            sdkClient.scenario.setTimeCompression(1); setTimeout(() => sdkClient.scenario.setTimeCompression(0), 120);
        });

        for (const btn of this.timeBtns) {
            btn.addEventListener('click', () => {
                const rate = parseInt(btn.dataset.rate!);
                UIStore.timeCompression.set(rate); 
                UIStore.setPaused(false);
            });
        }
    }

    protected onMount() {
        this.subscribe(UIStore.currentTick, t => { this.tickSpan.textContent = String(t); });
        this.subscribe(UIStore.timeCompression, rate => {
            this.timeBtns.forEach(b => b.classList.toggle('is-active', b.dataset.rate === String(rate)));
        });
    }

    private makeBtn(text: string, cls: string): HTMLButtonElement {
        const b = document.createElement('button');
        b.className = cls;
        b.textContent = text;
        return b;
    }
}
