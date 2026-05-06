import { Component } from '../framework/Component';
import { UIStore, InspectorTab, ViewUnit } from '../framework/UIStore';
import { ListManager } from '../framework/ListManager';
import { TOTCalculator } from './management/TOTCalculator';
import { FormationEditor } from './management/FormationEditor';
import { SpeedAltitudeSlider } from './management/SpeedAltitudeSlider';
import { EMCONMatrix } from './management/EMCONMatrix';
import { WeaponAllocationMatrix } from './management/WeaponAllocationMatrix';
import { FlightPlanEditor } from './management/FlightPlanEditor';
import { DoctrineWindow } from './management/DoctrineWindow';
import { WRAWindow } from './management/WRAWindow';

/**
 * UnitInspector: Detailed information panel for the selected unit.
 * Features a tabbed interface for Kinematics, Sensors, Weapons, Routing, and Formation.
 */
export class UnitInspector extends Component {
    private headerArea: HTMLElement | null = null;
    private tabContainer: HTMLElement | null = null;
    private contentArea: HTMLElement | null = null;
    
    private kinematicsArea: HTMLElement | null = null;
    private sensorsArea: HTMLElement | null = null;
    private weaponsArea: HTMLElement | null = null;
    private routingArea: HTMLElement | null = null;
    private formationArea: HTMLElement | null = null;
    private doctrineArea: HTMLElement | null = null;
    private damageArea: HTMLElement | null = null;
    private damageBody: HTMLElement | null = null;

    private sensorListManager: ListManager<any> | null = null;
    private weaponListManager: ListManager<any> | null = null;
    
    // Command Widgets
    private speedAltSlider: SpeedAltitudeSlider | null = null;
    private emconMatrix: EMCONMatrix | null = null;
    private weaponMatrix: WeaponAllocationMatrix | null = null;
    private flightPlanEditor: FlightPlanEditor | null = null;
    private totCalculator: TOTCalculator | null = null;
    private formationEditor: FormationEditor | null = null;
    private doctrineWindow: DoctrineWindow | null = null;
    private wraWindow: WRAWindow | null = null;

    constructor() {
        super('div', 'unit-inspector', 'unit-inspector');
    }

    protected styles(): string {
        return `
            .unit-inspector {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                background: var(--bg-panel);
                border-left: 1px solid var(--border-color);
                font-size: var(--text-sm);
            }

            .inspector-header {
                padding: var(--sp-4);
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
            }
            .header-title {
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--text-bright);
                margin-bottom: 4px;
            }
            .header-subtitle {
                font-size: var(--text-xs);
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .inspector-tabs {
                display: flex;
                background: var(--bg-base);
                border-bottom: 1px solid var(--border-color);
                padding: 0 var(--sp-2);
                overflow-x: auto;
                scrollbar-width: none;
            }
            .inspector-tabs::-webkit-scrollbar { display: none; }

            .tab-btn {
                padding: var(--sp-3) var(--sp-3);
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--text-dim);
                font-size: var(--text-xs);
                font-weight: 600;
                cursor: pointer;
                text-transform: uppercase;
                transition: all var(--transition-fast);
                white-space: nowrap;
            }
            .tab-btn:hover { color: var(--text-muted); }
            .tab-btn.active {
                color: var(--color-friendly);
                border-bottom-color: var(--color-friendly);
            }

            .inspector-content {
                flex: 1;
                overflow-y: auto;
                padding: var(--sp-3);
                display: flex;
                flex-direction: column;
                gap: var(--sp-4);
            }

            .inspector-section {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .section-header {
                background: rgba(255,255,255,0.03);
                padding: var(--sp-2) var(--sp-3);
                font-size: var(--text-xs);
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1px solid var(--border-color);
            }
            .section-body {
                padding: var(--sp-3);
                display: flex;
                flex-direction: column;
                gap: var(--sp-2);
            }
            
            .data-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
                font-size: var(--text-xs);
            }
            .data-label { color: var(--text-dim); }
            .data-value { color: var(--text-main); font-family: var(--font-mono); }
            .data-value.active { color: var(--accent-success); }

            .empty-state {
                padding: var(--sp-4);
                text-align: center;
                color: var(--text-dim);
                font-style: italic;
                font-size: var(--text-xs);
            }
            
            .widget-separator {
                height: 1px;
                background: var(--border-color);
                margin: var(--sp-2) 0;
            }
        `;
    }

    protected render(): void {
        this.headerArea = this.el('div', 'inspector-header');
        this.tabContainer = this.el('div', 'inspector-tabs');
        this.contentArea = this.el('div', 'inspector-content');

        this.element.appendChild(this.headerArea);
        this.element.appendChild(this.tabContainer);
        this.element.appendChild(this.contentArea);

        this.renderTabs();
        this.initSections();

        // Subscribe to state
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
        this.subscribe(UIStore.viewState, () => this.refreshContent());
        this.subscribe(UIStore.inspectorTab, () => {
            this.renderTabs();
            this.updateTabVisibility();
        });
    }

