import { LayoutManager } from './LayoutManager';
import { CommandRegistry } from './CommandRegistry';
import { ExtensionManager } from './extensions/ExtensionManager';
import { ViewRegistry } from './extensions/ViewRegistry';
import { ActivityBarService } from './ActivityBarService';
import { ConfigurationRegistry } from './configuration/ConfigurationRegistry';
import { ConfigurationService } from './configuration/ConfigurationService';
import { NotificationService } from './NotificationService';
import { ThemeService } from './ThemeService';
import { MonacoService } from './MonacoService';
import { EditorManager } from './editor/EditorManager';
import { ShortcutManager } from './ShortcutManager';
import { WarGamesClientV2 } from '@sdk/generated/WarGamesClientV2';
import { MatchService } from './services/MatchService';
import { SelectionService } from './services/SelectionService';
import { SimStreamService } from './services/SimStreamService';

import { SimulationService } from './services/SimulationService';


export const IDEEvents = {
    APP_READY: 'ide:app_ready',
}

export class IDE {

    public layout: LayoutManager;
    public commands: CommandRegistry;
    public extensions: ExtensionManager;
    public views: ViewRegistry;
    public activityBar: ActivityBarService;
    public configurationRegistry: ConfigurationRegistry;
    public settings: ConfigurationService;
    public notifications!: NotificationService;
    public theme: ThemeService;
    public editor: EditorManager;
    public monaco: MonacoService;
    public shortcuts: ShortcutManager;
    private initialized: boolean = false;
    private client: WarGamesClientV2;
    public matches: MatchService;
    public selection: SelectionService;
    public stream: SimStreamService;
    public sim: SimulationService;

    constructor() {
        this.configurationRegistry = new ConfigurationRegistry();
        this.commands = new CommandRegistry(this);

        // Core settings registered
        this.configurationRegistry.registerConfiguration({
            id: 'core',
            title: 'Core',
            properties: {
                'core.apiBase': {
                    type: 'string',
                    default: '/api/v2',
                    description: 'The base URL of the API server. Can be relative (/api/v2) or absolute (http://ip:3000/api/v2).',
                },
                'map.terrainServer': {
                    type: 'string',
                    default: `http://192.168.1.9:8080`,
                    description: 'The base URL of the terrain server.',
                },
            },
        });

        this.configurationRegistry.registerConfiguration({
            id: 'ai',
            title: 'AI & Agents',
            properties: {
                'ai.ollamaUrl': {
                    type: 'string',
                    default: 'http://192.168.1.10:11434',
                    description: 'The URL of the Ollama server for AI agent operations.',
                },
            },
        });

        // Settings should also be available before layout if possible
        this.settings = new ConfigurationService(this, this.configurationRegistry);

        this.layout = new LayoutManager(this, document.getElementById('app')!);
        this.extensions = new ExtensionManager(this);
        this.views = new ViewRegistry(this);
        this.activityBar = new ActivityBarService(this);
        this.theme = new ThemeService(this);
        this.editor = new EditorManager(this);
        this.monaco = new MonacoService(this);
        this.shortcuts = new ShortcutManager(this);

        const apiBase = this.settings.get<string>('core.apiBase');
        const terrainBase = this.settings.get<string>('map.terrainServer') || window.location.origin;

        this.client = new WarGamesClientV2(apiBase, terrainBase);
        this.matches = new MatchService(this.client);
        this.selection = new SelectionService();
        this.stream = new SimStreamService(this.client);
        this.sim = new SimulationService(this.client, this.stream, this.matches);
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        this.notifications = new NotificationService(this.layout.statusBar);
        this.notifications.setStatusMessage('Initializing...');

        try {
            this.layout.buildStructure();
            this.layout.initialize();
            this.layout.registerCommands();

            // Mount editor to the center panel
            const centerPanel = document.getElementById('center-panel');
            if (centerPanel) {
                this.editor.mount(centerPanel);
            }

            this.notifications.setStatusMessage('Loading extensions...');
            await this.extensions.activateAll();

            // Wire service emitters now that commands is ready
            this.matches.setEmitter(this.commands);
            this.selection.setEmitter(this.commands);

            this.initialized = true;
            this.commands.emit(IDEEvents.APP_READY, { timestamp: Date.now() });
        } catch (error) {
            console.error('❌ Failed to initialize IDE:', error);
            throw error;
        }
    }

    public getClient(): WarGamesClientV2 {
        return this.client;
    }
}
