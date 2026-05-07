import { Component } from '../framework/Component';
import { UIStore } from '../framework/UIStore';
import { ViewUnitPayload, ViewTrackPayload } from '../../sdk/schemas';


/**
 * UnitInspector: Detailed drill-down for a selected entity or track.
 * Displays kinematics, sensor state, and combat readiness.
 */
export class UnitInspector extends Component {
    private kinArea: HTMLElement | null = null;
    private combatArea: HTMLElement | null = null;
    private sensorArea: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;

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
            }

            .inspector-header {
                padding: var(--sp-4);
                border-bottom: 1px solid var(--border-color);
                background: var(--bg-header);
            }
            .inspector-id {
                font-family: var(--font-mono);
                font-size: var(--text-lg);
                font-weight: 700;
                color: var(--text-main);
            }
            .inspector-class {
                font-size: var(--text-xs);
                color: var(--text-muted);
                text-transform: uppercase;
                margin-top: 2px;
            }

            .inspector-content {
                flex: 1;
                overflow-y: auto;
                padding: var(--sp-4);
                display: flex;
                flex-direction: column;
                gap: var(--sp-6);
            }

            .inspector-section {
                display: flex;
                flex-direction: column;
                gap: var(--sp-3);
            }
            .section-title {
                font-size: var(--text-xs);
                font-weight: 600;
                color: var(--text-dim);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 4px;
            }

            .kinematics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--sp-4);
            }
            .stat-box {
                display: flex;
                flex-direction: column;
            }
            .stat-label { font-size: 10px; color: var(--text-muted); }
            .stat-value { font-size: 14px; font-weight: 500; font-family: var(--font-mono); }

            .mount-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--sp-2) 0;
                font-size: var(--text-sm);
            }
            .mount-status {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--accent-success);
            }
            .mount-status.busy { background: var(--accent-warning); }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'inspector-header');
        this.titleEl = this.el('div', 'inspector-id', 'NO SELECTION');
        const sub = this.el('div', 'inspector-class', 'Select a unit to inspect');
        header.appendChild(this.titleEl);
        header.appendChild(sub);

        const content = this.el('div', 'inspector-content');
        this.kinArea = this.el('div', 'inspector-section');
        this.combatArea = this.el('div', 'inspector-section');
        this.sensorArea = this.el('div', 'inspector-section');

        content.appendChild(this.kinArea);
        content.appendChild(this.combatArea);
        content.appendChild(this.sensorArea);

        this.element.appendChild(header);
        this.element.appendChild(content);

        // Update on viewState or selection change
        this.subscribe(UIStore.viewState, () => this.sync());
        this.subscribe(UIStore.selectedEntityId, () => this.sync());
    }

    private sync() {
        const entity = UIStore.getSelectedEntity();
        if (!entity || !this.titleEl || !this.kinArea || !this.combatArea || !this.sensorArea) {
            if (this.titleEl) this.titleEl.textContent = 'NO SELECTION';
            return;
        }

        this.titleEl.textContent = entity.id;
        
        // Kinematics
        this.renderKinematics(entity);
        
        // Combat
        if ('mounts' in entity) {
            this.renderCombat(entity);
        } else {
            this.combatArea.innerHTML = '';
        }

        // Sensors
        if ('sensors' in entity) {
            this.renderSensors(entity);
        } else {
            this.sensorArea.innerHTML = '';
        }
    }

    private renderKinematics(entity: ViewUnitPayload | ViewTrackPayload) {
        if (!this.kinArea) return;
        const hdg = ('heading' in entity ? (entity as any).heading : 0) as number;
        const speed = ('speedKts' in entity ? (entity as any).speedKts : 0) as number;

        this.kinArea.innerHTML = `
            <div class="section-title">Kinematics</div>
            <div class="kinematics-grid">
                <div class="stat-box">
                    <span class="stat-label">HEADING</span>
                    <span class="stat-value">${Math.round(hdg || 0)}°</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">SPEED</span>
                    <span class="stat-value">${Math.round(speed || 0)} KTS</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">ALTITUDE</span>
                    <span class="stat-value">${Math.round(entity.pos.z)} M</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">POSITION</span>
                    <span class="stat-value">${Math.round(entity.pos.x)}, ${Math.round(entity.pos.y)}</span>
                </div>
            </div>
        `;
    }

    private renderCombat(unit: ViewUnitPayload) {
        if (!this.combatArea) return;
        this.combatArea.innerHTML = `<div class="section-title">Combat Systems</div>`;
        
        unit.mounts.forEach(m => {
            const el = this.el('div', 'mount-item');
            el.innerHTML = `
                <span>${m.type}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10px; color: var(--text-dim);">${m.roundsRemaining} RDS</span>
                    <div class="mount-status ${m.roundsRemaining === 0 ? 'busy' : ''}"></div>
                </div>
            `;
            this.combatArea!.appendChild(el);
        });
    }

    private renderSensors(unit: ViewUnitPayload) {
        if (!this.sensorArea) return;
        this.sensorArea.innerHTML = `<div class="section-title">Sensors</div>`;
        
        unit.sensors.forEach(s => {
            const el = this.el('div', 'mount-item');
            el.innerHTML = `
                <span>${s.name}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10px; color: ${s.active ? 'var(--color-friendly)' : 'var(--text-dim)'};">
                        ${s.active ? 'ACTIVE' : 'SILENT'}
                    </span>
                </div>
            `;
            this.sensorArea!.appendChild(el);
        });
    }
}
