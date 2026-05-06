import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { commandDispatcher } from '../../framework/CommandDispatcher';

/**
 * DBBrowser: Visual catalog for unit profiles and stats.
 */
export class DBBrowser extends Component {
    private listEl!: HTMLElement;
    private detailEl!: HTMLElement;
    private profiles: any[] = [];

    constructor() {
        super('div', 'db-browser');
    }

    protected styles(): string {
        return `
            .db-browser {
                display: flex;
                height: 100%;
                background: var(--bg-base);
                color: var(--text-main);
                font-family: var(--font-ui);
            }
            .db-sidebar {
                width: 250px;
                border-right: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                background: var(--bg-panel);
            }
            .db-search {
                padding: var(--sp-3);
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
            }
            .db-search input {
                width: 100%;
                background: var(--bg-base);
                border: 1px solid var(--border-color);
                color: var(--text-bright);
                padding: 6px 10px;
                border-radius: var(--radius-sm);
                font-size: var(--text-xs);
            }
            .db-list {
                flex: 1;
                overflow-y: auto;
            }
            .db-item {
                padding: var(--sp-2) var(--sp-3);
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: background 0.1s;
                font-size: var(--text-sm);
            }
            .db-item:hover { background: var(--bg-hover); }
            .db-item.active { background: var(--bg-active); border-left: 2px solid var(--color-friendly); }
            .db-item__sub { font-size: 9px; color: var(--text-muted); text-transform: uppercase; }

            .db-main {
                flex: 1;
                padding: var(--sp-6);
                overflow-y: auto;
                background: radial-gradient(circle at top right, rgba(0, 212, 255, 0.05), transparent 40%);
            }
            .db-header { border-bottom: 2px solid var(--border-color); padding-bottom: var(--sp-4); margin-bottom: var(--sp-5); }
            .db-name { font-size: 32px; font-weight: 800; color: var(--text-bright); letter-spacing: -0.02em; }
            .db-category { font-size: var(--text-sm); color: var(--color-friendly); font-weight: 600; text-transform: uppercase; margin-top: -4px; }

            .db-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--sp-5); }
            .db-section-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--sp-3); border-left: 3px solid var(--border-color); padding-left: 8px; }
            .db-stat { background: var(--bg-surface); border: 1px solid var(--border-color); padding: var(--sp-3); border-radius: var(--radius-md); }
            .db-stat-label { font-size: 9px; color: var(--text-dim); text-transform: uppercase; font-weight: 600; }
            .db-stat-value { font-size: var(--text-lg); color: var(--text-main); font-family: var(--font-mono); font-weight: 600; margin-top: 4px; }

            .db-sensor-list { display: flex; flex-direction: column; gap: var(--sp-2); }
            .db-sensor-item { background: rgba(255,255,255,0.02); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = '';
        
        const sidebar = this.el('div', 'db-sidebar');
        const search = this.el('div', 'db-search');
        const searchInput = document.createElement('input');
        searchInput.placeholder = 'SEARCH DB3000...';
        search.appendChild(searchInput);
        
        this.listEl = this.el('div', 'db-list');
        sidebar.appendChild(search);
        sidebar.appendChild(this.listEl);

        this.detailEl = this.el('div', 'db-main');
        this.detailEl.innerHTML = '<div class="empty-state">SELECT A UNIT TO VIEW TECHNICAL DATA</div>';

        this.element.appendChild(sidebar);
        this.element.appendChild(this.detailEl);

        this.fetchProfiles();

        this.listen(searchInput, 'input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = this.profiles.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
            this.updateList(filtered);
        });
    }

    private async fetchProfiles() {
        try {
            // Using the new GET_PROFILES message via SDK
            const resp = await fetch('/api/matches/profiles');
            this.profiles = await resp.json();
            this.updateList(this.profiles);
        } catch (err) {
            console.error('Failed to fetch profiles', err);
        }
    }

    private updateList(profiles: any[]) {
        this.listEl.innerHTML = '';
        profiles.forEach(p => {
            const item = this.el('div', 'db-item');
            item.appendChild(this.el('div', 'db-item__name', p.name));
            item.appendChild(this.el('div', 'db-item__sub', `${p.domain} • ${p.type}`));
            item.onclick = () => {
                this.listEl.querySelectorAll('.db-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                this.showDetail(p);
            };
            this.listEl.appendChild(item);
        });
    }

    private async showDetail(summary: any) {
        try {
            const resp = await fetch(`/api/matches/profiles/${summary.id}`);
            const p = await resp.json();
            
            this.detailEl.innerHTML = `
                <div class="db-header">
                    <div class="db-name">${p.name}</div>
                    <div class="db-category">${p.domain} / ${p.type}</div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 40px;">
                    <div>
                        <div class="db-section-title">Kinematics & Performance</div>
                        <div class="db-grid">
                            <div class="db-stat">
                                <div class="db-stat-label">Max Speed</div>
                                <div class="db-stat-value">${p.kinematics?.maxSpeed || 0} kts</div>
                            </div>
                            <div class="db-stat">
                                <div class="db-stat-label">Service Ceiling</div>
                                <div class="db-stat-value">${p.kinematics?.maxAlt || 0} m</div>
                            </div>
                            <div class="db-stat">
                                <div class="db-stat-label">Climb Rate</div>
                                <div class="db-stat-value">${p.kinematics?.climbRate || 0} m/s</div>
                            </div>
                            <div class="db-stat">
                                <div class="db-stat-label">Turn Rate</div>
                                <div class="db-stat-value">${p.kinematics?.turnRate || 0} °/s</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="db-section-title">Sensors & Electronics</div>
                        <div class="db-sensor-list">
                            ${p.sensors?.map((s: any) => `
                                <div class="db-sensor-item">
                                    <span style="font-weight:600">${s.name}</span>
                                    <span style="color:var(--text-muted); font-size:10px">${s.type} • ${s.rangeM / 1000}km</span>
                                </div>
                            `).join('') || '<div class="empty-state">No sensors configured</div>'}
                        </div>
                    </div>

                    <div>
                        <div class="db-section-title">Signatures (RCS/IR)</div>
                        <div class="db-grid">
                            <div class="db-stat">
                                <div class="db-stat-label">Radar Cross Section</div>
                                <div class="db-stat-value">${p.signatures?.rcs || 1.0} m²</div>
                            </div>
                            <div class="db-stat">
                                <div class="db-stat-label">IR Signature</div>
                                <div class="db-stat-value">${p.signatures?.ir || 1.0}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to fetch profile detail', err);
        }
    }
}
