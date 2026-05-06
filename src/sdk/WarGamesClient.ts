import {
    EngineCommandPayload,
    ClientMessage,
    ServerMessage,
    EntityId,
    Vector3,
    ViewStatePayload as ViewState,
    ScenarioManifest,
    ScenarioIntent,
    EntityProfile,
    MapRegion
} from './schemas/index.js';
import { DeltaDecoder } from './DeltaDecoder.js';
import { EventEmitter } from './EventEmitter.js';
import {
    NetworkError,
    ConnectionTimeoutError,
    CommandRejectedError,
    NotConnectedError,
    NotJoinedError,
    CommandValidationError
} from './errors.js';
import { ToolDispatcher } from './ToolDispatcher.js';

// ─── SDK Types ───────────────────────────────────────────────

export enum ConnectionState {
    Disconnected = 'Disconnected',
    Connecting = 'Connecting',
    Connected = 'Connected',
    Reconnecting = 'Reconnecting',
    Error = 'Error'
}

export interface ClientConfig {
    /** Server WebSocket URL (e.g. ws://localhost:3000) */
    url: string;
    /** Max reconnection attempts before giving up (default: 10) */
    maxReconnectAttempts?: number;
    /** Initial reconnection delay in ms (default: 1000) */
    reconnectDelayMs?: number;
    /** Connection timeout in ms (default: 5000) */
    connectTimeoutMs?: number;
    /** Maximum time to wait for a COMMAND_ACK (default: 5000) */
    commandTimeoutMs?: number;
    /** Queue commands when disconnected and flush on reconnect (default: true) */
    offlineQueueEnabled?: boolean;
    /** Requested target frequency of delta updates (e.g. 2 for 2Hz). Defaults to server tick rate. */
    syncRateHz?: number;
    /** Interval to request a full baseline snapshot instead of a delta. Defaults to 0 (never). */
    fullSyncIntervalMs?: number;
}

interface PendingCommand {
    resolve: (ack: { commandType: string; success: boolean }) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

export interface MatchInfo {
    id: string;
    tick: number;
    entityCount: number;
    isPaused: boolean;
    timeCompression: number;
}

export interface WinState {
    over: boolean;
    winner?: string;
    reason?: string;
}

export interface TacticalEvent {
    tick: number;
    type?: string;
    severity: string;
    category: string;
    message: string;
    entityId?: string;
    pos?: Vector3;
    payload?: Record<string, any>;
}

// ─── Core Client ─────────────────────────────────────────────

export class WarGamesClient {
    // Sub-modules (lazy-initialized)
    public readonly nav: NavigationModule;
    public readonly combat: CombatModule;
    public readonly sensors: SensorsModule;
    public readonly logistics: LogisticsModule;
    public readonly doctrine: DoctrineModule;
    public readonly scenario: ScenarioModule;
    public readonly terrain: TerrainModule;
    public readonly tools: ToolDispatcher;
    public readonly events: EventEmitter;

    private ws: WebSocket | null = null;
    private config: Required<ClientConfig>;
    private state: ConnectionState = ConnectionState.Disconnected;
    private matchId: string | null = null;
    private side: string | null = null;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private offlineQueue: ClientMessage[] = [];
    private pendingCommands = new Map<string, PendingCommand>();
    private commandSequence = 0;
    private lastSequence = -1;
    private currentTick = 0;
    private lastViewState: ViewState | null = null;

    constructor(config: ClientConfig) {
        this.config = {
            url: config.url,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
            reconnectDelayMs: config.reconnectDelayMs ?? 1000,
            connectTimeoutMs: config.connectTimeoutMs ?? 5000,
            commandTimeoutMs: config.commandTimeoutMs ?? 5000,
            offlineQueueEnabled: config.offlineQueueEnabled ?? true,
            syncRateHz: config.syncRateHz,
            fullSyncIntervalMs: config.fullSyncIntervalMs
        };

        this.events = new EventEmitter();
        this.nav = new NavigationModule(this);
        this.combat = new CombatModule(this);
        this.sensors = new SensorsModule(this);
        this.logistics = new LogisticsModule(this);
        this.doctrine = new DoctrineModule(this);
        this.scenario = new ScenarioModule(this);
        this.terrain = new TerrainModule(this);
        this.tools = new ToolDispatcher(this);
    }

