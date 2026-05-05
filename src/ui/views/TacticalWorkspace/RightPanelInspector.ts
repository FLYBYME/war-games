import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore, ViewUnit, ViewTrack, InspectorTab } from '../../framework/UIStore';
import { SpeedAltitudeSlider } from '../../components/widgets/SpeedAltitudeSlider';
import { WeaponAllocationMatrix } from '../../components/widgets/WeaponAllocationMatrix';
import { FormationEditor } from '../../components/widgets/FormationEditor';
import { EMCONMatrix } from '../../components/widgets/EMCONMatrix';
import { FlightPlanEditor } from '../../components/widgets/FlightPlanEditor';
import { TOTCalculator } from '../../components/widgets/TOTCalculator';
import { DetachableWindow } from '../../components/DetachableWindow';
import { IntentManager } from '../../components/widgets/IntentManager';

const TABS: { key: InspectorTab; label: string }[] = [
    { key: 'kinematics', label: 'KIN' },
    { key: 'sensors', label: 'SENS' },
    { key: 'weapons', label: 'WPNS' },
    { key: 'doctrine', label: 'ROE' },
    { key: 'damage', label: 'DMG' },
];

export class RightPanelInspector extends Component {
    private nameEl!: HTMLElement;
    private classEl!: HTMLElement;
    private hpBar!: HTMLElement;
    private headerBlock!: HTMLElement;
    private bodyEl!: HTMLElement;
    private tabEls: HTMLElement[] = [];
    private lastTrackId: string | null = null;
    private lastUnitId: string | null = null;
    private lastTab: InspectorTab | null = null;

    // Element references for telemetry updates
    private latEl?: HTMLElement;
    private lonEl?: HTMLElement;
    private altEl?: HTMLElement;
    private rotEl?: HTMLElement;
    private statusEl?: HTMLElement;

    constructor() { super('div', 'panel panel-right'); }

    protected styles() {
        return `
        .panel-right { overflow-y:auto; }
        .inspector__unit-header { padding:var(--sp-3); background:var(--bg-surface); border-bottom:1px solid var(--border-color); }
        .inspector__unit-name { font-size:var(--text-lg); font-weight:600; color:var(--text-bright); display:flex; justify-content:space-between; align-items:center; }
        .inspector__unit-class { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
        .hp-bar { height:4px; background:var(--bg-surface); border-radius:2px; margin-top:var(--sp-2); overflow:hidden; }
        .hp-bar__fill { height:100%; border-radius:2px; transition:width var(--transition-med),background var(--transition-med); }
        .inspector__field { display:flex; justify-content:space-between; align-items:center; padding:var(--sp-1) var(--sp-3); font-size:var(--text-sm); border-bottom:1px solid var(--border-color); }
        .inspector__label { color:var(--text-muted); font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.04em; }
        .inspector__value { font-family:var(--font-mono); color:var(--text-bright); font-size:var(--text-sm); }
        .empty-state { display:flex; align-items:center; justify-content:center; height:100%; font-size:var(--text-sm); color:var(--text-dim); font-style:italic; padding:var(--sp-4); }
        .insp-popout { font-size:var(--text-xs); cursor:pointer; color:var(--text-dim); padding:2px 6px; border:1px solid var(--border-color); border-radius:var(--radius-sm); }
        .insp-popout:hover { color:var(--text-main); border-color:var(--border-light); }
        `;
    }

