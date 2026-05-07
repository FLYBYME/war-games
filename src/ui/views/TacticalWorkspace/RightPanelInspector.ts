import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { UnitInspector } from '../../components/UnitInspector';
import { ContactTable } from '../../components/panels/ContactTable';
import { MatchSelector } from '../../components/panels/MatchSelector';

/**
 * RightPanelInspector: Multi-mode sidebar for selection details and management.
 */
export class RightPanelInspector extends Component {
    private mode: 'unit' | 'contacts' | 'system' = 'unit';

    constructor() {
        super('div', 'right-panel');
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="panel-tabs">
                <button class="${this.mode === 'unit' ? 'active' : ''}" data-mode="unit">Unit</button>
                <button class="${this.mode === 'contacts' ? 'active' : ''}" data-mode="contacts">Contacts</button>
                <button class="${this.mode === 'system' ? 'active' : ''}" data-mode="system">System</button>
            </div>
            <div class="panel-body" id="inspector-body"></div>
        `;

        const body = this.element.querySelector('#inspector-body') as HTMLElement;
        this.renderActiveMode(body);

        this.element.querySelectorAll('.panel-tabs button').forEach(btn => {
            this.listen(btn as HTMLElement, 'click', () => {
                this.mode = btn.getAttribute('data-mode') as unknown as string;
                this.render();
            });
        });
    }

    private renderActiveMode(container: HTMLElement): void {
        container.innerHTML = '';
        switch (this.mode) {
            case 'unit': {
                const inspector = new UnitInspector();
                this.addChild(inspector, container);
                break;
            }
            case 'contacts': {
                const table = new ContactTable();
                this.addChild(table, container);
                break;
            }
            case 'system': {
                const selector = new MatchSelector();
                this.addChild(selector, container);
                break;
            }
        }
    }

    onMount(): void {
        this.subscribe(UIStore.selectedEntityId, () => this.render());
    }
}