    // ─── API Helper ──────────────────────────────────────────

    public get apiBaseUrl(): string {
        const url = new URL(this.config.url);
        const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
        return `${protocol}//${url.host}`;
    }

    public async apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
        const url = `${this.apiBaseUrl}${path}`;
        const response = await fetch(url, {
            ...init,
            headers: {
                ...(init?.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
                ...init?.headers
            }
        });

        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const errJson = await response.json();
                errorText = JSON.stringify(errJson);
            } catch (e) {
                try { errorText = await response.text(); } catch (e2) {}
            }
            throw new Error(`API Request failed (${response.status}) on ${path}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return (await response.json()) as T;
        } else if (contentType && contentType.includes('application/octet-stream')) {
            return (await response.arrayBuffer()) as unknown as T;
        }

        return (await response.text()) as unknown as T;
    }

    // ─── Connection Lifecycle ────────────────────────────────

    get connectionState(): ConnectionState { return this.state; }
    get currentMatchId(): string | null { return this.matchId; }
    get currentSide(): string | null { return this.side; }

    async connect(): Promise<void> {
        if (this.state === ConnectionState.Connected) return;
        this.setState(ConnectionState.Connecting);

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.ws?.close();
                reject(new ConnectionTimeoutError(this.config.url, this.config.connectTimeoutMs));
            }, this.config.connectTimeoutMs);

            try {
                this.ws = new WebSocket(this.config.url);
                this.ws.binaryType = 'arraybuffer';

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.reconnectAttempts = 0;
                    this.setState(ConnectionState.Connected);
                    this.flushOfflineQueue();
                    resolve();
                };

                this.ws.onmessage = (event) => this.handleMessage(event);

                this.ws.onclose = () => {
                    this.setState(ConnectionState.Disconnected);
                    this.scheduleReconnect();
                };

                this.ws.onerror = (e) => {
                    clearTimeout(timeout);
                    this.setState(ConnectionState.Error);
                    reject(new NetworkError('WebSocket connection failed', e));
                };
            } catch (e) {
                clearTimeout(timeout);
                reject(new NetworkError('Failed to create WebSocket', e));
            }
        });
    }

    disconnect(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.reconnectAttempts = this.config.maxReconnectAttempts; // prevent auto-reconnect
        this.ws?.close();
        this.ws = null;
        this.matchId = null;
        this.side = null;
        this.offlineQueue = [];
        this.rejectAllPending('Client disconnected');
        this.setState(ConnectionState.Disconnected);
        this.events.removeAllListeners();
    }

    // ─── Session & Match ─────────────────────────────────────

    joinMatch(side: string, matchId = 'default'): void {
        this.matchId = matchId;
        this.side = side;
        this.currentTick = 0;
        this.lastSequence = -1;
        this.send({ 
            type: 'JOIN_MATCH', 
            matchId, 
            side, 
            syncRateHz: this.config.syncRateHz,
            fullSyncIntervalMs: this.config.fullSyncIntervalMs
        });
    }

    leaveMatch(): void {
        this.matchId = null;
        this.side = null;
    }

    // ─── Command Pipeline ────────────────────────────────────

    public getTickCount(): number {
        return this.currentTick;
    }

    public async getLatestViewState(): Promise<ViewState | null> {
        if (!this.matchId) return this.lastViewState;
        try {
            const vs = await this.apiFetch<ViewState>(`/api/matches/${this.matchId}/viewstate?side=${this.side || 'Neutral'}`);
            this.lastViewState = vs;
            this.currentTick = vs.tick;
            return vs;
        } catch (err) {
            return this.lastViewState;
        }
    }

    public async listMatches(): Promise<MatchInfo[]> {
        try {
            return await this.apiFetch<MatchInfo[]>('/api/matches');
        } catch (err) {
            return [];
        }
    }

    public async deleteMatch(matchId: string): Promise<{ success: boolean }> {
        try {
            return await this.apiFetch<{ success: boolean }>(`/api/matches/${encodeURIComponent(matchId)}`, { method: 'DELETE' });
        } catch (err) {
            return { success: false };
        }
    }

    public async queryWinState(matchId: string): Promise<WinState> {
        try {
            return await this.apiFetch<WinState>(`/api/matches/${encodeURIComponent(matchId)}/winstate`);
        } catch (err) {
            return { over: false };
        }
    }

    public async getRecentEvents(matchId: string, count: number = 50): Promise<TacticalEvent[]> {
        try {
            return await this.apiFetch<TacticalEvent[]>(`/api/matches/${encodeURIComponent(matchId)}/events?count=${count}`);
        } catch (err) {
            return [];
        }
    }

    public async getProfile(profileId: string): Promise<any> {
        try {
            return await this.apiFetch<any>(`/api/matches/profiles/${encodeURIComponent(profileId)}`);
        } catch (err) {
            return null;
        }
    }

    /**
     * Dispatch a command to the server.
     * Returns a Promise that resolves when the server ACKs the command.
     */
    dispatch(command: EngineCommandPayload): Promise<{ commandType: string; success: boolean }> {
        if (!this.matchId) throw new NotJoinedError();

        return new Promise((resolve, reject) => {
            const key = `${command.type}-${this.commandSequence++}`;
            const timer = setTimeout(() => {
                this.pendingCommands.delete(key);
                reject(new CommandRejectedError(command.type, 'Command timed out'));
            }, this.config.commandTimeoutMs);

            this.pendingCommands.set(key, { resolve, reject, timer });
            this.send({ type: 'ISSUE_COMMAND', matchId: this.matchId!, command });
        });
    }

    /** Fire-and-forget variant for high-frequency commands (e.g. heading updates) */
    dispatchImmediate(command: EngineCommandPayload): void {
        if (!this.matchId) throw new NotJoinedError();
        this.send({ type: 'ISSUE_COMMAND', matchId: this.matchId, command });
    }

    /** 
     * REST-based dispatch: Ensures synchronous execution and validation. 
     * Throws an error if validation or execution fails.
     */
    async dispatchRest(command: EngineCommandPayload): Promise<{ commandType: string; success: boolean }> {
        if (!this.matchId) throw new NotJoinedError();

        return await this.apiFetch<{ commandType: string; success: boolean }>(`/api/matches/${this.matchId}/commands`, {
            method: 'POST',
            body: JSON.stringify({ command, side: this.side || 'Neutral' })
        });
    }

    /**
     * REST-based deterministic stepping.
     */
    async stepRest(durationMinutes: number): Promise<{ success: boolean; elapsedSeconds: number; interruptedByEvent: boolean; events: any[]; currentTick: number; elapsedTicks: number }> {
        if (!this.matchId) throw new NotJoinedError();

        return await this.apiFetch<{ success: boolean; elapsedSeconds: number; interruptedByEvent: boolean; events: any[]; currentTick: number; elapsedTicks: number }>(`/api/matches/${this.matchId}/step`, {
            method: 'POST',
            body: JSON.stringify({ durationMinutes, side: this.side || 'Neutral' })
        });
    }

    // ─── Time Compression ────────────────────────────────────

    setTimeCompression(rate: number): void {
        if (!this.matchId) throw new NotJoinedError();
        this.send({ type: 'SET_TIME_COMPRESSION', matchId: this.matchId, rate });
    }

    pause(): void { this.setTimeCompression(0); }
    resume(rate = 1): void { this.setTimeCompression(rate); }

    // ─── Internal Transport ──────────────────────────────────

    /** @internal — used by sub-modules */
    send(msg: ClientMessage): void {
        if (this.ws && this.state === ConnectionState.Connected) {
            this.ws.send(JSON.stringify(msg));
        } else if (this.config.offlineQueueEnabled) {
            this.offlineQueue.push(msg);
        } else {
            throw new NotConnectedError();
        }
    }

    private handleMessage(event: MessageEvent): void {
        if (event.data instanceof ArrayBuffer) {
            try {
                const vs = DeltaDecoder.decode(event.data);
                this.processViewState(vs);
            } catch { }
            return;
        }

        try {
            const msg = JSON.parse(event.data) as ServerMessage;

            switch (msg.type) {
                case 'VIEW_STATE':
                    const vs = msg.payload as any;
                    this.currentTick = vs.tick;
                    this.processViewState(vs);
                    break;

                case 'COMMAND_ACK':
                    this.resolveCommand(msg.payload as { commandType: string; success: boolean; error?: string });
                    break;

                case 'SCENARIO_IMPORTED':
                    this.lastSequence = -1;
                    this.currentTick = 0;
                    if ((msg.payload as any).matchId) {
                        this.matchId = (msg.payload as any).matchId;
                    }
                    this.resolveCommand(msg.payload as any);
                    this.events.emit('scenario:imported', msg.payload);
                    break;

                case 'EVENT':
                   const evt = msg.payload as any;
                   this.events.emit('events:new', evt);
                   if (evt.type) {
                       this.events.emit(`event:${evt.type}`, evt);
                   }
                   break;
                case 'ERROR':
                    this.events.emit('error', msg.payload);
                    break;

                case 'SCENARIO_EXPORTED':
                    this.events.emit('scenario:exported', msg.payload);
                    break;

                case 'PROFILE_LIST':
                    this.events.emit('profiles:loaded', msg.payload);
                    break;
            }
        } catch (err) {
            this.events.emit('error', { message: 'Failed to parse message', data: event.data });
        }
    }

    private processViewState(vs: ViewState): void {
        if (vs.tick < this.currentTick || (vs.tick === 0 && vs.sequence < this.lastSequence)) {
            this.lastSequence = -1;
            this.currentTick = vs.tick;
        }

        if (vs.sequence <= this.lastSequence) return;
        
        this.lastSequence = vs.sequence;
        this.currentTick = vs.tick;
        this.lastViewState = vs;
        this.events.emit('state:viewState', vs);
        this.events.emit('state:paused', vs.isPaused);
    }

    private resolveCommand(ack: { commandType: string; success: boolean; error?: string }): void {
        for (const [key, pending] of this.pendingCommands) {
            if (key.startsWith(ack.commandType)) {
                clearTimeout(pending.timer);
                this.pendingCommands.delete(key);

                if (ack.success) {
                    pending.resolve({ commandType: ack.commandType, success: true });
                } else {
                    pending.reject(new CommandRejectedError(ack.commandType, ack.error || 'Unknown'));
                }
                return;
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.events.emit('error', { message: 'Max reconnection attempts reached' });
            return;
        }

        this.setState(ConnectionState.Reconnecting);
        const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                if (this.matchId && this.side) {
                    this.joinMatch(this.side, this.matchId);
                }
            } catch {
                this.scheduleReconnect();
            }
        }, Math.min(delay, 30000));
    }

    private flushOfflineQueue(): void {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        for (const msg of queue) {
            this.send(msg);
        }
    }

    private rejectAllPending(reason: string): void {
        for (const [key, pending] of this.pendingCommands) {
            clearTimeout(pending.timer);
            pending.reject(new NetworkError(reason));
        }
        this.pendingCommands.clear();
    }

    private setState(state: ConnectionState): void {
        if (this.state === state) return;
        this.state = state;
        this.events.emit('connection:stateChanged', state);
    }
}

// ─── Sub-Modules ─────────────────────────────────────────────

export class NavigationModule {
    constructor(private client: WarGamesClient) { }
    setCourse(entityId: EntityId, position: Vector3, speedKts: number) { return this.client.dispatch({ type: 'SetCourse', entityId, position, speedKts }); }
    addWaypoint(entityId: EntityId, position: Vector3, speedKts: number) { return this.client.dispatch({ type: 'AddWaypoint', entityId, position, speedKts }); }
    clearWaypoints(entityId: EntityId) { return this.client.dispatch({ type: 'ClearWaypoints', entityId }); }
    setHeading(entityId: EntityId, heading: number) { this.client.dispatchImmediate({ type: 'SetHeading', entityId, heading }); }
    setSpeed(entityId: EntityId, speedKts: number) { if (speedKts < 0) throw new CommandValidationError('SetSpeed', 'Speed cannot be negative'); return this.client.dispatch({ type: 'SetSpeed', entityId, speedKts }); }
    setAltitude(entityId: EntityId, altitudeM: number) { return this.client.dispatch({ type: 'SetAltitude', entityId, altitudeM }); }
    joinFormation(entityId: EntityId, leaderId: EntityId, offset: Vector3) { return this.client.dispatch({ type: 'JoinFormation', entityId, leaderId, offset }); }
    breakFormation(entityId: EntityId) { return this.client.dispatch({ type: 'BreakFormation', entityId }); }
}

export class CombatModule {
    constructor(private client: WarGamesClient) { }
    fireWeapon(entityId: EntityId, mountIndex: number, targetId: EntityId) { if (mountIndex < 0) throw new CommandValidationError('FireWeapon', 'Mount index cannot be negative'); return this.client.dispatch({ type: 'FireWeapon', entityId, mountIndex, targetId }); }
    assignWeapon(entityId: EntityId, mount: string, targetId: EntityId) { return this.client.dispatch({ type: 'AssignWeapon', entityId, mount, targetId }); }
    assignSensor(entityId: EntityId, sensor: string, targetId: EntityId) { return this.client.dispatch({ type: 'AssignSensor' as any, entityId, sensor, targetId }); }
    applyDamage(entityId: EntityId, damage: number) { return this.client.dispatch({ type: 'ApplyDamage', entityId, damage }); }
    destroyEntity(entityId: EntityId) { return this.client.dispatch({ type: 'DestroyEntity', entityId }); }
}

export class SensorsModule {
    constructor(private client: WarGamesClient) { }
    setSensorState(entityId: EntityId, sensor: string, active: boolean) { return this.client.dispatch({ type: 'SetSensorState', entityId, sensor, active }); }
    setEMCON(state: string, entityId?: EntityId) { return this.client.dispatch({ type: 'SetEMCON', entityId, state }); }
}

export class LogisticsModule {
    constructor(private client: WarGamesClient) { }
    landAtFacility(entityId: EntityId, facilityId: EntityId) { return this.client.dispatch({ type: 'LandAtFacility', entityId, facilityId }); }
    transferResources(fromId: EntityId, toId: EntityId, fuelKg: number) { return this.client.dispatch({ type: 'TransferResources', fromId, toId, fuelKg }); }
    setLoadout(loadout: string) { return this.client.dispatch({ type: 'SetLoadout', loadout }); }
}

export class DoctrineModule {
    constructor(private client: WarGamesClient) { }
    setUnitROE(entityId: EntityId, roe: string) { return this.client.dispatch({ type: 'SetUnitROE', entityId, roe }); }
    setGlobalROE(roe: string) { return this.client.dispatch({ type: 'SetGlobalROE', roe }); }
    setMissionROE(roe: string) { return this.client.dispatch({ type: 'SetMissionROE', roe }); }
    setMission(entityId: EntityId, missionType: string, params: any) { return this.client.dispatch({ type: 'SetMission', entityId, missionType, params }); }
    setEnvironment(key: string, value: number) { return this.client.dispatch({ type: 'SetEnvironment', key, value }); }
}

export class ScenarioModule {
    constructor(private client: WarGamesClient) { }
    async getCurrentState(): Promise<ViewState | null> { return await this.client.getLatestViewState(); }
    async listMatches(): Promise<MatchInfo[]> { return await this.client.listMatches(); }
    async deleteMatch(matchId: string): Promise<{ success: boolean }> { return await this.client.deleteMatch(matchId); }
    async queryWinState(matchId: string): Promise<WinState> { return await this.client.queryWinState(matchId); }
    async getRecentEvents(matchId: string, count: number = 50): Promise<TacticalEvent[]> { return await this.client.getRecentEvents(matchId, count); }
    async getProfile(profileId: string): Promise<any> { return await this.client.getProfile(profileId); }
    pause() { this.client.pause(); }
    resume(rate = 1) { this.client.resume(rate); }
    spawnEntity(id: string, profileId: string, side: string, position: Vector3, heading: number = 0) { return this.client.dispatch({ type: 'SpawnEntity', id, profileId, side, position, heading } as any); }
    setTimeCompression(rate: number) { this.client.setTimeCompression(rate); }
    setIntent(intent: ScenarioIntent) { return this.client.dispatch({ type: 'SetIntent', intent }); }
    exportScenario(): Promise<ScenarioManifest> { return new Promise((resolve) => { this.client.events.once('scenario:exported', (payload: ScenarioManifest) => { resolve(payload); }); this.client.send({ type: 'EXPORT_SCENARIO' as any, matchId: this.client.currentMatchId || 'default' }); }); }
    importScenario(payload: ScenarioManifest, options: { matchId?: string; side?: string } = {}): Promise<{ success: boolean }> { if (options.side) { (this.client as any).side = options.side; } return new Promise((resolve) => { this.client.events.once('scenario:imported', (result: any) => { resolve(result); }); this.client.send({ type: 'IMPORT_SCENARIO' as any, matchId: options.matchId || (this.client as any).matchId || 'default', payload }); }); }
    async fetchProfiles(): Promise<{ units: [string, EntityProfile][], weapons: [string, any][] }> { return await this.client.apiFetch('/api/database/profiles'); }
    async saveProfile(id: string, profile: EntityProfile): Promise<{ success: boolean }> { return await this.client.apiFetch('/api/database/profiles', { method: 'POST', body: JSON.stringify({ id, profile }) }); }
    async listScenarios(): Promise<{ filename: string; name: string; description: string; entityCount: number }[]> { return await this.client.apiFetch('/api/scenarios'); }
    async getScenario(filename: string): Promise<ScenarioManifest> { return await this.client.apiFetch(`/api/scenarios/${encodeURIComponent(filename)}`); }
    async saveScenario(filename: string, manifest: ScenarioManifest): Promise<{ success: boolean }> { return await this.client.apiFetch('/api/scenarios', { method: 'POST', body: JSON.stringify({ filename, manifest }) }); }
    async deleteScenario(filename: string): Promise<{ success: boolean }> { return await this.client.apiFetch(`/api/scenarios/${encodeURIComponent(filename)}`, { method: 'DELETE' }); }
    async loadScenarioIntoEngine(filename: string): Promise<{ success: boolean; name?: string; entityCount?: number; matchId?: string }> { return await this.client.apiFetch('/api/scenarios/load', { method: 'POST', body: JSON.stringify({ filename }) }); }
    async getTelemetry(matchId: string): Promise<Record<string, any[]>> { return await this.client.apiFetch(`/api/matches/${encodeURIComponent(matchId)}/telemetry`); }
}

export class TerrainModule {
    constructor(private client: WarGamesClient) { }
    async fetchManifest(): Promise<{ regions: MapRegion[] }> { return await this.client.apiFetch('/api/terrain/manifest'); }
    async fetchStats(): Promise<{ regions: number; cachedEngineTiles: number; cachedUITiles: number; engineSizeMb: number; uiSizeMb: number; memoryCacheSize: number; pendingJobs: string[]; }> { return await this.client.apiFetch('/api/terrain/stats'); }
    async clearCache(): Promise<{ success: boolean }> { return await this.client.apiFetch('/api/terrain/clear-cache', { method: 'POST' }); }
    async fetchTile(lat: number, lon: number): Promise<ArrayBuffer> { return await this.client.apiFetch(`/api/terrain/tiles/${lat}/${lon}`); }
    async fetchUITile(lat: number, lon: number): Promise<ArrayBuffer> { return await this.client.apiFetch(`/api/terrain/ui-tiles/${lat}/${lon}`); }
}