    protected render() {
        const panelHeader = this.el('div', 'panel__header');
        panelHeader.appendChild(this.el('span', undefined, 'INSPECTOR'));
        const popoutBtn = this.el('button', 'insp-popout', '⧉ Pop');
        popoutBtn.addEventListener('click', () => {
            const newInspector = new RightPanelInspector();
            DetachableWindow.popOut(newInspector, 'Inspector', 400, 700);
        });
        panelHeader.appendChild(popoutBtn);

        this.headerBlock = this.el('div', 'inspector__unit-header');
        this.headerBlock.style.display = 'none';
        const nameRow = this.el('div', 'inspector__unit-name');
        this.nameEl = this.el('span', undefined, '—');
        nameRow.appendChild(this.nameEl);
        this.classEl = this.el('div', 'inspector__unit-class');
        const hpBarWrap = this.el('div', 'hp-bar');
        this.hpBar = this.el('div', 'hp-bar__fill');
        hpBarWrap.appendChild(this.hpBar);
        this.headerBlock.append(nameRow, this.classEl, hpBarWrap);

        const tabsRow = this.el('div', 'tabs');
        for (const t of TABS) {
            const tab = this.el('div', `tabs__tab${t.key === 'kinematics' ? ' is-active' : ''}`, t.label);
            tab.dataset.tab = t.key;
            tab.addEventListener('click', () => UIStore.inspectorTab.set(t.key));
            this.tabEls.push(tab);
            tabsRow.appendChild(tab);
        }

        this.bodyEl = this.el('div', 'panel__body');
        this.bodyEl.appendChild(this.el('div', 'empty-state', 'Select a unit'));

        this.element.append(panelHeader, this.headerBlock, tabsRow, this.bodyEl);
    }

    protected onMount() {
        this.subscribe(UIStore.inspectorTab, tab => {
            this.tabEls.forEach(t => t.classList.toggle('is-active', t.dataset.tab === tab));
            this.refresh();
        });
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
        this.subscribe(UIStore.viewState, () => this.refresh());
    }

    private refresh() {
        const entityId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        if (!entityId || !vs) {
            this.headerBlock.style.display = 'none';
            this.bodyEl.replaceChildren(this.el('div', 'empty-state', 'Select a unit'));
            return;
        }

        const unit = vs.units.find((u: ViewUnit) => u.id === entityId);
        const track = vs.tracks.find((t: ViewTrack) => t.id === entityId);

        if (unit) { 
            this.showHeader(unit.id, unit.side, unit.hp); 
            
            const currentTab = UIStore.inspectorTab.get();
            if (unit.id !== this.lastUnitId || currentTab !== this.lastTab) {
                this.renderUnitTab(unit); 
                this.lastUnitId = unit.id;
                this.lastTab = currentTab;
            } else {
                this.updateUnitTelemetry(unit);
            }
        }
        else if (track) { 
            this.lastTrackId = track.id;
            this.showHeader(track.id, track.classification || 'UNKNOWN', 0); 
            this.renderTrackTab(track); 
        }
        else { 
            this.headerBlock.style.display = 'none'; 
            this.bodyEl.replaceChildren(this.el('div', 'empty-state', 'Entity not found')); 
        }
    }

    private showHeader(name: string, cls: string, hp: number) {
        this.headerBlock.style.display = '';
        this.nameEl.textContent = name;
        this.classEl.textContent = cls;
        this.hpBar.style.width = `${hp}%`;
        this.hpBar.style.background = hp > 60 ? 'var(--accent-success)' : hp > 25 ? 'var(--accent-warning)' : 'var(--accent-danger)';
    }

