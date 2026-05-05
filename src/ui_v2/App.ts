import { Component } from './framework/Component';
import { UIStore, ActiveView } from './framework/UIStore';
import { sdkClient } from './framework/Client';
import { mockGateway } from './framework/MockGateway';
import { commandDispatcher } from './framework/CommandDispatcher';
import { AppShell } from './components/layout/AppShell';
import { TacticalView } from './views/TacticalView';

// Expose for E2E testing
(window as any).sdkClient = sdkClient;
(window as any).UIStore = UIStore;
(window as any).mockGateway = mockGateway;
(window as any).commandDispatcher = commandDispatcher;

class App {
    private root: HTMLElement;
    private appShell: AppShell;

    constructor() { 
        this.root = document.getElementById('app')!; 
        this.appShell = new AppShell();
    }

    async init() {
        try { await UIStore.init(); } catch (e) { console.warn('Backend offline', e); }
        
        this.appShell.mount(this.root);

        // Listen for browser URL changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            const [view, matchId] = hash.split('/');
            
            if (view) UIStore.activeView.set(view as ActiveView);
            if (matchId) UIStore.currentMatchId.set(matchId);
        });
 
        // Sync UIStore changes back to the URL
        let syncTimeout: any;
        const syncHash = () => {
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
                const view = UIStore.activeView.get();
                const matchId = UIStore.currentMatchId.get();
                const newHash = matchId && matchId !== 'default' ? `${view}/${matchId}` : view;
                
                if (window.location.hash !== `#${newHash}`) {
                    window.location.hash = newHash;
                }
                this.switchView(view);
            }, 0);
        };

        UIStore.activeView.subscribe(syncHash);
        UIStore.currentMatchId.subscribe(syncHash);

        // Initial view (Hash overrides settings)
        const initialHash = window.location.hash.replace('#', '');
        if (initialHash) {
            const [view, matchId] = initialHash.split('/');
            if (view) UIStore.activeView.set(view as ActiveView);
            if (matchId) UIStore.currentMatchId.set(matchId);
        } else {
            // Restore from persisted settings
            this.switchView(UIStore.activeView.get());
        }
    }

    private switchView(view: ActiveView) {
        let content: Component;
        if (view === 'tactical') {
            content = new TacticalView();
        } else {
            content = new PlaceholderView(view);
        }
        this.appShell.setMainContent(content);
    }
}

class PlaceholderView extends Component {
    constructor(private viewName: string) {
        super('div', 'placeholder-view');
    }

    protected styles(): string {
        return `
            .placeholder-view {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                font-size: 24px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
        `;
    }

    protected render(): void {
        this.element.textContent = `${this.viewName} VIEW (V2)`;
    }
}

const app = new App();
app.init();
