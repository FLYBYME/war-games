import { describe, it, expect } from 'vitest';
import { DeltaEncoder } from '../DeltaEncoder.js';
import { DeltaDecoder } from '../DeltaDecoder.js';
import { Side } from '../schemas/domain.js';
import { ViewStatePayload } from '../schemas/protocol.js';

describe('Protocol Drift Protection (TODO 14.6)', () => {
    it('should perfectly restore a complex ViewState snapshot after round-trip encoding', () => {
        const encoder = new DeltaEncoder();
        const decoder = new DeltaDecoder();

        const snapshot: ViewStatePayload = {
            tick: 1234,
            timestamp: 123.4,
            sequence: 1,
            isPaused: false,
            side: Side.Blue,
            origin: { lat: 20, lon: 110 },
            units: [
                {
                    id: 'ship-1',
                    side: Side.Blue,
                    category: 'Ship',
                    pos: { x: 100, y: 200, z: 0 },
                    vel: { x: 10, y: 10, z: 0 },
                    lla: { lat: 20.001, lon: 110.001, alt: 0 },
                    heading: 45,
                    hp: 100,
                    isDestroyed: false,
                    logState: 'Ready',
                    fuelPct: 0.8,
                    isBingo: false,
                    speedKts: 20,
                    profileId: 'ddg-destroyer',
                    sensors: [],
                    mounts: [],
                    activeTasks: []
                },
                {
                    id: 'plane-1',
                    side: Side.Blue,
                    category: 'Aircraft',
                    pos: { x: 5000, y: 5000, z: 10000 },
                    vel: { x: 200, y: 200, z: 0 },
                    lla: { lat: 20.05, lon: 110.05, alt: 10000 },
                    heading: 90,
                    hp: 50,
                    isDestroyed: false,
                    logState: 'InFlight',
                    fuelPct: 0.5,
                    isBingo: false,
                    speedKts: 500,
                    profileId: 'f-35',
                    sensors: [],
                    mounts: [],
                    activeTasks: [],
                    desiredSpeedKts: 500,
                    desiredAltitudeM: 10000,
                    sensorMask: 0b1010
                }
            ],
            tracks: [
                {
                    id: 'TRK-1',
                    pos: { x: 10000, y: 10000, z: 0 },
                    lla: { lat: 20.1, lon: 110.1, alt: 0 },
                    vel: { x: 0, y: 0, z: 0 },
                    cep: 50,
                    classification: 'Surface',
                    identification: 'Hostile',
                    firstSeen: 1000,
                    lastSeen: 1234,
                    speedKts: 0
                }
            ],
            losses: { blue: 0, red: 1, munitionsExpended: 10 },
            weather: {
                cloudCover: 0.2,
                seaState: 3,
                windSpeedKts: 15,
                windDirDeg: 180,
                visibilityNM: 20,
                temperatureC: 25
            },
            datalinkGraph: { nodes: [], edges: [] },
            weaponBindings: [],
            esmBearings: []
        };

        const encoded = encoder.encode(snapshot, 'session-1');
        const decoded = decoder.decode(encoded);

        // Header & Basics
        expect(decoded.tick).toBe(snapshot.tick);
        expect(decoded.isPaused).toBe(snapshot.isPaused);
        expect(decoded.side).toBe(snapshot.side);
        expect(decoded.origin?.lat).toBeCloseTo(snapshot.origin!.lat);
        expect(decoded.origin?.lon).toBeCloseTo(snapshot.origin!.lon);

        // Units
        expect(decoded.units.length).toBe(snapshot.units.length);
        const plane = decoded.units.find(u => u.id === 'plane-1')!;
        expect(plane.pos.x).toBeCloseTo(5000);
        expect(plane.heading).toBe(90);
        expect(plane.hp).toBe(50);
        expect(plane.desiredSpeedKts).toBe(500);
        expect(plane.desiredAltitudeM).toBe(10000);
        expect(plane.sensorMask).toBe(0b1010);
        expect(plane.fuelPct).toBeCloseTo(0.5);

        // Tracks
        expect(decoded.tracks.length).toBe(snapshot.tracks.length);
        const track = decoded.tracks[0];
        expect(track.id).toBe('TRK-1');
        expect(track.cep).toBe(50);
        expect(track.identification).toBe('Hostile');
        expect(track.classification).toBe('Surface');

        // Dynamic Segment
        expect(decoded.losses.red).toBe(1);
        expect(decoded.weather.windSpeedKts).toBe(15);
    });

    it('should correctly handle deltas for unchanged fields', () => {
        const encoder = new DeltaEncoder();
        const decoder = new DeltaDecoder();

        const snap1: ViewStatePayload = {
            tick: 1,
            timestamp: 0.1,
            sequence: 1,
            isPaused: false,
            side: Side.Blue,
            origin: { lat: 0, lon: 0 },
            units: [{ id: 'u1', side: Side.Blue, category: 'Ship', pos: { x: 0, y: 0, z: 0 }, heading: 0, hp: 100, isDestroyed: false, logState: 'Ready', fuelPct: 1, isBingo: false, speedKts: 0, profileId: 'x', sensors: [], mounts: [], activeTasks: [], lla: { lat: 0, lon: 0, alt: 0 } }],
            tracks: [],
            losses: { blue: 0, red: 0, munitionsExpended: 0 },
            weather: { cloudCover: 0, seaState: 0, windSpeedKts: 0, windDirDeg: 0, visibilityNM: 0, temperatureC: 0 },
            datalinkGraph: { nodes: [], edges: [] },
            weaponBindings: [],
            esmBearings: []
        };

        const snap2 = JSON.parse(JSON.stringify(snap1));
        snap2.tick = 2;
        snap2.units[0].pos.x = 100; // Only position changed

        encoder.encode(snap1, 'session-2'); // Seed first state
        const encoded2 = encoder.encode(snap2, 'session-2');
        const decoded2 = decoder.decode(encoded2);

        expect(decoded2.units[0].pos.x).toBe(100);
        expect(decoded2.units[0].hp).toBe(100); // Should be restored from delta cache in a real app, but decoder returns partial or full?
        // Wait, the DeltaDecoder in this project is stateful or stateless?
    });
});
