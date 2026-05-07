import { Component } from './framework/Component';
import { UIStore, ActiveView } from './framework/UIStore';
import { sdkClient } from './framework/Client';
import { MainMenu } from './views/MainMenu/MainMenu';
import { TacticalWorkspace } from './views/TacticalWorkspace/TacticalWorkspace';
import { ProfileEditor } from './views/ProfileEditor/ProfileEditor';
import { MissionEditor } from './views/MissionEditor/MissionEditor';
import { ScenarioEditor } from './views/ScenarioEditor/ScenarioEditor';

interface E2EWindow extends Window {
    sdkClient: unknown;
    UIStore: unknown;
}

// Expose for E2E testing
const e2eWindow = window as unknown as E2EWindow;
e2eWindow.sdkClient = sdkClient;
e2eWindow.UIStore = UIStore;

class App {
    private root: HTMLElement;
    private currentView: Component | null = null;
    private currentViewName: ActiveView | null = null;

    constructor() { this.root = document.getElementById('app')!; }

    async init() {
        try { await UIStore.init(); } catch (e) { console.warn('Backend offline', e); }
        
        // Listen for browser URL changes (e.g., when Playwright goes to /#profiles)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '') as ActiveView;
            if (hash) UIStore.activeView.set(hash);
        });

        // Sync UIStore changes back to the URL (for normal user navigation)
        UIStore.activeView.subscribe(view => {
            if (window.location.hash !== `#${view}`) {
                window.location.hash = view;
            }
            if (view === this.currentViewName) return;
            this.switchView(view);
        });

        // Set the initial view based on the URL on boot (defaults to menu)
        const initialHash = window.location.hash.replace('#', '') as ActiveView;
        UIStore.activeView.set(initialHash || 'menu');
    }

    private switchView(view: ActiveView) {
        if (this.currentView) { this.currentView.unmount(); this.currentView = null; }
        this.currentViewName = view;
        switch (view) {
            case 'menu': this.currentView = new MainMenu(); break;
            case 'tactical': this.currentView = new TacticalWorkspace(); break;
            case 'profiles': this.currentView = new ProfileEditor(); break;
            case 'missions': this.currentView = new MissionEditor(); break;
            case 'scenarios': this.currentView = new ScenarioEditor(); break;
            case 'debrief': this.currentView = new MainMenu(); break;
        }
        if (this.currentView) this.currentView.mount(this.root);
    }
}

const app = new App();
void app.init();
