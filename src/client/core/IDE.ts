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

    constructor() {
        this.configurationRegistry = new ConfigurationRegistry();
        this.commands = new CommandRegistry(this);
        this.registerCoreSettings();

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

        this.client = new WarGamesClientV2(this.settings.get<string>('core.apiBase'));
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

    private registerCoreSettings(): void {
        this.configurationRegistry.registerConfiguration({
            id: 'editor',
            title: 'Editor',
            properties: {
                'editor.fontSize': {
                    type: 'number',
                    default: 14,
                    description: 'Controls the font size in pixels.',
                },
                'editor.wordWrap': {
                    type: 'boolean',
                    default: false,
                    description: 'Controls how lines should wrap.',
                },
                'editor.theme': {
                    type: 'enum',
                    default: 'ide-dark',
                    enum: ['ide-dark', 'vs-dark', 'vs-light', 'hc-black'],
                    description: 'The color theme for the editor.',
                },
                'editor.minimap': {
                    type: 'boolean',
                    default: true,
                    description: 'Controls whether the minimap is shown.',
                },
                'editor.lineNumbers': {
                    type: 'boolean',
                    default: true,
                    description: 'Controls the display of line numbers.',
                },
            },
        });

        this.configurationRegistry.registerConfiguration({
            id: 'files',
            title: 'Files',
            properties: {
                'files.autoSave': {
                    type: 'enum',
                    default: 'off',
                    enum: ['off', 'afterDelay', 'onFocusChange'],
                    description: 'Controls auto save of editors.',
                },
                'files.autoSaveDelay': {
                    type: 'number',
                    default: 1000,
                    description: 'Controls the delay in ms after which an auto save is triggered.',
                },
            },
        });

        this.configurationRegistry.registerConfiguration({
            id: 'terminal',
            title: 'Terminal',
            properties: {
                'terminal.fontSize': {
                    type: 'number',
                    default: 13,
                    description: 'Controls the font size of the terminal in pixels.',
                },
                'terminal.cursorStyle': {
                    type: 'enum',
                    default: 'block',
                    enum: ['block', 'underline', 'line'],
                    description: 'Controls the style of the terminal cursor.',
                },
            },
        });

        // Core settings registered
        this.configurationRegistry.registerConfiguration({
            id: 'core',
            title: 'Core',
            properties: {
                'core.apiBase': {
                    type: 'string',
                    default: 'http://localhost:3001',
                    description: 'The base URL of the API server.',
                },
                'core.tokenKey': {
                    type: 'string',
                    default: 'token',
                    description: 'The key used to store the token in localStorage.',
                },
                'core.connectWs': {
                    type: 'boolean',
                    default: false,
                    description: 'Controls whether the IDE should connect to the WebSocket server.',
                },
            },
        });
    }
}
