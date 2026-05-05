import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { MatchSelector } from '../../components/panels/MatchSelector';
import { Side } from '../../../sdk/schemas/domain.js';

export class MainMenu extends Component {
    constructor() { super('div', 'main-menu'); }

    protected styles() {
        return `
        .main-menu { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:var(--bg-base); gap:var(--sp-4); overflow-y: auto; padding: 40px 0; }
        .main-menu__title { font-family:var(--font-mono); font-size:2.5rem; font-weight:700; color:var(--color-friendly); text-shadow:var(--glow-friendly); letter-spacing:0.15em; text-transform:uppercase; }
        .main-menu__subtitle { font-size:var(--text-md); color:var(--text-muted); margin-top:calc(-1 * var(--sp-2)); }
        .main-menu__actions { display:flex; flex-direction:column; gap:var(--sp-2); margin-top:var(--sp-4); width:320px; }
        `;
    }

    protected render() {
        const title = this.el('div', 'main-menu__title', 'WAR·GAMES');
        const subtitle = this.el('div', 'main-menu__subtitle', 'Engine V3 — Tactical Simulation Platform');
        const actions = this.el('div', 'main-menu__actions');

        const buttons: [string, string, () => void][] = [
            ['▶  JOIN DEFAULT OPS', 'btn btn--primary', () => {
                UIStore.joinMatch(Side.Blue, 'default');
                UIStore.activeView.set('tactical');
            }],
            ['📦 Scenario Editor', 'btn btn--ghost', () => UIStore.activeView.set('scenarios')],
            ['📋 Mission Editor', 'btn btn--ghost', () => UIStore.activeView.set('missions')],
            ['🗃️ Profile Database (DB3000)', 'btn btn--ghost', () => UIStore.activeView.set('profiles')],
        ];

        for (const [text, cls, handler] of buttons) {
            const btn = document.createElement('button');
            btn.className = cls;
            btn.textContent = text;
            Object.assign(btn.style, { padding: '10px 24px', fontSize: 'var(--text-sm)', width: '100%' });
            btn.addEventListener('click', handler);
            actions.appendChild(btn);
        }

        const matchSelector = new MatchSelector();

        const footer = this.el('div', undefined, 'WGUI Framework · Zero VDOM · Signal Reactivity · PixiJS Renderer');
        Object.assign(footer.style, { marginTop: '48px', color: 'var(--text-dim)', fontSize: 'var(--text-xs)' });

        this.element.append(title, subtitle, actions);
        this.addChild(matchSelector);
        this.element.appendChild(footer);
    }
}