    private renderTabs() {
        if (!this.tabContainer) return;
        this.tabContainer.innerHTML = '';
        
        const tabs: InspectorTab[] = ['Kinematics', 'Sensors', 'Weapons', 'Routing', 'Formation'];
        const currentTab = UIStore.inspectorTab.get();

        tabs.forEach(tab => {
            const btn = this.el('button', `tab-btn ${currentTab === tab ? 'active' : ''}`, tab);
            btn.onclick = () => UIStore.inspectorTab.set(tab);
            this.tabContainer!.appendChild(btn);
        });
    }

    private initSections() {
        if (!this.contentArea) return;
        
        // --- Kinematics Tab ---
        this.kinematicsArea = this.el('div', 'tab-pane kinematics-pane');
        const kDataSec = this.createSection('Telemetry');
        this.kinematicsArea.appendChild(kDataSec.el);
        
        this.speedAltSlider = new SpeedAltitudeSlider();
        this.kinematicsArea.appendChild(this.speedAltSlider.element);
        this.contentArea.appendChild(this.kinematicsArea);

        // --- Sensors Tab ---
        this.sensorsArea = this.el('div', 'tab-pane sensors-pane');
        this.emconMatrix = new EMCONMatrix();
        this.sensorsArea.appendChild(this.emconMatrix.element);
        
        const sListSec = this.createSection('Detection History');
        this.sensorsArea.appendChild(sListSec.el);
        this.sensorListManager = new ListManager({
            container: sListSec.body,
            keySelector: (s) => s.name || s.id,
            renderItem: (s) => this.row(s.name || s.id, s.active ? 'ACTIVE' : 'OFF'),
            updateItem: (s, el) => {
                const val = el.querySelector('.data-value')!;
                val.textContent = s.active ? 'ACTIVE' : 'OFF';
                val.className = s.active ? 'data-value active' : 'data-value';
            }
        });
        this.contentArea.appendChild(this.sensorsArea);

        // --- Weapons Tab ---
        this.weaponsArea = this.el('div', 'tab-pane weapons-pane');
        this.weaponMatrix = new WeaponAllocationMatrix();
        this.weaponsArea.appendChild(this.weaponMatrix.element);

        const wListSec = this.createSection('Magazine Status');
        this.weaponsArea.appendChild(wListSec.el);
        this.weaponListManager = new ListManager({
            container: wListSec.body,
            keySelector: (m) => m.id || m.type,
            renderItem: (m) => this.row(m.type, `${m.roundsRemaining} rds`),
            updateItem: (m, el) => {
                el.querySelector('.data-value')!.textContent = `${m.roundsRemaining} rds`;
            }
        });
        this.contentArea.appendChild(this.weaponsArea);

        // --- Routing Tab ---
        this.routingArea = this.el('div', 'tab-pane routing-pane');
        this.flightPlanEditor = new FlightPlanEditor();
        this.routingArea.appendChild(this.flightPlanEditor.element);
        
        this.totCalculator = new TOTCalculator();
        this.routingArea.appendChild(this.totCalculator.element);
        this.contentArea.appendChild(this.routingArea);

        // --- Formation Tab ---
        this.formationArea = this.el('div', 'tab-pane formation-pane');
        this.formationEditor = new FormationEditor();
        this.formationArea.appendChild(this.formationEditor.element);
        this.contentArea.appendChild(this.formationArea);

        this.updateTabVisibility();
    }

    private updateTabVisibility() {
        const tab = UIStore.inspectorTab.get();
        if (this.kinematicsArea) this.kinematicsArea.style.display = tab === 'Kinematics' ? 'flex' : 'none';
        if (this.sensorsArea) this.sensorsArea.style.display = tab === 'Sensors' ? 'flex' : 'none';
        if (this.weaponsArea) this.weaponsArea.style.display = tab === 'Weapons' ? 'flex' : 'none';
        if (this.routingArea) this.routingArea.style.display = tab === 'Routing' ? 'flex' : 'none';
        if (this.formationArea) this.formationArea.style.display = tab === 'Formation' ? 'flex' : 'none';
    }

    private createSection(title: string) {
        const el = this.el('div', 'inspector-section');
        const header = this.el('div', 'section-header', title);
        const body = this.el('div', 'section-body');
        el.appendChild(header);
        el.appendChild(body);
        return { el, body };
    }

    private refresh() {
        this.refreshHeader();
        this.refreshContent();
    }

