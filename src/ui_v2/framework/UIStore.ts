import { sdkClient } from './Client';
import { ViewStatePayload, MatchInfo, EntityProfile, Side, ViewUnitPayload, ViewTrackPayload, EngineCommandPayload } from '../../sdk/schemas';
import { Observable } from './Signal';
import { layerRegistry } from './map/LayerRegistry';

export type ActiveView = 'tactical' | 'scenarios' | 'profiles' | 'intelligence' | 'admin' | 'menu' | 'missions';
export type ViewUnit = ViewUnitPayload;
export type ViewTrack = ViewTrackPayload;
export type ViewState = ViewStatePayload;
export interface LogEntry { tick: number; severity: string; category: string; message: string; }

/**
 * UIStore: Single Source of Truth for the UI.
 * Reactive, atomic, and synchronized with the SDK.
 */
export const UIStore = {
    activeView: new Observable<ActiveView>('tactical'),
    currentMatchId: new Observable<string | null>(null),
    currentSide: new Observable<Side>(Side.Blue),

    viewState: new Observable<ViewStatePayload | null>(null),
    matches: new Observable<MatchInfo[]>([]),
    profiles: new Observable<EntityProfile[]>([]),

    selectedEntityId: new Observable<string | null>(null),
    hoveredEntityId: new Observable<string | null>(null),

    isConnected: new Observable<boolean>(false),
    isPaused: new Observable<boolean>(true),
    logs: new Observable<LogEntry[]>([]),

    client: sdkClient,
    cameraTarget: new Observable<{ lat: number, lon: number } | null>(null),
    availableLayers: layerRegistry.availableLayers,
    layerVisibility: new Map<string, Observable<boolean>>(),
    timeCompression: new Observable<number>(1),
    currentTimestamp: new Observable<number>(0),

    async init() {
        // 1. Initial Data Fetch
        try {
            const matches = await sdkClient.listMatches();
            this.matches.set(matches);
            
            if (!this.currentMatchId.get()) {
                const def = matches.find(m => m.id === 'default');
                if (def) this.currentMatchId.set('default');
            }
        } catch (e) {
            console.error('Failed to fetch matches', e);
        }

        // 2. Wire up SDK Events
        sdkClient.events.on('connection:state', (state: string) => {
            this.isConnected.set(state === 'Connected');
        });

        sdkClient.events.on('state:viewState', (vs: ViewStatePayload) => {
            this.viewState.set(vs);
            this.isPaused.set(vs.isPaused);
            this.currentTimestamp.set(vs.timestamp);
        });

        // 3. Handle Match Transitions
        this.currentMatchId.subscribe((id) => {
            if (id) {
                sdkClient.joinMatch(this.currentSide.get(), id);
            }
        });
    },

    // --- Helper Methods ---
    
    setPaused(val: boolean) {
        this.isPaused.set(val);
        sdkClient.setTimeCompression(val ? 0 : this.timeCompression.get());
    },

    setTimeCompression(val: number) {
        this.timeCompression.set(val);
        if (!this.isPaused.get()) {
            sdkClient.setTimeCompression(val);
        }
    },

    getSelectedEntity(): ViewUnitPayload | ViewTrackPayload | null {
        const vs = this.viewState.get();
        const id = this.selectedEntityId.get();
        if (!vs || !id) return null;
        return vs.units.find(u => u.id === id) || vs.tracks.find(t => t.id === id) || null;
    },

    selectEntity(id: string | null) {
        this.selectedEntityId.set(id);
    },

    hoverEntity(id: string | null) {
        this.hoveredEntityId.set(id);
    },

    async issueCommand(command: unknown) {
        try {
            return await sdkClient.dispatchRest(command as EngineCommandPayload);
        } catch (e) {
            console.error('Command failed', e);
            throw e;
        }
    },

    joinMatch(side: Side, matchId: string) {
        this.currentMatchId.set(matchId);
        this.currentSide.set(side);
        sdkClient.joinMatch(side, matchId);
    },

    getLayerSignal(id: string): Observable<boolean> {
        let sig = this.layerVisibility.get(id);
        if (!sig) {
            sig = new Observable<boolean>(true);
            this.layerVisibility.set(id, sig);
        }
        return sig;
    },

    toggleLayer(id: string) {
        const sig = this.getLayerSignal(id);
        sig.set(!sig.get());
    }
};

