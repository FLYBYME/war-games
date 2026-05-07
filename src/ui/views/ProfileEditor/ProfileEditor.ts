import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { EntityProfile } from '../../../sdk/schemas/index.js';

/**
 * ProfileEditor: UI for modifying platform specifications.
 */
export class ProfileEditor extends Component {
    private profiles: EntityProfile[] = [];

    constructor() {
        super('div', 'profile-editor');
    }

    protected render(): void {
        const state = UIStore.viewState.get();
        this.element.innerHTML = `
            <div class="panel-header">Platform Database Browser</div>
            <div class="panel-content">
                <div class="search-bar">
                    <input type="text" placeholder="Search platforms..." id="profile-search-input">
                </div>
                <div class="profile-list" id="profile-list-container">
                    ${this.profiles.map(p => this.renderProfileRow(p, state as unknown as Record<string, unknown>)).join('')}
                </div>
            </div>
        `;

        const searchInput = this.element.querySelector('#profile-search-input') as HTMLInputElement;
        this.listen(searchInput, 'input', () => {
            console.log('Searching for:', searchInput.value);
        });
    }

    private renderProfileRow(p: EntityProfile, state: unknown): string {
        const stateRecord = state as Record<string, unknown> | null | undefined;
        const isSelected = stateRecord?.selectedProfileId === p.platformClass;
        return `
            <div class="profile-row ${isSelected ? 'selected' : ''}" onclick="this.dispatchEvent(new CustomEvent('select-profile', {detail: '${p.platformClass}'}))">
                <div class="name">${p.variantName}</div>
                <div class="meta">${p.platformClass} • ${p.type}</div>
            </div>
        `;
    }

    onMount(): void {
        this.fetchProfiles();
    }

    private async fetchProfiles() {
        try {
            const resp = await fetch('/api/matches/profiles');
            const data = await resp.json() as { units: [string, EntityProfile][] };
            this.profiles = data.units.map(u => u[1]);
            this.render();
        } catch (e) {
            console.error('Failed to fetch profiles', e);
        }
    }
}
