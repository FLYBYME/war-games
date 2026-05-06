import { Component } from '../../framework/Component';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { windowManager } from '../../framework/WindowManager';
import { WindowFrame } from './WindowFrame';
import { SessionManager } from '../management/SessionManager';
import { MatchManager } from '../management/MatchManager';
import { MapLayers } from '../management/MapLayers';
import { MapDataManager } from '../management/MapDataManager';
import { MountsWindowContent } from '../management/MountsWindow';
import { SensorsWindowContent } from '../management/SensorsWindow';
import { ContactsWindowContent } from '../management/ContactsWindow';
import { MissionPanel } from '../management/MissionPanel';
import { AdvancedMissionPlanner } from '../management/AdvancedMissionPlanner';
import { WeatherWindow } from '../management/WeatherWindow';
import { DoctrineWindow } from '../management/DoctrineWindow';
import { WRAWindow } from '../management/WRAWindow';
import { TelemetryWindow } from '../management/TelemetryWindow';
import { NetworkWindow } from '../management/NetworkWindow';
import { LogisticsWindow } from '../management/LogisticsWindow';
import { LoadoutWindow } from '../management/LoadoutWindow';
import { MiniMap } from '../management/MiniMap';
import { DBBrowser } from '../management/DBBrowser';
import { settingsStore } from '../../framework/SettingsStore';

/**
 * AppShell: The main container for the V2 UI.
 * Coordinates Menu, Docking Panels, and Floating Windows.
 */
export class AppShell extends Component {
    private windowLayer: HTMLElement | null = null;
    private contentArea: HTMLElement | null = null;
    private windowMap = new Map<string, WindowFrame>();
    private currentContent: Component | null = null;

    constructor() {
        super('div', 'app-shell');
    }

    protected styles(): string {
        return `
            .app-shell {
                display: flex;
                flex-direction: column;
                width: 100vw;
                height: 100vh;
                background: var(--bg-surface, #1e1e1e);
                color: var(--text-primary, #eee);
                font-family: 'Segoe UI', system-ui, sans-serif;
            }

            .shell-body {
                flex: 1;
                display: flex;
                position: relative;
                overflow: hidden;
            }

            .main-content-area {
                flex: 1;
                position: relative;
                overflow: hidden;
            }

            .window-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
            }

            .window-layer > * {
                pointer-events: auto;
            }
        `;
    }

