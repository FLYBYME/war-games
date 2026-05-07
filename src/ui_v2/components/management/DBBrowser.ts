import { Component } from '../../framework/Component';
import { EntityProfile } from '../../../sdk/schemas';

/**
 * DBBrowser: View and search the global platform database (DB3000).
 */
export class DBBrowser extends Component {
    private searchInput!: HTMLInputElement;
    private listEl!: HTMLElement;
    private detailEl!: HTMLElement;
    private profiles: EntityProfile[] = [];

    constructor() {
        super('div', 'db-browser', 'db-browser');
    }

    protected styles(): string {
        return `
            .db-browser {
                display: flex;
                height: 100%;
                background: #111;
                color: #ddd;
                border: 1px solid #333;
            }
            .db-sidebar {
                width: 300px;
                border-right: 1px solid #333;
                display: flex;
                flex-direction: column;
            }
            .db-search {
                padding: 10px;
                border-bottom: 1px solid #333;
            }
            .db-search input {
                width: 100%;
                background: #000;
                border: 1px solid #444;
                color: #fff;
                padding: 4px 8px;
                font-size: 12px;
            }
            .db-list {
                flex: 1;
                overflow-y: auto;
            }
            .db-item {
                padding: 8px 12px;
                border-bottom: 1px solid #222;
                cursor: pointer;
                font-size: 12px;
            }
            .db-item:hover { background: #222; }
            .db-item.selected { background: #00d1ff22; border-left: 3px solid #00d1ff; }
            .db-item-class { font-size: 10px; color: #666; text-transform: uppercase; }

            .db-detail {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            .detail-title { font-size: 18px; font-weight: bold; color: #00d1ff; margin-bottom: 4px; }
            .detail-class { font-size: 12px; color: #888; margin-bottom: 20px; }
            .spec-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            .spec-box { border: 1px solid #222; padding: 10px; background: #0c0c0c; }
            .spec-label { font-size: 10px; color: #555; text-transform: uppercase; }
            .spec-value { font-size: 14px; color: #ccc; margin-top: 2px; }
        `;
    }

    protected render(): void {
        const sidebar = this.el('div', 'db-sidebar');
        const search = this.el('div', 'db-search');
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search Database...';
        search.appendChild(this.searchInput);

        this.listEl = this.el('div', 'db-list');
        sidebar.appendChild(search);
        sidebar.appendChild(this.listEl);

        this.detailEl = this.el('div', 'db-detail');
        this.detailEl.innerHTML = '<div style="color: #444; text-align: center; margin-top: 100px;">Select a platform to view specifications</div>';

        this.element.appendChild(sidebar);
        this.element.appendChild(this.detailEl);

        this.listen(this.searchInput, 'input', () => this.syncList());
    }

    protected onMount(): void {
        this.fetchData();
    }

    private async fetchData() {
        try {
            const resp = await fetch('/api/matches/profiles');
            const data = await resp.json() as { units: [string, EntityProfile][] };
            this.profiles = data.units.map(u => u[1]);
            this.syncList();
        } catch (e) {
            console.error('Failed to fetch database', e);
        }
    }

    private syncList() {
        const term = this.searchInput.value.toLowerCase();
        const filtered = this.profiles.filter(p => 
            p.variantName?.toLowerCase().includes(term) || 
            p.platformClass?.toLowerCase().includes(term)
        );

        this.listEl.innerHTML = '';
        filtered.forEach(p => {
            const item = this.el('div', 'db-item');
            item.appendChild(this.el('div', 'db-item-name', p.variantName || 'Unknown'));
            item.appendChild(this.el('div', 'db-item-class', p.platformClass || 'Unknown Class'));
            
            this.listen(item, 'click', () => {
                this.listEl.querySelectorAll('.db-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.showDetail(p);
            });
            this.listEl.appendChild(item);
        });
    }

    private showDetail(p: EntityProfile) {
        this.detailEl.innerHTML = `
            <div class="detail-title">${p.variantName}</div>
            <div class="detail-class">${p.platformClass} • ${p.type}</div>
            
            <div class="spec-grid">
                <div class="spec-box">
                    <div class="spec-label">Empty Mass</div>
                    <div class="spec-value">${p.kinematics?.massEmptyKg || 'N/A'} kg</div>
                </div>
                <div class="spec-box">
                    <div class="spec-label">Max Speed</div>
                    <div class="spec-value">${p.kinematics?.maxSpeedKts || 'N/A'} KTS</div>
                </div>
                <div class="spec-box">
                    <div class="spec-label">Cruise Speed</div>
                    <div class="spec-value">${p.kinematics?.cruiseSpeedKts || 'N/A'} KTS</div>
                </div>
                <div class="spec-box">
                    <div class="spec-label">Sensors</div>
                    <div class="spec-value">${p.sensors?.length || 0} mounted</div>
                </div>
            </div>

            <div style="margin-top: 30px;">
                <div class="spec-label" style="margin-bottom: 10px;">Combat Capabilities</div>
                ${p.combat ? `
                    <div style="font-size: 12px; color: #888;">
                        Mounts: ${p.combat.mounts.length} | Magazines: ${p.combat.magazines.length}
                    </div>
                ` : '<div style="font-size: 12px; color: #444;">Non-combatant</div>'}
            </div>
        `;
    }
}
