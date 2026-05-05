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

// ─── SDK Event Map ───────────────────────────────────────────

/**
 * All events the SDK can emit, documented for consumers.
 *
 * connection:stateChanged  — ConnectionState transition
 * state:viewState          — New ViewState snapshot (decoded)
 * state:paused             — Pause state changed
 * event:tactical           — Server-side tactical event
 * error                    — Unrecoverable error
 */

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
            const baseUrl = this.config.url.replace(/^ws/, 'http');
            const url = `${baseUrl}/api/matches/${this.matchId}/viewstate?side=${this.side || 'Neutral'}`;
            console.log(`[SDK] Querying ViewState: ${url}`);
            const response = await fetch(url);
            if (!response.ok) return this.lastViewState;
            
            const vs = await response.json() as ViewState;
            this.lastViewState = vs;
            this.currentTick = vs.tick;
            return vs;
        } catch (err) {
            console.error('[SDK] Failed to fetch latest viewstate:', err);
            return this.lastViewState;
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
        // Binary path: DeltaDecoder
        if (event.data instanceof ArrayBuffer) {
            try {
                const vs = DeltaDecoder.decode(event.data);
                this.processViewState(vs);
            } catch { /* corrupted binary frame — skip */ }
            return;
        }

        // JSON path
        try {
            const msg = JSON.parse(event.data) as ServerMessage;

            switch (msg.type) {
                case 'VIEW_STATE':
                    const vs = msg.payload as any;
                    // console.log(`[SDK] VIEW_STATE: Tick ${vs.tick} | Seq ${vs.sequence}`);
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
            console.error('Failed to parse message', err);
            this.events.emit('error', { message: 'Failed to parse message', data: event.data });
        }
    }

    private processViewState(vs: ViewState): void {
        // 1. Reset Detection
        if (vs.tick < this.currentTick || (vs.tick === 0 && vs.sequence < this.lastSequence)) {
            console.log(`[SDK] Simulation reset detected: Tick ${this.currentTick} -> ${vs.tick}, Seq ${this.lastSequence} -> ${vs.sequence}`);
            this.lastSequence = -1;
            this.currentTick = vs.tick;
        }

        // 2. Sequence Check
        if (vs.sequence <= this.lastSequence) return; // stale
        
        this.lastSequence = vs.sequence;
        this.currentTick = vs.tick;
        this.lastViewState = vs;
        this.events.emit('state:viewState', vs);
        this.events.emit('state:paused', vs.isPaused);
    }

    private resolveCommand(ack: { commandType: string; success: boolean; error?: string }): void {
        // Resolve the oldest pending command of this type
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

    // ─── Reconnection ────────────────────────────────────────

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

// ─── Sub-Module: Navigation ──────────────────────────────────

export class NavigationModule {
    constructor(private client: WarGamesClient) { }

    setCourse(entityId: EntityId, position: Vector3, speedKts: number) {
        return this.client.dispatch({ type: 'SetCourse', entityId, position, speedKts });
    }

    addWaypoint(entityId: EntityId, position: Vector3, speedKts: number) {
        return this.client.dispatch({ type: 'AddWaypoint', entityId, position, speedKts });
    }

    clearWaypoints(entityId: EntityId) {
        return this.client.dispatch({ type: 'ClearWaypoints', entityId });
    }

    setHeading(entityId: EntityId, heading: number) {
        this.client.dispatchImmediate({ type: 'SetHeading', entityId, heading });
    }

    setSpeed(entityId: EntityId, speedKts: number) {
        if (speedKts < 0) throw new CommandValidationError('SetSpeed', 'Speed cannot be negative');
        return this.client.dispatch({ type: 'SetSpeed', entityId, speedKts });
    }

    setAltitude(entityId: EntityId, altitudeM: number) {
        return this.client.dispatch({ type: 'SetAltitude', entityId, altitudeM });
    }

    joinFormation(entityId: EntityId, leaderId: EntityId, offset: Vector3) {
        return this.client.dispatch({ type: 'JoinFormation', entityId, leaderId, offset });
    }

    breakFormation(entityId: EntityId) {
        return this.client.dispatch({ type: 'BreakFormation', entityId });
    }
}

// ─── Sub-Module: Combat ──────────────────────────────────────

export class CombatModule {
    constructor(private client: WarGamesClient) { }

    fireWeapon(entityId: EntityId, mountIndex: number, targetId: EntityId) {
        if (mountIndex < 0) throw new CommandValidationError('FireWeapon', 'Mount index cannot be negative');
        return this.client.dispatch({ type: 'FireWeapon', entityId, mountIndex, targetId });
    }

    assignWeapon(entityId: EntityId, mount: string, targetId: EntityId) {
        return this.client.dispatch({ type: 'AssignWeapon', entityId, mount, targetId });
    }

    assignSensor(entityId: EntityId, sensor: string, targetId: EntityId) {
        return this.client.dispatch({ type: 'AssignSensor' as any, entityId, sensor, targetId });
    }

    applyDamage(entityId: EntityId, damage: number) {
        return this.client.dispatch({ type: 'ApplyDamage', entityId, damage });
    }

    destroyEntity(entityId: EntityId) {
        return this.client.dispatch({ type: 'DestroyEntity', entityId });
    }
}

// ─── Sub-Module: Sensors & EW ────────────────────────────────

export class SensorsModule {
    constructor(private client: WarGamesClient) { }

    setSensorState(entityId: EntityId, sensor: string, active: boolean) {
        return this.client.dispatch({ type: 'SetSensorState', entityId, sensor, active });
    }

    setEMCON(state: string, entityId?: EntityId) {
        return this.client.dispatch({ type: 'SetEMCON', entityId, state });
    }
}

// ─── Sub-Module: Logistics ───────────────────────────────────

export class LogisticsModule {
    constructor(private client: WarGamesClient) { }

    landAtFacility(entityId: EntityId, facilityId: EntityId) {
        return this.client.dispatch({ type: 'LandAtFacility', entityId, facilityId });
    }

    transferResources(fromId: EntityId, toId: EntityId, fuelKg: number) {
        return this.client.dispatch({ type: 'TransferResources', fromId, toId, fuelKg });
    }

    setLoadout(loadout: string) {
        return this.client.dispatch({ type: 'SetLoadout', loadout });
    }
}

// ─── Sub-Module: Doctrine ────────────────────────────────────

export class DoctrineModule {
    constructor(private client: WarGamesClient) { }

    setUnitROE(entityId: EntityId, roe: string) {
        return this.client.dispatch({ type: 'SetUnitROE', entityId, roe });
    }

    setGlobalROE(roe: string) {
        return this.client.dispatch({ type: 'SetGlobalROE', roe });
    }

    setMissionROE(roe: string) {
        return this.client.dispatch({ type: 'SetMissionROE', roe });
    }

    setMission(entityId: EntityId, missionType: string, params: any) {
        return this.client.dispatch({ type: 'SetMission', entityId, missionType, params });
    }

    setEnvironment(key: string, value: number) {
        return this.client.dispatch({ type: 'SetEnvironment', key, value });
    }
}

// ─── Sub-Module: Scenario & System ───────────────────────────

export class ScenarioModule {
    constructor(private client: WarGamesClient) { }

    private get apiBase(): string {
        const url = new URL(this.client['config'].url);
        const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
        return `${protocol}//${url.host}`;
    }

    async getCurrentState(): Promise<ViewState | null> {
        return await this.client.getLatestViewState();
    }

    pause() { this.client.pause(); }
    resume(rate = 1) { this.client.resume(rate); }

    spawnEntity(id: string, profileId: string, side: string, position: Vector3, heading: number = 0) {
        return this.client.dispatch({ type: 'SpawnEntity', id, profileId, side, position, heading } as any);
    }

    setTimeCompression(rate: number) {
        this.client.setTimeCompression(rate);
    }

    setIntent(intent: ScenarioIntent) {
        return this.client.dispatch({ type: 'SetIntent', intent });
    }

    exportScenario(): Promise<ScenarioManifest> {
        return new Promise((resolve) => {
            const unsub = this.client.events.once('scenario:exported', (payload: ScenarioManifest) => {
                resolve(payload);
            });
            this.client.send({ type: 'EXPORT_SCENARIO' as any, matchId: this.client.currentMatchId || 'default' });
        });
    }

    importScenario(payload: ScenarioManifest, options: { matchId?: string; side?: string } = {}): Promise<{ success: boolean }> {
        if (options.side) {
            (this.client as any).side = options.side;
        }
        return new Promise((resolve) => {
            this.client.events.once('scenario:imported', (result: any) => {
                resolve(result);
            });
            this.client.send({ 
                type: 'IMPORT_SCENARIO' as any, 
                matchId: options.matchId || (this.client as any).matchId || 'default', 
                payload 
            });
        });
    }

    async fetchProfiles(): Promise<{ units: [string, EntityProfile][], weapons: [string, any][] }> {
        const res = await fetch(`${this.apiBase}/api/database/profiles`);
        return res.json();
    }

    async saveProfile(id: string, profile: EntityProfile): Promise<{ success: boolean }> {
        const res = await fetch(`${this.apiBase}/api/database/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, profile })
        });
        return res.json();
    }

    // ─── Scenario File Management ────────────────────────────

    /** List all scenario files on the server */
    async listScenarios(): Promise<{ filename: string; name: string; description: string; entityCount: number }[]> {
        const res = await fetch(`${this.apiBase}/api/scenarios`);
        return res.json();
    }

    /** Get a single scenario manifest by filename */
    async getScenario(filename: string): Promise<ScenarioManifest> {
        const res = await fetch(`${this.apiBase}/api/scenarios/${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error(`Scenario not found: ${filename}`);
        return res.json();
    }

    /** Save a scenario manifest to the server */
    async saveScenario(filename: string, manifest: ScenarioManifest): Promise<{ success: boolean }> {
        const res = await fetch(`${this.apiBase}/api/scenarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, manifest })
        });
        return res.json();
    }

    /** Delete a scenario file */
    async deleteScenario(filename: string): Promise<{ success: boolean }> {
        const res = await fetch(`${this.apiBase}/api/scenarios/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        return res.json();
    }

    /** Load a scenario INTO the running engine (clears world, spawns entities) */
    async loadScenarioIntoEngine(filename: string): Promise<{ success: boolean; name?: string; entityCount?: number; matchId?: string }> {
        const res = await fetch(`${this.apiBase}/api/scenarios/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        return res.json();
    }
}

// ─── Sub-Module: Terrain ─────────────────────────────────────

export class TerrainModule {
    constructor(private client: WarGamesClient) { }

    private get apiBase(): string {
        const url = new URL(this.client['config'].url);
        const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
        return `${protocol}//${url.host}`;
    }

    /** Fetch the manifest of available terrain regions */
    async fetchManifest(): Promise<{ regions: MapRegion[] }> {
        const res = await fetch(`${this.apiBase}/api/terrain/manifest`);
        if (!res.ok) throw new Error('Failed to fetch terrain manifest');
        return res.json();
    }

    /** Fetch terrain storage statistics */
    async fetchStats(): Promise<{ 
        regions: number; 
        cachedEngineTiles: number; 
        cachedUITiles: number; 
        engineSizeMb: number;
        uiSizeMb: number;
        memoryCacheSize: number;
        pendingJobs: string[];
    }> {
        const res = await fetch(`${this.apiBase}/api/terrain/stats`);
        if (!res.ok) throw new Error('Failed to fetch terrain stats');
        return res.json();
    }

    /** Clear all cached terrain tiles from disk and memory */
    async clearCache(): Promise<{ success: boolean }> {
        const res = await fetch(`${this.apiBase}/api/terrain/clear-cache`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to clear terrain cache');
        return res.json();
    }

    /** Fetch a specific terrain tile (encoded WGT format) */
    async fetchTile(lat: number, lon: number): Promise<ArrayBuffer> {
        const res = await fetch(`${this.apiBase}/api/terrain/tiles/${lat}/${lon}`);
        if (!res.ok) throw new Error(`Tile not found: ${lat},${lon}`);
        return res.arrayBuffer();
    }

    /** Fetch a downsampled terrain tile for the UI */
    async fetchUITile(lat: number, lon: number): Promise<ArrayBuffer> {
        const res = await fetch(`${this.apiBase}/api/terrain/ui-tiles/${lat}/${lon}`);
        if (!res.ok) throw new Error(`UI Tile not found: ${lat},${lon}`);
        return res.arrayBuffer();
    }
}