    protected render(): void {
        const menuBar = new MenuBar();
        const shellBody = this.el('div', 'shell-body');
        const contentArea = this.el('div', 'main-content-area', '', 'main-content');
        const windowLayer = this.el('div', 'window-layer', '', 'window-layer');
        
        this.contentArea = contentArea;
        this.windowLayer = windowLayer;

        this.addChild(menuBar);
        this.element.appendChild(shellBody);
        
        const statusBar = new StatusBar();
        this.element.appendChild(statusBar.element);
        this.addChild(statusBar);

        shellBody.appendChild(contentArea);
        shellBody.appendChild(windowLayer);

        // Sync Floating Windows
        this.subscribe(windowManager.windows, windows => {
            if (!this.windowLayer) return;

            // 1. Remove closed windows
            for (const id of this.windowMap.keys()) {
                if (!windows.has(id)) {
                    const frame = this.windowMap.get(id)!;
                    frame.unmount();
                    this.windowMap.delete(id);
                }
            }

            // 2. Add new windows
            windows.forEach((opts, id) => {
                if (!this.windowMap.has(id)) {
                    let content: Component;
                    switch (id) {
                        case 'sessions': content = new SessionManager(); break;
                        case 'matches': content = new MatchManager(); break;
                        case 'layers': content = new MapLayers(); break;
                        case 'map-data': content = new MapDataManager(); break;
                        case 'mounts': content = new MountsWindowContent(); break;
                        case 'sensors': content = new SensorsWindowContent(); break;
                        case 'contacts': content = new ContactsWindowContent(); break;
                        case 'missions': content = new MissionPanel(); break;
                        case 'mission-planner': content = new AdvancedMissionPlanner(); break;
                        case 'network': content = new NetworkWindow(); break;
                        case 'logistics': content = new LogisticsWindow(); break;
                        case 'loadout': content = new LoadoutWindow(); break;
                        case 'weather': content = new WeatherWindow(); break;
                        case 'doctrine': content = new DoctrineWindow(); break;
                        case 'wra': content = new WRAWindow(); break;
                        case 'telemetry': content = new TelemetryWindow(); break;
                        case 'minimap': content = new MiniMap(); break;
                        case 'db-browser': content = new DBBrowser(); break;
                        default: content = new PlaceholderContent(opts.title);
                    }
                    const frame = new WindowFrame(opts, content);
                    this.windowMap.set(id, frame);
                    frame.mount(this.windowLayer!);
                }
            });
        });

        // Restore previously open windows
        const savedStates = settingsStore.windowStates.get();
        Object.entries(savedStates).forEach(([id, state]) => {
            if (state.isOpen && !this.windowMap.has(id)) {
                if (id === 'sessions') windowManager.open({ id: 'sessions', title: 'SESSION MONITOR' });
                if (id === 'matches') windowManager.open({ id: 'matches', title: 'MATCH MANAGEMENT' });
                if (id === 'layers') windowManager.open({ id: 'layers', title: 'TACTICAL LAYERS' });
                if (id === 'map-data') windowManager.open({ id: 'map-data', title: 'MAP DATA MANAGEMENT' });
                if (id === 'mounts') windowManager.open({ id: 'mounts', title: 'WEAPON MOUNTS' });
                if (id === 'sensors') windowManager.open({ id: 'sensors', title: 'SENSOR CONTROL' });
                if (id === 'contacts') windowManager.open({ id: 'contacts', title: 'CONTACT LIST' });
                if (id === 'missions') windowManager.open({ id: 'missions', title: 'MISSION PLANNER' });
                if (id === 'mission-planner') windowManager.open({ id: 'mission-planner', title: 'ADVANCED MISSION PLANNER' });
                if (id === 'network') windowManager.open({ id: 'network', title: 'DATALINK TOPOLOGY' });
                if (id === 'logistics') windowManager.open({ id: 'logistics', title: 'FUEL & BINGO STATUS' });
                if (id === 'loadout') windowManager.open({ id: 'loadout', title: 'LOADOUT CONFIGURATOR' });
                if (id === 'weather') windowManager.open({ id: 'weather', title: 'ENVIRONMENT INJECTOR' });
                if (id === 'doctrine') windowManager.open({ id: 'doctrine', title: 'DOCTRINE & ROE' });
                if (id === 'wra') windowManager.open({ id: 'wra', title: 'WRA EDITOR' });
                if (id === 'telemetry') windowManager.open({ id: 'telemetry', title: 'LOSSES & TELEMETRY' });
                if (id === 'minimap') windowManager.open({ id: 'minimap', title: 'STRATEGIC MINI-MAP' });
                if (id === 'db-browser') windowManager.open({ id: 'db-browser', title: 'DB3000 BROWSER' });
            }
        });
    }

    public setMainContent(content: Component) {
        if (this.currentContent) {
            this.currentContent.unmount();
            // Remove from children array
            const idx = this.children.indexOf(this.currentContent);
            if (idx > -1) this.children.splice(idx, 1);
        }
        
        this.currentContent = content;
        if (this.contentArea) {
            this.addChild(content, this.contentArea);
        }
    }
}

/** Placeholder component for window content */
class PlaceholderContent extends Component {
    constructor(private title: string) { super('div', 'placeholder-content'); }
    protected styles() { return '.placeholder-content { padding: 20px; color: #888; }'; }
    protected render() { this.element.textContent = `Content for ${this.title}...`; }
}
