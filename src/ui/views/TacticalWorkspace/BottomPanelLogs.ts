import { Component } from '../../framework/Component';
import { UIStore, LogEntry } from '../../framework/UIStore';
import { ContactTable } from '../../components/panels/ContactTable';
import { LossesGraph } from '../../components/panels/LossesGraph';
import { FuelBingoDashboard } from '../../components/panels/FuelBingoDashboard';
import { DatalinkTopology } from '../../components/panels/DatalinkTopology';
import { DoctrineROEPanel } from '../../components/panels/DoctrineROEPanel';
import { WRAEditor } from '../../components/panels/WRAEditor';
import { LoadoutConfigurator } from '../../components/panels/LoadoutConfigurator';
import { WeatherInjector } from '../../components/panels/WeatherInjector';
import { TimeCompressionSafety } from '../../components/panels/TimeCompressionSafety';
import { ScenarioManager } from '../../components/panels/ScenarioManager';

type BottomTab = 'logs' | 'contacts' | 'losses' | 'fuel' | 'datalink' | 'doctrine' | 'wra' | 'loadout' | 'weather' | 'settings' | 'scenario';

const BOTTOM_TABS: { key: BottomTab; label: string }[] = [
    { key: 'logs', label: 'LOG' },
    { key: 'contacts', label: 'CONTACTS' },
    { key: 'losses', label: 'LOSSES' },
    { key: 'fuel', label: 'FUEL' },
    { key: 'datalink', label: 'DATALINK' },
    { key: 'doctrine', label: 'ROE' },
    { key: 'wra', label: 'WRA' },
    { key: 'loadout', label: 'LOADOUT' },
    { key: 'weather', label: 'ENV' },
    { key: 'settings', label: 'SETTINGS' },
    { key: 'scenario', label: 'SCENARIO' },
];

export class BottomPanelLogs extends Component {
    private logBody!: HTMLElement;
    private tabBody!: HTMLElement;
    private activeTab: BottomTab = 'logs';
    private autoScroll = true;

    constructor() { super('div', 'panel panel-bottom'); }

    protected styles() {
        return `
        .panel-bottom { overflow:hidden; }
        .panel-bottom .tabs { overflow-x:auto; flex-shrink:0; }
        .panel-bottom .panel__body { overflow-y:auto; }
        .log-entry { font-family:var(--font-mono); font-size:var(--text-xs); padding:2px var(--sp-3); border-bottom:1px solid rgba(30,41,59,0.4); display:flex; gap:var(--sp-2); line-height:1.5; }
        .log-entry__tick { color:var(--text-dim); flex-shrink:0; min-width:50px; }
        .log-entry__cat { font-weight:600; flex-shrink:0; min-width:70px; }
        .log-entry__msg { color:var(--text-main); word-break:break-word; }
        .log-entry--combat .log-entry__cat { color:var(--color-hostile); }
        .log-entry--sensors .log-entry__cat { color:var(--color-friendly); }
        .log-entry--nav .log-entry__cat { color:var(--accent-warning); }
        .log-entry--system .log-entry__cat { color:var(--text-muted); }
        `;
    }

    protected render() {
        const header = this.el('div', 'panel__header');
        header.appendChild(this.el('span', undefined, 'COMMAND CENTER'));
        const actions = this.el('div');
        actions.style.display = 'flex';
        actions.style.gap = '4px';
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn--sm btn--ghost';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => { UIStore.logs.set([]); if (this.logBody) this.logBody.replaceChildren(); });
        actions.appendChild(clearBtn);
        header.appendChild(actions);

        const tabs = this.el('div', 'tabs');
        for (const t of BOTTOM_TABS) {
            const tab = this.el('div', `tabs__tab${t.key === 'logs' ? ' is-active' : ''}`, t.label);
            tab.addEventListener('click', () => this.switchTab(t.key, tabs));
            tabs.appendChild(tab);
        }

        this.tabBody = this.el('div', 'panel__body');
        this.logBody = this.el('div');
        this.tabBody.appendChild(this.logBody);

        this.element.append(header, tabs, this.tabBody);
    }

    private switchTab(tab: BottomTab, tabsRow: HTMLElement) {
        this.activeTab = tab;
        tabsRow.querySelectorAll('.tabs__tab').forEach((t, i) => {
            t.classList.toggle('is-active', BOTTOM_TABS[i].key === tab);
        });

        // Unmount widget children
        this.children.forEach(c => c.unmount());
        this.children = [];
        this.tabBody.replaceChildren();

        switch (tab) {
            case 'logs':
                this.logBody = this.el('div');
                this.tabBody.appendChild(this.logBody);
                break;
            case 'contacts':   this.addChild(new ContactTable(), this.tabBody); break;
            case 'losses':     this.addChild(new LossesGraph(), this.tabBody); break;
            case 'fuel':       this.addChild(new FuelBingoDashboard(), this.tabBody); break;
            case 'datalink':   this.addChild(new DatalinkTopology(), this.tabBody); break;
            case 'doctrine':   this.addChild(new DoctrineROEPanel(), this.tabBody); break;
            case 'wra':        this.addChild(new WRAEditor(), this.tabBody); break;
            case 'loadout':    this.addChild(new LoadoutConfigurator(), this.tabBody); break;
            case 'weather':    this.addChild(new WeatherInjector(), this.tabBody); break;
            case 'settings':   this.addChild(new TimeCompressionSafety(), this.tabBody); break;
            case 'scenario':   this.addChild(new ScenarioManager(), this.tabBody); break;
        }
    }

    protected onMount() {
        let lastTick = 0;
        this.subscribe(UIStore.viewState, vs => {
            if (!vs || vs.tick <= lastTick) return;
            lastTick = vs.tick;
            if (vs.tick % 50 === 0) {
                UIStore.addLog({ tick: vs.tick, severity: 'Info', category: 'SYSTEM', message: `Tick ${vs.tick} — ${vs.units.length} units, ${vs.tracks.length} tracks` });
            }
        });

        this.subscribe(UIStore.logs, entries => {
            if (this.activeTab !== 'logs') return;
            this.reconcileLogs(entries);
        });
    }

    private reconcileLogs(entries: LogEntry[]) {
        if (!this.logBody) return;
        const filters = UIStore.logFilterSeverity.get();
        const catFilters = UIStore.logFilterCategory.get();
        const visible = entries.filter(e => filters.has(e.severity) && catFilters.has(e.category)).slice(-200);

        while (this.logBody.children.length > visible.length) this.logBody.firstChild?.remove();

        for (let i = 0; i < visible.length; i++) {
            const e = visible[i];
            let row = this.logBody.children[i] as HTMLElement;
            if (!row) {
                row = this.el('div', 'log-entry');
                row.appendChild(this.el('span', 'log-entry__tick'));
                row.appendChild(this.el('span', 'log-entry__cat'));
                row.appendChild(this.el('span', 'log-entry__msg'));
                this.logBody.appendChild(row);
            }
            row.className = `log-entry log-entry--${(e.category || 'system').toLowerCase()}`;
            (row.children[0] as HTMLElement).textContent = String(e.tick);
            (row.children[1] as HTMLElement).textContent = `[${e.category}]`;
            (row.children[2] as HTMLElement).textContent = e.message;
        }
        if (this.autoScroll) this.logBody.scrollTop = this.logBody.scrollHeight;
    }
}
