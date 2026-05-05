import { Signal } from './Signal.js';
import { logger } from './Logger.js';
import { DatabaseService } from './DatabaseService.js';
import { sdkClient } from './Client.js';
import { settingsStore } from './SettingsStore.js';
import { ViewStatePayload, ViewUnitPayload, ViewTrackPayload, WarGamesClient } from '../shared/types.js';
import { Side } from '../../sdk/schemas/domain.js';
import { layerRegistry, LayerMetadata } from './map/LayerRegistry.js';

export type ViewState = ViewStatePayload;
export type ViewUnit = ViewUnitPayload;
export type ViewTrack = ViewTrackPayload;
export { WarGamesClient };

export type ActiveView = 'menu' | 'tactical' | 'profiles' | 'missions' | 'scenarios' | 'debrief';
export type InspectorTab = 'Kinematics' | 'Sensors' | 'Weapons' | 'Routing' | 'Formation' | 'Doctrine' | 'Damage';
export interface LogEntry { tick: number; severity: string; category: string; message: string; }

export class UIStore {
    static readonly activeView = new Signal<ActiveView>('menu');
    static readonly viewState = new Signal<ViewState | null>(null);
    static readonly selectedEntityId = new Signal<string | null>(null);
    static readonly inspectorTab = new Signal<InspectorTab>('Kinematics');
    static readonly timeCompression = new Signal<number>(1);
    static readonly isPaused = new Signal<boolean>(true);
    static readonly currentTick = new Signal<number>(0);
    static readonly currentTimestamp = new Signal<number>(0);
    static readonly currentMatchId = new Signal<string>('default');
    static readonly cameraTarget = new Signal<{ lat: number; lon: number } | null>(null);
    static readonly layerVisibility = new Map<string, Signal<boolean>>();
    static readonly availableLayers = layerRegistry.availableLayers;
    static readonly logs = new Signal<LogEntry[]>([]);
    static client: WarGamesClient;

    // Auto-pause triggers
    static readonly autoPauseOnNewHostile = new Signal<boolean>(true);
    static readonly autoPauseOnWeaponFired = new Signal<boolean>(true);
    static readonly autoPauseOnUnitDestroyed = new Signal<boolean>(true);

    // Log filters
    static readonly logFilterSeverity = new Signal<Set<string>>(new Set(['Info', 'Warning', 'Critical', 'Combat']));
    static readonly logFilterCategory = new Signal<Set<string>>(new Set(['SYSTEM', 'COMBAT', 'SENSORS', 'NAV', 'EW']));

    static {
        // Initialize activeView from settings
        const savedView = settingsStore.activeView.get() as ActiveView;
        if (['menu', 'tactical', 'profiles', 'missions', 'scenarios', 'debrief'].includes(savedView)) {
            UIStore.activeView.set(savedView);
        }

        // Log view changes and PERSIST
        UIStore.activeView.subscribe((view: ActiveView) => {
            logger.info('Active view changed', { view });
            settingsStore.activeView.set(view);
        });

        // Listen for new layers and init visibility
        UIStore.availableLayers.subscribe(metas => {
            const savedLayers = settingsStore.layerVisibility.get();
            for (const meta of metas) {
                if (!UIStore.layerVisibility.has(meta.id)) {
                    const val = savedLayers[meta.id] ?? meta.defaultOn;
                    UIStore.layerVisibility.set(meta.id, new Signal(val));
                }
            }
        });
    }

    static getLayerSignal(id: string): Signal<boolean> {
        let sig = this.layerVisibility.get(id);
        if (!sig) {
            // Check if we have a default in registry
            const meta = layerRegistry.availableLayers.get().find(m => m.id === id);
            sig = new Signal(meta?.defaultOn ?? false);
            this.layerVisibility.set(id, sig);
        }
        return sig;
    }

    static toggleLayer(id: string) {
        const sig = this.getLayerSignal(id);
        const next = !sig.get();
        sig.set(next);
        settingsStore.setLayerVisibility(id, next);
    }

    static addLog(entry: LogEntry) {
        this.logs.update((arr: LogEntry[]) => {
            const next = [...arr, entry];
            return next.length > 500 ? next.slice(-500) : next;
        });
    }
    private static lastProcessedSequence = -1;
    private static isPauseTransitioning = false;

