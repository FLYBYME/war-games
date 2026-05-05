import { describe, it, expect } from 'vitest';
import { DeltaEncoder } from '../DeltaEncoder';
import { DeltaDecoder } from '../DeltaDecoder';
import { ViewStatePayload } from '../schemas';

describe('SDK Datalink Serialization', () => {
    const encoder = new DeltaEncoder();
    
    it('should preserve datalink graph during encode/decode', () => {
        const mockState: ViewStatePayload = {
            tick: 100,
            timestamp: Date.now(),
            sequence: 1,
            isPaused: false,
            side: 'Blue',
            origin: { lat: 20, lon: 108 },
            units: [
                { id: 'unit-1', side: 'Blue', pos: { x: 0, y: 0, z: 0 }, rot: 0, hp: 100, isDestroyed: false, fuelPct: 1, sensors: [], logState: 'Idle', isBingo: false, mounts: [] },
                { id: 'unit-2', side: 'Blue', pos: { x: 1000, y: 1000, z: 0 }, rot: 0, hp: 100, isDestroyed: false, fuelPct: 1, sensors: [], logState: 'Idle', isBingo: false, mounts: [] }
            ],
            tracks: [],
            datalinkGraph: {
                nodes: ['unit-1', 'unit-2'],
                edges: [
                    { a: 'unit-1', b: 'unit-2', latencyMs: 100 }
                ]
            },
            losses: { blue: 0, red: 0, munitionsExpended: 0 },
            weather: { cloudCover: 0, seaState: 0, windSpeedKts: 0, windDirDeg: 0, visibilityNM: 20, temperatureC: 15 },
            weaponBindings: [],
            esmBearings: []
        };

        const encoded = encoder.encode(mockState, 'session-1');
        const decoded = DeltaDecoder.decode(encoded.buffer as ArrayBuffer);

        expect(decoded.datalinkGraph).toBeDefined();
        expect(decoded.datalinkGraph.edges).toHaveLength(1);
        expect(decoded.datalinkGraph.edges[0].a).toBe('unit-1');
        expect(decoded.datalinkGraph.edges[0].b).toBe('unit-2');
    });

    it('should handle empty datalink graph', () => {
        const mockState: ViewStatePayload = {
            tick: 100,
            timestamp: Date.now(),
            sequence: 2,
            isPaused: false,
            side: 'Blue',
            origin: { lat: 0, lon: 0 },
            units: [],
            tracks: [],
            datalinkGraph: { nodes: [], edges: [] },
            losses: { blue: 0, red: 0, munitionsExpended: 0 },
            weather: { cloudCover: 0, seaState: 0, windSpeedKts: 0, windDirDeg: 0, visibilityNM: 20, temperatureC: 15 },
            weaponBindings: [],
            esmBearings: []
        };

        const encoded = encoder.encode(mockState, 'session-1');
        const decoded = DeltaDecoder.decode(encoded.buffer as ArrayBuffer);

        expect(decoded.datalinkGraph.edges).toHaveLength(0);
    });
});
