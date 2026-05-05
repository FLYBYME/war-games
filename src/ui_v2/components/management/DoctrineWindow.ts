import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

type ROEState = 'Free' | 'Tight' | 'Hold';

/**
 * DoctrineWindow: Global, mission, and unit-level ROE control.
 * Ported to V2 WindowManager architecture.
 */
export class DoctrineWindow extends Component {
    constructor() { super('div', 'doctrine-widget'); }

    protected styles() {
        return `
        .doctrine-widget { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-3); }
        .doc-level { padding: var(--sp-2); background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); }
        .doc-level__header { font-size: var(--text-xs); color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .doc-roe-btns { display: flex; gap: var(--sp-1); }
        .doc-roe-btn { flex: 1; padding: var(--sp-1) var(--sp-2); font-size: var(--text-xs); font-weight: 600; text-align: center; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all var(--transition-fast); color: var(--text-dim); background: var(--bg-panel); }
        .doc-roe-btn:hover { border-color: var(--border-light); color: var(--text-main); }
        .doc-roe-btn.is-free { background: rgba(48, 209, 88, 0.15); border-color: var(--color-neutral); color: var(--color-neutral); }
        .doc-roe-btn.is-tight { background: rgba(255, 214, 10, 0.15); border-color: var(--color-unknown); color: var(--color-unknown); }
        .doc-roe-btn.is-hold { background: rgba(255, 45, 85, 0.15); border-color: var(--color-hostile); color: var(--color-hostile); }
        `;
    }

    protected render() {
        this.element.innerHTML = '';

        // Global ROE
        this.element.appendChild(this.makeROELevel('Global ROE', 'Tight', (roe) => {
            if (UIStore.client) UIStore.client.dispatch({ type: 'SetGlobalROE', roe } as any);
        }));

        // Mission ROE
        this.element.appendChild(this.makeROELevel('Mission ROE', 'Tight', (roe) => {
            const id = UIStore.selectedEntityId.get();
            if (id && UIStore.client) UIStore.client.dispatch({ type: 'SetMissionROE', roe } as any);
        }));

        // Unit ROE
        this.element.appendChild(this.makeROELevel('Selected Unit ROE', 'Tight', (roe) => {
            const id = UIStore.selectedEntityId.get();
            if (id && UIStore.client) UIStore.client.dispatch({ type: 'SetUnitROE', entityId: id, roe } as any);
        }));

        // EMCON presets
        const emconBlock = this.el('div', 'doc-level');
        emconBlock.appendChild(this.el('div', 'doc-level__header', 'Global EMCON Profile'));
        const emconBtns = this.el('div', 'doc-roe-btns');
        const emconStates: [string, string][] = [['Alpha (Silent)', 'Silent'], ['Bravo (ESM Only)', 'Passive'], ['Charlie (Active)', 'Active']];
        
        for (const [label, state] of emconStates) {
            const btn = document.createElement('button');
            btn.className = `doc-roe-btn${state === 'Active' ? ' is-free' : ''}`;
            btn.textContent = label;
            btn.addEventListener('click', () => {
                emconBtns.querySelectorAll('.doc-roe-btn').forEach(b => b.className = 'doc-roe-btn');
                btn.className = `doc-roe-btn ${state === 'Active' ? 'is-free' : state === 'Passive' ? 'is-tight' : 'is-hold'}`;
                if (UIStore.client) UIStore.client.dispatch({ type: 'SetEMCON', state } as any);
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