    static async init() {
        this.client = sdkClient;
        const wsUrl = (this.client as any).config.url;
        logger.info('Initializing UIStore', { wsUrl });

        await DatabaseService.init();

        if (this.client.connectionState === 'Disconnected') {
            await this.client.connect();
        }

        // Allow match selection via URL params
        const params = new URLSearchParams(window.location.search);
        const matchId = params.get('matchId') || 'default';
        this.joinMatch(Side.Blue, matchId);

        this.client.events.on('state:viewState', (vs: ViewState) => {
            console.log("Received viewState", vs);
            this.processViewState(vs);
        });

        this.client.events.on('event:tactical', (evt: any) => {
            this.handleTacticalEvent(evt);
        });

        this.client.events.on('error', (err: any) => {
            logger.error('Client error', { err });
        });
    }

    static joinMatch(side: Side, matchId: string = 'default') {
        this.currentMatchId.set(matchId);
        this.client.joinMatch(side, matchId);
    }

    private static handleTacticalEvent(evt: any) {
        if (evt.type === 'weapon_fired' && this.autoPauseOnWeaponFired.get()) {
            this.setPaused(true);
            this.addLog({ tick: this.currentTick.get(), severity: 'Combat', category: 'COMBAT', message: `WEAPON FIRED: ${evt.shooterId} → ${evt.targetId}` });
        }
        if (evt.type === 'unit_destroyed' && this.autoPauseOnUnitDestroyed.get()) {
            this.setPaused(true);
            this.addLog({ tick: this.currentTick.get(), severity: 'Critical', category: 'COMBAT', message: `UNIT DESTROYED: ${evt.entityId} (${evt.side})` });
        }
    }

    private static processViewState(vs: ViewState) {
        if (vs.tick < this.currentTick.get() || (vs.tick === 0 && vs.sequence < this.lastProcessedSequence)) {
            logger.info('Simulation reset detected', { tick: vs.tick, sequence: vs.sequence });
            this.lastProcessedSequence = -1;
            this.knownHostileTracks.clear();
            this.addLog({ tick: vs.tick, severity: 'Info', category: 'SYSTEM', message: '--- SIMULATION RESET ---' });
        }

        if (vs.sequence <= this.lastProcessedSequence) {
            logger.debug('Discarded stale ViewState', { seq: vs.sequence, current: this.lastProcessedSequence });
            return;
        }
        this.lastProcessedSequence = vs.sequence;

        if (this.isPauseTransitioning) {
            if (vs.isPaused === this.isPaused.get()) {
                this.isPauseTransitioning = false;
                logger.info('Pause state confirmed by server', { isPaused: vs.isPaused });
            }
        } else {
            this.isPaused.set(vs.isPaused);
        }

        this.viewState.set(vs);
        this.currentTick.set(vs.tick);
        this.currentTimestamp.set(vs.timestamp);

        if (vs.tick % 100 === 0) {
            logger.debug('Received VIEW_STATE snapshot', { tick: vs.tick, seq: vs.sequence });
        }

        if (!vs.isPaused) {
            let shouldPause = false;
            if (this.autoPauseOnNewHostile.get()) {
                for (const track of vs.tracks) {
                    if (track.classification === 'Hostile' && !this.knownHostileTracks.has(track.id)) {
                        shouldPause = true;
                        this.addLog({
                            tick: vs.tick,
                            severity: 'Warning',
                            category: 'SENSORS',
                            message: `NEW HOSTILE CONTACT: ${track.id}`
                        });
                    }
                }
            }
            if (shouldPause) this.setPaused(true);
        }

        for (const track of vs.tracks) {
            if (track.classification === 'Hostile') {
                this.knownHostileTracks.add(track.id);
            }
        }
    }

    private static knownHostileTracks = new Set<string>();

    static setPaused(val: boolean) {
        logger.info('UI requesting pause state change', { val });
        this.isPaused.set(val);
        this.isPauseTransitioning = true;
        this.client.setTimeCompression(val ? 0 : this.timeCompression.get());
    }

    static setTimeCompression(rate: number) {
        logger.info('UI requesting time compression change', { rate });
        this.timeCompression.set(rate);
        if (!this.isPaused.get()) {
            this.client.setTimeCompression(rate);
        }
    }
}
