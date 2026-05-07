import { Signal } from './Signal.js';
import { logger } from './Logger.js';
import { DatabaseService } from './DatabaseService.js';
import { sdkClient } from './Client.js';
import { ViewStatePayload, ViewUnitPayload, ViewTrackPayload, WarGamesClient, SimulationEvent } from '../shared/types.js';
import { Side } from '../../sdk/schemas/domain.js';

export type ViewState = ViewStatePayload;
export type ViewUnit = ViewUnitPayload;
export type ViewTrack = ViewTrackPayload;
export { WarGamesClient };

export type ActiveView = 'menu' | 'tactical' | 'profiles' | 'missions' | 'scenarios' | 'debrief';
export type InspectorTab = 'kinematics' | 'sensors' | 'weapons' | 'doctrine' | 'damage';
export interface LogEntry { tick: number; severity: string; category: string; message: string; }
export interface LayerDef { id: string; label: string; group: string; defaultOn: boolean; }

export const LAYER_DEFS: LayerDef[] = [
    // Perception & Sensor
    { id: 'radarRings', label: 'Radar Coverage', group: 'perception', defaultOn: false },
    { id: 'sonarCZ', label: 'Sonar CZ', group: 'perception', defaultOn: false },
    { id: 'esmBearings', label: 'ESM Bearings', group: 'perception', defaultOn: false },
    { id: 'detectionCEP', label: 'Detection CEP', group: 'perception', defaultOn: false },
    { id: 'sensorArcs', label: 'Sensor Arcs', group: 'perception', defaultOn: false },
    { id: 'losShading', label: 'LOS Shading', group: 'perception', defaultOn: false },

    // Engagement
    { id: 'wez', label: 'WEZ', group: 'engagement', defaultOn: false },
    { id: 'engageTethers', label: 'Engage Tethers', group: 'engagement', defaultOn: false },
    { id: 'threatEnvelope', label: 'Threat Envelope', group: 'engagement', defaultOn: false },
    { id: 'weaponTracks', label: 'Weapon Tracks', group: 'engagement', defaultOn: false },
    { id: 'ewStrobes', label: 'EW Strobes', group: 'engagement', defaultOn: false },

    // C4ISR
    { id: 'datalinkLines', label: 'Datalink', group: 'c4isr', defaultOn: true },
    { id: 'copTracks', label: 'COP Tracks', group: 'c4isr', defaultOn: true },

    // Environment
    { id: 'bathymetry', label: 'Bathymetry', group: 'environment', defaultOn: false },
    { id: 'depthContours', label: 'Depth Contours', group: 'environment', defaultOn: false },
    { id: 'weather', label: 'Weather', group: 'environment', defaultOn: false },
    { id: 'thermalLayers', label: 'Thermal Layers', group: 'environment', defaultOn: false },

    // Reference
    { id: 'grid', label: 'Grid', group: 'reference', defaultOn: false },
    { id: 'borders', label: 'Borders / EEZ', group: 'reference', defaultOn: false },
    { id: 'missionArea', label: 'Mission Areas', group: 'reference', defaultOn: false },
    { id: 'units', label: 'Units', group: 'reference', defaultOn: false },
    { id: 'tracks', label: 'Tracks', group: 'reference', defaultOn: false },
    { id: 'labels', label: 'Labels', group: 'reference', defaultOn: false },
    { id: 'velocityVecs', label: 'Velocity Vectors', group: 'reference', defaultOn: false },
    { id: 'referencePoints', label: 'Ref Points', group: 'reference', defaultOn: false },
    { id: 'sonobuoyPattern', label: 'Sonobuoys', group: 'reference', defaultOn: false },
];

export class UIStore {
    static readonly activeView = new Signal<ActiveView>('menu');
    static readonly viewState = new Signal<ViewState | null>(null);
    static readonly selectedEntityId = new Signal<string | null>(null);
    static readonly inspectorTab = new Signal<InspectorTab>('kinematics');
    static readonly timeCompression = new Signal<number>(1);
    static readonly isPaused = new Signal<boolean>(true);
    static readonly currentTick = new Signal<number>(0);
    static readonly currentMatchId = new Signal<string>('default');
    static readonly layerVisibility = new Map<string, Signal<boolean>>();
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
        for (const def of LAYER_DEFS) {
            UIStore.layerVisibility.set(def.id, new Signal(def.defaultOn));
        }

