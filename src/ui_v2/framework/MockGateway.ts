import { UIStore } from './UIStore';
import { ViewStatePayload } from '../shared/types';
import { Side } from '../../sdk/schemas/domain';

/**
 * MockGateway: A lightweight utility for E2E testing.
 * Injects static ViewStateSnapshot payloads to test UI rendering
 * without needing the full engine backend.
 */
export class MockGateway {
    private timer: any = null;
    private tickCount = 0;

    constructor() {}

    /** Inject a single static snapshot */
    public injectSnapshot(snapshot: Partial<ViewStatePayload>) {
        const fullSnapshot: ViewStatePayload = {
            tick: this.tickCount++,
            timestamp: Date.now(),
            sequence: this.tickCount,
            isPaused: false,
            side: Side.Blue,
            origin: { lat: 0, lon: 0 },
            units: [],
            tracks: [],
            losses: { blue: 0, red: 0, munitionsExpended: 0 },
            datalinkGraph: { nodes: [], edges: [] },
            weather: {} as any,
            weaponBindings: [],
            esmBearings: [],
            ...snapshot
        };

        // Simulate the SDK receiving a frame
        if (UIStore.client && UIStore.client.events) {
            UIStore.client.events.emit('state:viewState', fullSnapshot);
        }
    }

    /** Start a fake tick loop with a basic scenario */
    public startDummyLoop(intervalMs: number = 100) {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.injectSnapshot({
                units: [
                    {
                        id: 'mock-ship-1',
                        side: Side.Blue,
                        pos: { x: this.tickCount * 10, y: 0, z: 0 },
                        vel: { x: 10, y: 0, z: 0 },
                        rot: 90,
                        hp: 100,
                        isDestroyed: false,
                        logState: 'Active',
                        profileId: 'ddg-destroyer',
                        fuelPct: 0.9,
                        isBingo: false,
                        sensors: [],
                        mounts: []
                    }
                ]
            });
        }, intervalMs);
    }

    public stopDummyLoop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

export const mockGateway = new MockGateway();