    private renderUnitTab(u: ViewUnit) {
        const tab = UIStore.inspectorTab.get();
        const lla = u.lla || { lat: 0, lon: 0, alt: u.pos.z };

        // Unmount old widget children
        this.children.forEach(c => c.unmount());
        this.children = [];
        this.bodyEl.replaceChildren();

        switch (tab) {
            case 'kinematics':
                this.latEl = this.field('Latitude', lla.lat.toFixed(5) + '°');
                this.lonEl = this.field('Longitude', lla.lon.toFixed(5) + '°');
                this.altEl = this.field('Altitude', lla.alt.toFixed(0) + ' m');
                this.rotEl = this.field('Heading', u.rot.toFixed(1) + '°');
                this.statusEl = this.field('Status', u.isDestroyed ? '⛔ DESTROYED' : '✅ ACTIVE');

                this.bodyEl.append(
                    this.latEl,
                    this.lonEl,
                    this.altEl,
                    this.rotEl,
                    this.field('HP', u.hp + '%'),
                    this.statusEl,
                    this.field('MISSION', u.mission ? `${u.mission.type} (${u.mission.status})` : 'NONE')
                );
                this.addChild(new SpeedAltitudeSlider(), this.bodyEl);
                this.addChild(new FlightPlanEditor(), this.bodyEl);
                this.addChild(new FormationEditor(), this.bodyEl);
                this.addChild(new TOTCalculator(), this.bodyEl);
                break;

            case 'sensors':
                this.addChild(new EMCONMatrix(), this.bodyEl);
                break;

            case 'weapons':
                this.addChild(new WeaponAllocationMatrix(), this.bodyEl);
                this.bodyEl.appendChild(this.actionBtn('FIRE AT TARGET', () => {
                    sdkClient.dispatch({ type: 'FireWeapon', entityId: u.id, mountIndex: 0, targetId: this.lastTrackId || '' });
                }, true));
                break;

            case 'doctrine':
                this.bodyEl.append(
                    this.field('ROE', 'WEAPONS TIGHT'),
                    this.field('EMCON', 'ACTIVE'),
                    this.field('CURRENT MISSION', u.mission ? `${u.mission.type} (${u.mission.status})` : 'NONE')
                );
                const roeButtons: [string, string][] = [['Set Weapons Free', 'Free'], ['Set Weapons Tight', 'Tight'], ['Set Weapons Hold', 'Hold']];
                for (const [label, roe] of roeButtons) {
                    this.bodyEl.appendChild(this.actionBtn(label, () => {
                        sdkClient.dispatch({ type: 'SetUnitROE', entityId: u.id, roe });
                    }));
                }
                this.addChild(new IntentManager(), this.bodyEl);
                break;

            case 'damage':
                this.bodyEl.append(
                    this.field('Structural HP', u.hp + '%'),
                    this.field('Status', u.isDestroyed ? 'DESTROYED' : 'OPERATIONAL'),
                );
                break;
        }
    }

    private updateUnitTelemetry(u: ViewUnit) {
        const lla = u.lla || { lat: 0, lon: 0, alt: u.pos.z };
        if (this.latEl) this.latEl.querySelector('.inspector__value')!.textContent = lla.lat.toFixed(5) + '°';
        if (this.lonEl) this.lonEl.querySelector('.inspector__value')!.textContent = lla.lon.toFixed(5) + '°';
        if (this.altEl) this.altEl.querySelector('.inspector__value')!.textContent = lla.alt.toFixed(0) + ' m';
        if (this.rotEl) this.rotEl.querySelector('.inspector__value')!.textContent = u.rot.toFixed(1) + '°';
        if (this.statusEl) this.statusEl.querySelector('.inspector__value')!.textContent = u.isDestroyed ? '⛔ DESTROYED' : '✅ ACTIVE';
    }

    private renderTrackTab(t: ViewTrack) {
        this.children.forEach(c => c.unmount());
        this.children = [];
        this.bodyEl.replaceChildren();

        const lla = t.lla || { lat: 0, lon: 0, alt: t.pos.z };
        const speed = Math.sqrt(t.vel.x ** 2 + t.vel.y ** 2 + t.vel.z ** 2) * 1.94384;
        this.bodyEl.append(
            this.field('Classification', t.classification || 'UNKNOWN'),
            this.field('Latitude', lla.lat.toFixed(5) + '°'),
            this.field('Longitude', lla.lon.toFixed(5) + '°'),
            this.field('Altitude', lla.alt.toFixed(0) + ' m'),
            this.field('Speed', speed.toFixed(0) + ' kts'),
            this.field('CEP', t.cep.toFixed(0) + ' m'),
            this.field('Last Seen', 'Tick ' + t.lastSeen),
        );
    }

    private field(label: string, value: string): HTMLElement {
        const row = this.el('div', 'inspector__field');
        row.appendChild(this.el('span', 'inspector__label', label));
        row.appendChild(this.el('span', 'inspector__value', value));
        return row;
    }

    private actionBtn(text: string, handler: () => void, danger = false): HTMLElement {
        const wrap = this.el('div');
        wrap.style.padding = 'var(--sp-2) var(--sp-3)';
        const btn = document.createElement('button');
        btn.className = `btn ${danger ? 'btn--danger' : 'btn--ghost'} btn--sm`;
        btn.style.width = '100%';
        btn.textContent = text;
        btn.addEventListener('click', handler);
        wrap.appendChild(btn);
        return wrap;
    }
}
