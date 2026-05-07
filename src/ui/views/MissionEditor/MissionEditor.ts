import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { MissionType } from '../../../sdk/schemas/index.js';

/**
 * MissionEditor: High-level UI for scenario-wide tasking and group AI.
 */
export class MissionEditor extends Component {
    constructor() {
        super('div', 'mission-editor');
    }

    protected render(): void {
        const state = UIStore.viewState.get();
        const units = state?.units || [];
        const selectedId = UIStore.selectedEntityId.get();
        const unit = units.find(u => u.id === selectedId);

        this.element.innerHTML = `
            <div class="panel-header">Mission Planner</div>
            <div class="panel-content">
                ${unit ? this.renderUnitEditor(unit) : this.renderEmptyState()}
            </div>
        `;

        if (unit) {
            const btn = this.element.querySelector('.btn-primary') as HTMLButtonElement;
            this.listen(btn, 'click', () => {
                console.log('Applying mission...');
            });
        }
    }

    private renderEmptyState(): string {
        return `<div class="empty-message">Select a unit to assign missions</div>`;
    }

    private renderUnitEditor(unit: { id: string, status: string }): string {
        return `
            <div class="editor-section">
                <div class="label">Assigned Unit</div>
                <div class="value">${unit.id}</div>
            </div>
            <div class="editor-section">
                <div class="label">Current Status</div>
                <div class="value">${unit.status}</div>
            </div>
            <div class="editor-section">
                <div class="label">Mission Type</div>
                <select id="mission-type-select">
                    <option value="${MissionType.Idle}">Idle / No Mission</option>
                    <option value="${MissionType.Patrol}">Patrol Area</option>
                    <option value="${MissionType.Strike}">Strike Target</option>
                    <option value="${MissionType.ASW}">ASW Search</option>
                </select>
            </div>
            <button class="btn-primary">Apply Mission</button>
        `;
    }

    onMount(): void {
        this.subscribe(UIStore.viewState, () => this.render());
        this.subscribe(UIStore.selectedEntityId, () => this.render());
    }
}
