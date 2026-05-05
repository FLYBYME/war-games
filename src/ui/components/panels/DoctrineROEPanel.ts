import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

type ROEState = 'Free' | 'Tight' | 'Hold';

/**
 * DoctrineROEPanel: Global, mission, and unit-level ROE control.
 */
export class DoctrineROEPanel extends Component {
    constructor() { super('div', 'doctrine-widget'); }

    protected styles() {
        return `
        .doctrine-widget { padding:var(--sp-3); }
        .doc-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .doc-level { margin-bottom:var(--sp-3); padding:var(--sp-2); background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); }
        .doc-level__header { font-size:var(--text-xs); color:var(--text-dim); font-weight:500; text-transform:uppercase; margin-bottom:4px; }
        .doc-roe-btns { display:flex; gap:4px; }
        .doc-roe-btn { flex:1; padding:var(--sp-1) var(--sp-2); font-size:var(--text-xs); font-weight:500; text-align:center; border-radius:var(--radius-sm); border:1px solid var(--border-color); cursor:pointer; transition:all var(--transition-fast); color:var(--text-muted); background:var(--bg-panel); }
        .doc-roe-btn:hover { border-color:var(--border-light); }
        .doc-roe-btn.is-free { background:rgba(34,197,94,0.15); border-color:var(--accent-success); color:var(--accent-success); }
        .doc-roe-btn.is-tight { background:rgba(245,158,11,0.15); border-color:var(--accent-warning); color:var(--accent-warning); }
        .doc-roe-btn.is-hold { background:rgba(239,68,68,0.15); border-color:var(--accent-danger); color:var(--accent-danger); }
        .doc-emcon-row { display:flex; justify-content:space-between; align-items:center; padding:var(--sp-1) 0; font-size:var(--text-sm); }
        .doc-emcon-label { color:var(--text-muted); font-size:var(--text-xs); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'doc-title', 'DOCTRINE & ROE'));

        // Global ROE
        this.element.appendChild(this.makeROELevel('Global', 'Tight', (roe) => {
            sdkClient.dispatch({ type: 'SetGlobalROE', roe });
        }));

        // Mission ROE
        this.element.appendChild(this.makeROELevel('Mission', 'Tight', (roe) => {
            const id = UIStore.selectedEntityId.get();
            if (id) sdkClient.dispatch({ type: 'SetMissionROE', roe });
        }));

        // Unit ROE
        this.element.appendChild(this.makeROELevel('Selected Unit', 'Tight', (roe) => {
            const id = UIStore.selectedEntityId.get();
            if (id) sdkClient.dispatch({ type: 'SetUnitROE', entityId: id, roe });
        }));

        // EMCON presets
        const emconBlock = this.el('div', 'doc-level');
        emconBlock.appendChild(this.el('div', 'doc-level__header', 'EMCON Profile'));
        const emconBtns = this.el('div', 'doc-roe-btns');
        for (const [label, state] of [['Alpha (Silent)', 'Silent'], ['Bravo (ESM Only)', 'Passive'], ['Charlie (Active)', 'Active']] as [string, string][]) {
            const btn = document.createElement('button');
            btn.className = `doc-roe-btn${state === 'Active' ? ' is-free' : ''}`;
            btn.textContent = label;
            btn.addEventListener('click', () => {
                emconBtns.querySelectorAll('.doc-roe-btn').forEach(b => b.className = 'doc-roe-btn');
                btn.className = `doc-roe-btn ${state === 'Active' ? 'is-free' : state === 'Passive' ? 'is-tight' : 'is-hold'}`;
                sdkClient.dispatch({ type: 'SetEMCON', state });
            });
            emconBtns.appendChild(btn);
        }
        emconBlock.appendChild(emconBtns);
        this.element.appendChild(emconBlock);
    }

    private makeROELevel(label: string, initial: ROEState, onChange: (roe: ROEState) => void): HTMLElement {
        const block = this.el('div', 'doc-level');
        block.appendChild(this.el('div', 'doc-level__header', label));

        const btns = this.el('div', 'doc-roe-btns');
        const states: ROEState[] = ['Free', 'Tight', 'Hold'];
        for (const roe of states) {
            const btn = document.createElement('button');
            btn.className = `doc-roe-btn${roe === initial ? ` is-${roe.toLowerCase()}` : ''}`;
            btn.textContent = `Weapons ${roe}`;
            btn.addEventListener('click', () => {
                btns.querySelectorAll('.doc-roe-btn').forEach(b => b.className = 'doc-roe-btn');
                btn.className = `doc-roe-btn is-${roe.toLowerCase()}`;
                onChange(roe);
            });
            btns.appendChild(btn);
        }
        block.appendChild(btns);
        return block;
    }
}