        // Log view changes
        UIStore.activeView.subscribe((view: ActiveView) => {
            logger.info('Active view changed', { view });
        });
    }

    static getLayerSignal(id: string): Signal<boolean> {
        let sig = this.layerVisibility.get(id);
        if (!sig) { sig = new Signal(false); this.layerVisibility.set(id, sig); }
        return sig;
    }

    static toggleLayer(id: string) { const sig = this.getLayerSignal(id); sig.set(!sig.get()); }

    static getSelectedEntity(): ViewUnitPayload | ViewTrackPayload | null {
        const vs = this.viewState.get();
        const id = this.selectedEntityId.get();
        if (!vs || !id) return null;
        return vs.units.find(u => u.id === id) || vs.tracks.find(t => t.id === id) || null;
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
        const wsUrl = `ws://${window.location.hostname}:3000`;
        logger.info('Initializing UIStore', { wsUrl });

        this.client = sdkClient;
        await DatabaseService.init();
        // sdkClient is already connecting in Client.ts, but we ensure it here
        if (this.client.connectionState === 'Disconnected') {
            await this.client.connect();
        }
        this.joinMatch(Side.Blue, 'default');

        this.client.events.on('state:viewState', (vs: ViewState) => {
            this.processViewState(vs);
        });

        this.client.events.on('events:new', (evt: unknown) => {
            this.handleTacticalEvent(evt as SimulationEvent);
        });

        this.client.events.on('error', (err: unknown) => {
            logger.error('Client error', { err });
        });
    }

    static joinMatch(side: Side, matchId: string = 'default') {
        this.currentMatchId.set(matchId);
        this.client.joinMatch(side, matchId);
    }

    private static handleTacticalEvent(evt: SimulationEvent) {
        if (evt.type === 'WeaponFired' && this.autoPauseOnWeaponFired.get()) {
            this.setPaused(true);
            const data = evt.data as { shooterId?: string, targetId?: string };
            this.addLog({ tick: this.currentTick.get(), severity: 'Combat', category: 'COMBAT', message: `WEAPON FIRED: ${data.shooterId || 'unknown'} → ${data.targetId || 'unknown'}` });
        }
        if (evt.type === 'EntityDestroyed' && this.autoPauseOnUnitDestroyed.get()) {
            this.setPaused(true);
            this.addLog({ tick: this.currentTick.get(), severity: 'Critical', category: 'COMBAT', message: `UNIT DESTROYED: ${evt.entityId || 'unknown'}` });
        }
    }

    private static processViewState(vs: ViewState) {
        // 1. Reset Detection: If tick jumps back or sequence jumps back significantly, it's a new scenario
        if (vs.tick < this.currentTick.get() || (vs.tick === 0 && vs.sequence < this.lastProcessedSequence)) {
            logger.info('Simulation reset detected', { tick: vs.tick, sequence: vs.sequence });
            this.lastProcessedSequence = -1;
            this.knownHostileTracks.clear();
            // Clear logs on reset? User might want this. For now let's keep them but maybe add a separator.
            this.addLog({ tick: vs.tick, severity: 'Info', category: 'SYSTEM', message: '--- SIMULATION RESET ---' });
        }

        // 2. Sequence Check: Discard stale out-of-order packets
        if (vs.sequence <= this.lastProcessedSequence) {
            logger.debug('Discarded stale ViewState', { seq: vs.sequence, current: this.lastProcessedSequence });
            return;
        }
        this.lastProcessedSequence = vs.sequence;

        // 3. Authoritative Pause Logic:
        if (this.isPauseTransitioning) {
            if (vs.isPaused === this.isPaused.get()) {
                this.isPauseTransitioning = false;
                logger.info('Pause state confirmed by server', { isPaused: vs.isPaused });
            }
        } else {
            this.isPaused.set(vs.isPaused);
        }

        // 4. Regular state updates
        this.viewState.set(vs);
        this.currentTick.set(vs.tick);

        if (vs.tick % 100 === 0) {
            logger.debug('Received VIEW_STATE snapshot', { tick: vs.tick, seq: vs.sequence });
        }

        // 5. Auto-Pause Logic
        if (!vs.isPaused) {
            let shouldPause = false;

            // New Hostile Contact
            if (this.autoPauseOnNewHostile.get()) {
                for (const track of vs.tracks) {
                    if (track.identification === 'Hostile' && !this.knownHostileTracks.has(track.id)) {
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

            if (shouldPause) {
                this.setPaused(true);
            }
        }

        // Update known tracks
        for (const track of vs.tracks) {
            if (track.identification === 'Hostile') {
                this.knownHostileTracks.add(track.id);
            }
        }
    }

    private static knownHostileTracks = new Set<string>();

    static setPaused(val: boolean) {
        logger.info('UI requesting pause state change', { val });
        this.isPaused.set(val);
        this.isPauseTransitioning = true;
        this.client.setTimeCompression(val ? 0 : 1);
    }
}
