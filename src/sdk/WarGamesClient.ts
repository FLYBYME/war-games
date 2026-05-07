import {
    ViewStatePayload as ViewState,
    Side,
    MatchInfo,
    EngineCommandPayload,
    ServerMessage,
    ClientMessage,
    ScenarioIntent,
    Vector3,
    TacticalEvent,
    EntityProfile,
    MissionType
} from "./schemas/index.js";
import { BugReport } from "./schemas/bugs.js";
import { EventEmitter } from "./EventEmitter.js";
import { ToolDispatcher } from "./ToolDispatcher.js";
import { NotJoinedError, ConnectionTimeoutError } from "./errors.js";

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
    reconnectDelayMs?: number;
    /** Connection timeout in ms (default: 5000) */
    connectTimeoutMs?: number;
    /** Maximum time to wait for a COMMAND_ACK (default: 5000) */
    commandTimeoutMs?: number;
    /** Request a specific viewstate sync rate from the server */
    syncRateHz?: number;
    /** Request a full sync interval in ms */
    fullSyncIntervalMs?: number;
    /** Whether to queue commands when disconnected */
    offlineQueueEnabled?: boolean;
}

interface PendingCommand {
    resolve: (res: { commandType: string; success: boolean }) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * WarGamesClient: Primary SDK entry point.
 */
export class WarGamesClient {
    public readonly scenario: ScenarioModule;
    public readonly terrain: TerrainModule;
    public readonly bugs: BugModule;
    public readonly tools: ToolDispatcher;
    public readonly events: EventEmitter;

    private ws: WebSocket | null = null;
    private config: Required<ClientConfig>;
    private state: ConnectionState = ConnectionState.Disconnected;
    private matchId: string | null = null;
    public side: Side | null = null;
    private reconnectAttempts = 0;
    private offlineQueue: ClientMessage[] = [];
    private pendingCommands = new Map<string, PendingCommand>();
    private commandSequence = 0;
    private currentTick = 0;
    private lastViewState: ViewState | null = null;

    constructor(config: ClientConfig) {
        this.config = {
            reconnectDelayMs: 1000,
            connectTimeoutMs: 5000,
            commandTimeoutMs: 5000,
            syncRateHz: 10,
            fullSyncIntervalMs: 500,
            offlineQueueEnabled: true,
            ...config
        };

        this.events = new EventEmitter();
        this.scenario = new ScenarioModule(this);
        this.terrain = new TerrainModule(this);
        this.bugs = new BugModule(this);
        this.tools = new ToolDispatcher(this);
    }

    // ─── API Helper ──────────────────────────────────────────

    public get apiBaseUrl(): string {
        const url = new URL(this.config.url);
        const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
        return `${protocol}//${url.host}`;
    }

    public async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
            } catch (e: unknown) {
                try { errorText = await response.text(); } catch (e2: unknown) {
                    const error = e as Error;
                    errorText = error.message;
                }
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
    get currentSide(): Side | null { return this.side; }

    async connect(): Promise<void> {
        if (this.state === ConnectionState.Connected) return;

        this.setState(ConnectionState.Connecting);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.ws?.close();
                reject(new ConnectionTimeoutError(this.config.url, this.config.connectTimeoutMs));
            }, this.config.connectTimeoutMs);

            try {
                this.ws = new WebSocket(this.config.url);
                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.onConnected();
                    resolve();
                };

