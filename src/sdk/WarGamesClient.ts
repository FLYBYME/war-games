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
import { BugModule } from "./BugModule.js";
import { ScenarioModule } from "./ScenarioModule.js";
import { TerrainModule } from "./TerrainModule.js";
import { DeltaDecoder } from "./DeltaDecoder.js";

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
    private readonly decoder = new DeltaDecoder();

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
                try {
                    errorText = await response.text();
                } catch (e2: unknown) {
                    errorText = e instanceof Error ? e.message : String(e);
                }
            }
            throw new Error(`API Request failed (${response.status}) on ${path}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data: unknown = await response.json();
            return data as T;
        } else if (contentType && contentType.includes('application/octet-stream')) {
            const data: unknown = await response.arrayBuffer();
            return data as T;
        }

        const data: unknown = await response.text();
        return data as T;
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
                this.ws.binaryType = 'arraybuffer';
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
            } catch (err: unknown) {
                clearTimeout(timeout);
                reject(err instanceof Error ? err : new Error(String(err)));
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
            this.send({ type: 'ISSUE_COMMAND', matchId: this.matchId!, command, sequence });
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
    /**
     * setTimeCompression: Sets simulation speed.
     * Use 0 to pause, 1 for realtime, >1 for fast-forward.
     */
    async setTimeCompression(rate: number): Promise<void> {
        if (!this.matchId) throw new NotJoinedError();
        await this.dispatch({
            type: 'SetSimulationSpeed',
            timeCompression: rate,
            isPaused: rate === 0
        });
    }

    async pause(): Promise<void> { await this.setTimeCompression(0); }
    async resume(rate = 1): Promise<void> { await this.setTimeCompression(rate); }

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
            // Handle Binary ViewState Snapshots
            const isBinary = event.data instanceof ArrayBuffer || 
                           (typeof Buffer !== 'undefined' && Buffer.isBuffer(event.data)) ||
                           (event.data && typeof event.data === 'object' && 'buffer' in event.data);

            if (isBinary) {
                let ab: ArrayBufferLike;
                if (event.data instanceof ArrayBuffer) {
                    ab = event.data;
                } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(event.data)) {
                    ab = event.data.buffer.slice(event.data.byteOffset, event.data.byteOffset + event.data.byteLength);
                } else {
                    // Fallback for other array-like objects (e.g. {buffer: ArrayBuffer})
                    const dataObj = event.data as { buffer: ArrayBufferLike };
                    ab = dataObj.buffer;
                }

                try {
                    const snapshot = this.decoder.decode(ab);
                    if (snapshot) {
                        this.lastViewState = snapshot;
                        this.currentTick = snapshot.tick;
                        this.events.emit('state:viewState', snapshot);
                    }
                } catch (decodeErr: unknown) {
                    this.events.emit('error', { 
                        message: 'Delta decoding failed', 
                        error: decodeErr instanceof Error ? decodeErr.message : String(decodeErr) 
                    });
                }
                return;
            }

            if (typeof event.data !== 'string') return;
            const msg = JSON.parse(event.data) as ServerMessage;
            switch (msg.type) {
                case 'VIEW_STATE': {
                    this.lastViewState = msg.payload;
                    this.currentTick = msg.payload.tick;
                    this.events.emit('state:viewState', msg.payload);
                    break;
                }

                case 'COMMAND_ACK': {
                    const payload = msg.payload;
                    const seq = payload.sequence;
                    const pending = seq ? this.pendingCommands.get(seq) : this.pendingCommands.get(payload.commandType);

                    if (pending) {
                        clearTimeout(pending.timeout);
                        if (seq) this.pendingCommands.delete(seq);
                        else this.pendingCommands.delete(payload.commandType);
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


// ─── SDK Modules (Moved to separate files) ───────────────────
