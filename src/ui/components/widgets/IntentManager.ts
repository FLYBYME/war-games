import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * IntentManager: Orchestrates high-level unit and side behavior via Scenario Intents.
 */
export class IntentManager extends Component {
    private typeSelect!: HTMLSelectElement;
    private actorIdInput!: HTMLInputElement;
    private subtypeSelect!: HTMLSelectElement;
    private paramsContainer!: HTMLElement;
    private currentType: 'Mission' | 'Doctrine' | 'Group' = 'Mission';

    constructor() { super('div', 'intent-manager'); }

    protected styles() {
        return `
        .intent-manager { padding: var(--sp-3); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: var(--sp-3); }
        .intent-header { font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--sp-2); display: flex; justify-content: space-between; align-items: center; }
        .intent-field { margin-bottom: var(--sp-2); }
        .intent-label { display: block; font-size: var(--text-xs); color: var(--text-dim); margin-bottom: 2px; }
        .intent-input, .intent-select { width: 100%; background: var(--bg-base); border: 1px solid var(--border-color); color: var(--text-main); font-size: var(--text-sm); padding: 4px 8px; border-radius: var(--radius-sm); outline: none; }
        .intent-input:focus, .intent-select:focus { border-color: var(--color-friendly); }
        .intent-params { margin-top: var(--sp-2); padding: var(--sp-2); background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); }
        .intent-actions { margin-top: var(--sp-3); display: flex; gap: var(--sp-2); }
        .btn-apply { flex: 1; }
        `;
    }

    protected render() {
        const selectedId = UIStore.selectedEntityId.get() || '';

        const header = this.el('div', 'intent-header', 'INTENT DESIGNER');
        
        // Type Selection
        const typeField = this.el('div', 'intent-field');
        typeField.appendChild(this.el('label', 'intent-label', 'Type'));
        this.typeSelect = this.el('select', 'intent-select') as HTMLSelectElement;
        ['Mission', 'Doctrine', 'Group'].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            this.typeSelect.appendChild(opt);
        });
        this.typeSelect.value = this.currentType;
        this.typeSelect.addEventListener('change', () => {
            this.currentType = this.typeSelect.value as any;
            this.renderParams();
        });
        typeField.appendChild(this.typeSelect);

        // Actor ID
        const actorField = this.el('div', 'intent-field');
        actorField.appendChild(this.el('label', 'intent-label', 'Actor ID (Unit or Group)'));
        this.actorIdInput = this.el('input', 'intent-input') as HTMLInputElement;
        this.actorIdInput.value = selectedId;
        this.actorIdInput.placeholder = 'e.g. enterprise-1';
        actorField.appendChild(this.actorIdInput);

        this.paramsContainer = this.el('div', 'intent-params');
        
        const actions = this.el('div', 'intent-actions');
        const applyBtn = this.el('button', 'btn btn--primary btn--sm btn-apply', 'Apply Intent');
        applyBtn.addEventListener('click', () => this.applyIntent());
        actions.appendChild(applyBtn);

        this.element.append(header, typeField, actorField, this.paramsContainer, actions);
        this.renderParams();
    }

    private renderParams() {
        this.paramsContainer.innerHTML = '';
        
        if (this.currentType === 'Mission') {
            this.paramsContainer.appendChild(this.el('label', 'intent-label', 'Mission Type'));
            this.subtypeSelect = this.el('select', 'intent-select') as HTMLSelectElement;
            ['Patrol', 'Strike', 'ASW', 'Escort', 'VBSS', 'Minelaying', 'MCM', 'Idle'].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                this.subtypeSelect.appendChild(opt);
            });
            this.paramsContainer.appendChild(this.subtypeSelect);
            
            const hint = this.el('div', 'intent-label', 'Params: { ... } (JSON)');
            hint.style.marginTop = '8px';
            const paramsText = this.el('textarea', 'intent-input') as HTMLTextAreaElement;
            paramsText.value = '{\n  "speedKts": 20\n}';
            paramsText.style.height = '60px';
            paramsText.style.fontFamily = 'monospace';
            this.paramsContainer.append(hint, paramsText);
        } 
        else if (this.currentType === 'Doctrine') {
            this.paramsContainer.appendChild(this.el('label', 'intent-label', 'Rules of Engagement'));
            this.subtypeSelect = this.el('select', 'intent-select') as HTMLSelectElement;
            ['Free', 'Tight', 'Hold'].forEach(r => {
                const opt = document.createElement('option');
                opt.value = r;
                opt.textContent = r;
                this.subtypeSelect.appendChild(opt);
            });
            this.paramsContainer.appendChild(this.subtypeSelect);

            const emconLabel = this.el('label', 'intent-label', 'EMCON State');
            emconLabel.style.marginTop = '8px';
            this.paramsContainer.appendChild(emconLabel);
            const emconSelect = this.el('select', 'intent-select') as HTMLSelectElement;
            ['Alpha', 'Bravo', 'Charlie'].forEach(e => {
                const opt = document.createElement('option');
                opt.value = e;
                opt.textContent = e;
                emconSelect.appendChild(opt);
            });
            emconSelect.id = 'intent-emcon';
            this.paramsContainer.appendChild(emconSelect);
        }
        else if (this.currentType === 'Group') {
            this.paramsContainer.appendChild(this.el('label', 'intent-label', 'Group Members (CSV)'));
            const membersInput = this.el('input', 'intent-input') as HTMLInputElement;
            membersInput.id = 'intent-members';
            membersInput.placeholder = 'id1, id2, id3';
            this.paramsContainer.appendChild(membersInput);
        }
    }

    private applyIntent() {
        const actorId = this.actorIdInput.value;
        const type = this.currentType;

        let intent: any = { type, actorId };

        if (type === 'Mission') {
            const missionType = this.subtypeSelect.value;
            const paramsStr = (this.paramsContainer.querySelector('textarea') as HTMLTextAreaElement).value;
            try {
                const params = JSON.parse(paramsStr);
                intent = { ...intent, missionType, params };
            } catch (e) {
                alert('Invalid JSON in params');
                return;
            }
        } 
        else if (type === 'Doctrine') {
            const roe = this.subtypeSelect.value;
            const emcon = (this.paramsContainer.querySelector('#intent-emcon') as HTMLSelectElement).value;
            intent = { ...intent, roe, emcon };
        }
        else if (type === 'Group') {
            const members = (this.paramsContainer.querySelector('#intent-members') as HTMLInputElement).value.split(',').map(s => s.trim());
            intent = { ...intent, groupId: actorId, leaderId: actorId, members };
        }

        sdkClient.scenario.setIntent(intent);
        console.log('Applying Intent:', intent);
    }
}