                this.ws.onmessage = (event) => this.onMessage(event);
                this.ws.onclose = () => this.onDisconnected();
                this.ws.onerror = (err) => {
                    this.events.emit('error', err);
                    if (this.state === ConnectionState.Connecting) {
                        clearTimeout(timeout);
                        reject(err);
                    }
                };
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });
    }

    disconnect(): void {
        this.ws?.close();
        this.setState(ConnectionState.Disconnected);
        this.events.removeAllListeners();
    }

    // ─── Session & Match ─────────────────────────────────────

    joinMatch(side: Side, matchId = 'default'): void {
        this.matchId = matchId;
        this.side = side;
        this.currentTick = 0;
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

    async dispatch(command: EngineCommandPayload): Promise<{ commandType: string; success: boolean }> {
        if (!this.matchId) throw new NotJoinedError();

        const sequence = String(++this.commandSequence);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(sequence);
                reject(new Error(`Command ${command.type} timed out after ${this.config.commandTimeoutMs}ms`));
            }, this.config.commandTimeoutMs);

            this.pendingCommands.set(sequence, { resolve, reject, timeout });
            this.send({ type: 'ISSUE_COMMAND', matchId: this.matchId!, command });
        });
    }

    /** Fire-and-forget variant for high-frequency commands (e.g. heading updates) */
    dispatchImmediate(command: ClientMessage): void {
        if (!this.matchId) throw new NotJoinedError();
        this.send(command);
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
    async stepRest(durationMinutes: number): Promise<{ success: boolean; elapsedSeconds: number; interruptedByEvent: boolean; events: unknown[] }> {
        if (!this.matchId) throw new NotJoinedError();

        return await this.apiFetch<{ success: boolean; elapsedSeconds: number; interruptedByEvent: boolean; events: unknown[] }>(`/api/matches/${this.matchId}/step`, {
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

    // ─── Data Access ─────────────────────────────────────────

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
        } catch (err: unknown) {
            return this.lastViewState;
        }
    }

    public async listMatches(): Promise<MatchInfo[]> {
        try {
            return await this.apiFetch<MatchInfo[]>('/api/matches');
        } catch (err: unknown) {
            return [];
        }
    }

    public async deleteMatch(matchId: string): Promise<{ success: boolean }> {
        try {
            return await this.apiFetch<{ success: boolean }>(`/api/matches/${encodeURIComponent(matchId)}`, { method: 'DELETE' });
        } catch (err: unknown) {
            return { success: false };
        }
    }

    public async queryWinState(matchId: string): Promise<{ over: boolean, winner?: string }> {
        try {
            return await this.apiFetch<{ over: boolean, winner?: string }>(`/api/matches/${encodeURIComponent(matchId)}/winstate`);
        } catch (err: unknown) {
            return { over: false };
        }
    }

    public async getRecentEvents(matchId: string, count: number = 50): Promise<TacticalEvent[]> {
        try {
            return await this.apiFetch<TacticalEvent[]>(`/api/matches/${encodeURIComponent(matchId)}/events?count=${count}`);
        } catch (err: unknown) {
            return [];
        }
    }

    public async getProfile(profileId: string): Promise<EntityProfile | null> {
        try {
            return await this.apiFetch<EntityProfile>(`/api/matches/profiles/${encodeURIComponent(profileId)}`);
        } catch (err: unknown) {
            return null;
        }
    }

    // ─── Internal ────────────────────────────────────────────

    private setState(state: ConnectionState): void {
        this.state = state;
        this.events.emit('connection:state', state);
    }

    private onConnected(): void {
        this.setState(ConnectionState.Connected);
        this.reconnectAttempts = 0;

        // Rejoin match if we were in one
        if (this.matchId && this.side) {
            this.joinMatch(this.side, this.matchId);
        }

        // Process offline queue
        while (this.offlineQueue.length > 0) {
            const msg = this.offlineQueue.shift();
            if (msg) this.send(msg);
        }
    }

    private onDisconnected(): void {
        if (this.state !== ConnectionState.Disconnected) {
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        this.setState(ConnectionState.Reconnecting);
        this.reconnectAttempts++;
        setTimeout(() => {
            void this.connect();
        }, this.config.reconnectDelayMs);
    }

    private onMessage(event: MessageEvent): void {
        try {
            const msg = JSON.parse(event.data as string) as ServerMessage;
            switch (msg.type) {
                case 'VIEW_STATE': {
                    this.lastViewState = msg.payload;
                    this.currentTick = msg.payload.tick;
                    this.events.emit('state:viewState', msg.payload);
                    break;
                }

                case 'COMMAND_ACK': {
                    const payload = msg.payload;
                    const pending = this.pendingCommands.get(payload.commandType);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pendingCommands.delete(payload.commandType);
                        if (payload.success) {
                            pending.resolve({ commandType: payload.commandType, success: true });
                        } else {
                            pending.reject(new Error(payload.error || 'Unknown error'));
                        }
                    }
                    break;
                }

                case 'EVENT': {
                    const evt = msg.payload;
                    this.events.emit('events:new', evt);
                    if (evt.type) {
                        this.events.emit(`event:${evt.type}`, evt);
                    }
                    break;
                }

                case 'ERROR': {
                    this.events.emit('error', msg.payload);
                    break;
                }

                case 'SCENARIO_EXPORTED': {
                    this.events.emit('scenario:exported', msg.payload);
                    break;
                }

                case 'SCENARIO_IMPORTED': {
                    this.events.emit('scenario:imported', msg.payload);
                    break;
                }
            }
        } catch (err: unknown) {
            this.events.emit('error', { message: 'Failed to parse message', data: event.data });
        }
    }

    private send(msg: ClientMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else if (this.config.offlineQueueEnabled) {
            this.offlineQueue.push(msg);
        }
    }
}

// ─── SDK Modules ─────────────────────────────────────────────

export class BugModule {
    constructor(private client: WarGamesClient) { }
    async list() {
        return await this.client.apiFetch<BugReport[]>('/api/bugs');
    }
    async get(id: string) {
        return await this.client.apiFetch<BugReport>(`/api/bugs/${id}`);
    }
    async report(data: unknown) {
        return await this.client.apiFetch<BugReport>('/api/bugs', { method: 'POST', body: JSON.stringify(data) });
    }
    async update(id: string, updates: unknown) {
        return await this.client.apiFetch<BugReport>(`/api/bugs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
    }
    async comment(id: string, data: unknown) {
        return await this.client.apiFetch<unknown>(`/api/bugs/${id}/comments`, { method: 'POST', body: JSON.stringify(data) });
    }
}

export class ScenarioModule {
    constructor(private client: WarGamesClient) { }
    async getCurrentState(): Promise<ViewState | null> {
        return await this.client.getLatestViewState();
    }
    async listMatches(): Promise<MatchInfo[]> {
        return await this.client.listMatches();
    }
    async deleteMatch(matchId: string): Promise<{ success: boolean }> {
        return await this.client.deleteMatch(matchId);
    }
    async queryWinState(matchId: string): Promise<{ over: boolean, winner?: string }> {
        return await this.client.queryWinState(matchId);
    }
    async getRecentEvents(matchId: string, count: number = 50): Promise<TacticalEvent[]> {
        return await this.client.getRecentEvents(matchId, count);
    }
    async getProfile(profileId: string): Promise<EntityProfile | null> {
        return await this.client.getProfile(profileId);
    }
    exportScenario(): Promise<unknown> { return new Promise((resolve) => { this.client.events.once('scenario:exported', (payload: unknown) => { resolve(payload); }); this.client.dispatchImmediate({ type: 'EXPORT_SCENARIO', matchId: this.client.currentMatchId || 'default' } as unknown as ClientMessage); }); }
    importScenario(payload: unknown, options: { matchId?: string; side?: Side } = {}): Promise<{ success: boolean }> {
        if (options.side) { this.client.side = options.side; }
        return new Promise((resolve) => {
            this.client.events.once('scenario:imported', (result: { success: boolean }) => { resolve(result); });
            this.client.dispatchImmediate({
                type: 'IMPORT_SCENARIO',
                matchId: options.matchId || this.client.currentMatchId || 'default',
                payload: payload as unknown as Record<string, unknown>
            });
        });
    }
    async fetchProfiles(): Promise<{ units: [string, EntityProfile][], weapons: [string, unknown][] }> {
        return await this.client.apiFetch('/api/database/profiles');
    }
    async saveProfile(id: string, profile: EntityProfile): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/database/profiles', { method: 'POST', body: JSON.stringify({ id, profile }) });
    }
    async listScenarios(): Promise<{ filename: string; name: string; description: string; entityCount: number }[]> {
        return await this.client.apiFetch('/api/scenarios');
    }
    async getScenario(filename: string): Promise<unknown> {
        return await this.client.apiFetch(`/api/scenarios/${encodeURIComponent(filename)}`);
    }
    async saveScenario(filename: string, manifest: unknown): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/scenarios', { method: 'POST', body: JSON.stringify({ filename, manifest }) });
    }
    async deleteScenario(filename: string): Promise<{ success: boolean }> {
        return await this.client.apiFetch(`/api/scenarios/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    }
    async loadScenarioIntoEngine(filename: string): Promise<{ success: boolean; name?: string; entityCount?: number; matchId?: string }> { return await this.client.apiFetch('/api/scenarios/load', { method: 'POST', body: JSON.stringify({ filename }) }); }
    async getTelemetry(matchId: string): Promise<Record<string, unknown[]>> { return await this.client.apiFetch(`/api/matches/${encodeURIComponent(matchId)}/telemetry`); }
}

export class TerrainModule {
    constructor(private client: WarGamesClient) { }
    async fetchManifest(): Promise<{ regions: unknown[] }> {
        return await this.client.apiFetch('/api/terrain/manifest');
    }
    async fetchStats(): Promise<{ regions: number; cachedEngineTiles: number; cachedUITiles: number; engineSizeMb: number; uiSizeMb: number; memoryCacheSize: number; pendingJobs: string[]; }> {
        return await this.client.apiFetch('/api/terrain/stats');
    }
    async clearCache(): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/terrain/clear-cache', { method: 'POST' });
    }
    async fetchTile(lat: number, lon: number): Promise<ArrayBuffer> {
        return await this.client.apiFetch(`/api/terrain/tiles/${lat}/${lon}`);
    }
    async fetchUITile(lat: number, lon: number): Promise<ArrayBuffer> {
        return await this.client.apiFetch(`/api/terrain/ui-tiles/${lat}/${lon}`);
    }
}
