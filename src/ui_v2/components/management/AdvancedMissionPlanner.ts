import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * AdvancedMissionPlanner: A sophisticated tool for defining CAP, Strike, and Patrol missions.
 */
export class AdvancedMissionPlanner extends Component {
    private missionType: string = 'CAP';
    private configArea!: HTMLElement;

    constructor() {
        super('div', 'mission-planner-adv');
    }

    protected styles(): string {
        return `
            .mission-planner-adv { padding: var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-4); height: 100%; box-sizing: border-box; }
            .mp-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: var(--sp-3); }
            .mp-title { font-size: var(--text-md); font-weight: 700; color: var(--color-friendly); text-transform: uppercase; letter-spacing: 0.05em; }
            .mp-type-selector { display: flex; gap: var(--sp-1); background: var(--bg-base); padding: 2px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
            .type-btn { padding: 4px 10px; font-size: 10px; font-weight: 600; cursor: pointer; border-radius: 2px; transition: all 0.1s; color: var(--text-dim); }
            .type-btn:hover { color: var(--text-main); }
            .type-btn.active { background: var(--color-friendly); color: #000; }

            .mp-config-section { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--sp-3); }
            .mp-section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); }
            .mp-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
            .mp-label { font-size: var(--text-xs); color: var(--text-main); }
            .mp-input { background: var(--bg-base); border: 1px solid var(--border-color); color: var(--color-friendly); padding: 4px 8px; border-radius: 2px; font-family: var(--font-mono); font-size: 11px; width: 80px; text-align: right; }

            .mp-footer { margin-top: auto; padding-top: var(--sp-4); display: flex; gap: var(--sp-2); }
            .btn-create { flex: 1; background: var(--color-friendly); color: #000; border: none; padding: 10px; border-radius: var(--radius-sm); font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 11px; }
            .btn-cancel { flex: 0.5; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; text-transform: uppercase; font-size: 11px; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = '';
        
        const header = this.el('div', 'mp-header');
        header.appendChild(this.el('div', 'mp-title', 'MISSION DESIGNER'));
        
        const selector = this.el('div', 'mp-type-selector');
        ['CAP', 'STRIKE', 'ASW', 'AEW'].forEach(type => {
            const btn = this.el('div', `type-btn ${this.missionType === type ? 'active' : ''}`, type);
            btn.onclick = () => {
                this.missionType = type;
                this.render();
            };
            selector.appendChild(btn);
        });
        header.appendChild(selector);

        this.configArea = this.el('div', 'mp-config-area');
        this.renderConfig();

        const footer = this.el('div', 'mp-footer');
        const createBtn = this.el('button', 'btn-create', 'CREATE MISSION');
        createBtn.onclick = () => this.createMission();
        const cancelBtn = this.el('button', 'btn-cancel', 'CANCEL');
        
        footer.appendChild(cancelBtn);
        footer.appendChild(createBtn);

        this.element.appendChild(header);
        this.element.appendChild(this.configArea);
        this.element.appendChild(footer);
    }

    private renderConfig() {
        this.configArea.innerHTML = '';
        
        const general = this.el('div', 'mp-config-section');
        general.appendChild(this.el('div', 'mp-section-label', 'General Parameters'));
        general.appendChild(this.createRow('On-Station Min', '2 units'));
        general.appendChild(this.createRow('BINGO Logic', 'RTB @ 15%'));
        general.appendChild(this.createRow('EMCON', 'A-SILENT'));
        this.configArea.appendChild(general);

        const specific = this.el('div', 'mp-config-section', '', 'specific-config');
        specific.style.marginTop = '16px';
        
        if (this.missionType === 'CAP') {
            specific.appendChild(this.el('div', 'mp-section-label', 'Patrol Orbit'));
            specific.appendChild(this.createRow('Radius', '50 nm', true));
            specific.appendChild(this.createRow('Min Alt', '8,000 m', true));
            specific.appendChild(this.createRow('Max Alt', '12,000 m', true));
        } else if (this.missionType === 'STRIKE') {
            specific.appendChild(this.el('div', 'mp-section-label', 'Strike Profile'));
            specific.appendChild(this.createRow('Ingress Speed', '450 kts', true));
            specific.appendChild(this.createRow('Strike Alt', '150 m', true));
            specific.appendChild(this.createRow('Escort Dist', '10 nm', true));
        }

        this.configArea.appendChild(specific);
    }

    private createRow(label: string, value: string, editable = false): HTMLElement {
        const row = this.el('div', 'mp-row');
        row.appendChild(this.el('span', 'mp-label', label));
        if (editable) {
            const input = document.createElement('input');
            input.className = 'mp-input';
            input.value = value;
            row.appendChild(input);
        } else {
            row.appendChild(this.el('span', 'mp-value', value));
        }
        return row;
    }

    private createMission() {
        const selectedId = UIStore.selectedEntityId.get();
        if (!selectedId) {
            alert('Select units to assign to the new mission.');
            return;
        }

        UIStore.client.dispatch({
            type: 'SetMission',
            entityId: selectedId,
            missionType: this.missionType,
            params: {
                // In a real impl we'd pull from inputs
                onStationMin: 2,
                autoRTB: true
            }
        } as any);

        alert(`Mission ${this.missionType} Created!`);
    }
}