    private refreshHeader() {
        if (!this.headerArea) return;
        const selectedId = UIStore.selectedEntityId.get();
        if (!selectedId) {
            this.headerArea.innerHTML = '<div class="header-title">NO SELECTION</div>';
            return;
        }

        const vs = UIStore.viewState.get();
        const unit = vs?.units.find(u => u.id === selectedId);
        const track = vs?.tracks.find(t => t.id === selectedId);
        
        if (unit) {
            this.headerArea.innerHTML = `
                <div class="header-title">${selectedId}</div>
                <div class="header-subtitle">${unit.profileId || 'UNIT'} • ${unit.side}</div>
            `;
        } else if (track) {
            this.headerArea.innerHTML = `
                <div class="header-title">${selectedId}</div>
                <div class="header-subtitle">CONTACT TRACK [${track.classification}]</div>
            `;
        }
    }

    private refreshContent() {
        if (!this.contentArea) return;
        const selectedId = UIStore.selectedEntityId.get();
        if (!selectedId) {
            this.contentArea.style.display = 'none';
            return;
        }
        this.contentArea.style.display = 'flex';

        const vs = UIStore.viewState.get();
        const unit = vs?.units.find(u => u.id === selectedId);
        
        if (!unit) {
            // Track view only shows kinematics data
            const track = vs?.tracks.find(t => t.id === selectedId);
            if (track && this.kinematicsArea) {
                const body = this.kinematicsArea.querySelector('.section-body')!;
                body.innerHTML = `
                    <div class="data-row"><span class="data-label">Type</span><span class="data-value">${track.classification}</span></div>
                    <div class="data-row"><span class="data-label">Altitude</span><span class="data-value">${Math.round(track.pos.z)} m</span></div>
                    <div class="data-row"><span class="data-label">Speed</span><span class="data-value">${Math.round(track.speedKts || 0)} kts</span></div>
                `;
            }
            return;
        }

        this.updateKinematics(unit);
        this.updateSensors(unit);
        this.updateWeapons(unit);
        this.updateDamage(unit);
    }

    private updateDamage(unit: ViewUnit) {
        if (!this.damageBody) return;
        this.damageBody.innerHTML = '';
        
        // Overall Hull Integrity
        const hullRow = this.el('div', 'data-row');
        hullRow.appendChild(this.el('span', 'data-label', 'Hull Integrity'));
        const hullVal = this.el('span', `data-value ${unit.hp > 80 ? 'active' : unit.hp > 30 ? 'warn' : 'danger'}`, `${Math.round(unit.hp)}%`);
        hullRow.appendChild(hullVal);
        this.damageBody.appendChild(hullRow);

        this.damageBody.appendChild(this.el('div', 'widget-separator'));

        // Sub-systems (From SDK ViewUnitPayload)
        // Note: SDK currently doesn't have a specific sub-systems health list in ViewUnitPayload, 
        // but we can infer some from sensors/mounts or use a placeholder if not present.
        if ((unit as any).systems) {
            (unit as any).systems.forEach((s: any) => {
                const row = this.el('div', 'data-row');
                row.appendChild(this.el('span', 'data-label', s.name));
                const status = s.health > 0 ? 'OPERATIONAL' : 'DESTROYED';
                const val = this.el('span', `data-value ${s.health > 0 ? 'active' : 'danger'}`, status);
                row.appendChild(val);
                this.damageBody.appendChild(row);
            });
        } else {
            this.damageBody.appendChild(this.el('div', 'empty-state', 'Detailed subsystem telemetry unavailable.'));
        }
    }

    private updateKinematics(unit: ViewUnit) {
        if (!this.kinematicsArea) return;
        const body = this.kinematicsArea.querySelector('.section-body')!;
        body.innerHTML = `
            <div class="data-row"><span class="data-label">Altitude</span><span class="data-value">${Math.round(unit.pos.z)} m</span></div>
            <div class="data-row"><span class="data-label">Heading</span><span class="data-value">${Math.round(unit.rot)}°</span></div>
            <div class="data-row"><span class="data-label">Fuel</span><span class="data-value">${Math.round(unit.fuelPct)}%</span></div>
            <div class="data-row"><span class="data-label">Status</span><span class="data-value">${unit.logState}</span></div>
        `;
    }

    private updateSensors(unit: ViewUnit) {
        if (this.sensorListManager && unit.sensors) {
            this.sensorListManager.sync(unit.sensors);
        }
    }

    private updateWeapons(unit: ViewUnit) {
        if (this.weaponListManager && unit.mounts) {
            this.weaponListManager.sync(unit.mounts);
        }
    }

    private row(label: string, value: string): HTMLElement {
        const r = this.el('div', 'data-row');
        r.appendChild(this.el('span', 'data-label', label));
        r.appendChild(this.el('span', 'data-value', value));
        return r;
    }
}
