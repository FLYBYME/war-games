import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../server_v2/server.js';
import { WarGamesClientV2 } from '../../sdk_v2/generated/WarGamesClientV2.js';
import { Side } from '../../engine/core/Types.js';

describe('SSE Event Stream Integration (Reproduction)', () => {
    let app: any;
    let client: WarGamesClientV2;
    let matchId: string;
    const port = 3006; 

    beforeAll(async () => {
        app = await createServer();
        await app.listen({ port, host: '127.0.0.1' });
        
        client = new WarGamesClientV2(`http://127.0.0.1:${port}/api/v2`);

        // Seed the database
        await client.api.db.seed({ clearExisting: true });

        // Create a match - providing all required fields per current SDK types
        const scenarioList = await client.api.db.scenario_list({ page: 1, pageSize: 10 });
        const scenarioId = scenarioList.scenarios[0].id;
        const match = await client.api.match.create({ 
            scenarioId, 
            name: 'SSE Integration Test',
            maxTurns: 1000 
        });
        matchId = match.id;
    }, 30000);

    afterAll(async () => {
        if (app) await app.close();
    });

    it('SHOULD receive EntitySpawned and Detection events via SDK stream', async () => {
        // 1. Open the SSE stream
        const stream = client.api.sim.get_stream({ matchId });
        const receivedEvents: any[] = [];
        
        const ac = new AbortController();
        
        // Start consumption in background
        const consumePromise = (async () => {
            try {
                for await (const event of stream) {
                    receivedEvents.push(event);
                    if (receivedEvents.some(e => e.type === 'EntitySpawned') && 
                        receivedEvents.some(e => e.type === 'Detection')) {
                        break;
                    }
                    if (ac.signal.aborted) break;
                }
            } catch (err) {
                // Connection closed
            }
        })();

        // Wait a bit for the stream to establish
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Spawn an entity via API
        const profileList = await client.api.db.profile_list({ type: 'Aircraft', page: 1, pageSize: 10 });
        const profileId = profileList.profiles[0].id;
        
        const entity = await client.api.entity.create({
            matchId,
            profileId,
            side: Side.Blue,
            position: { x: 1000, y: 1000, z: 5000 },
            heading: 90,
            speedKts: 300
        });

        // 3. Trigger a manual detection via API
        // First we need a target entity to detect
        const target = await client.api.entity.create({
            matchId,
            profileId,
            side: Side.Red,
            position: { x: 2000, y: 2000, z: 5000 },
            heading: 270,
            speedKts: 300
        });

        await client.api.sensor.add_detection({
            matchId,
            entityId: entity.id,
            targetId: target.id
        });

        // 4. Emit a tick to ensure the stream isn't just hanging
        await client.api.sim.step({ matchId, ticks: 1 });

        // Wait for events to be processed or timeout
        await Promise.race([
            consumePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for events')), 5000))
        ]);

        ac.abort();

        // 5. Assertions
        const hasSpawned = receivedEvents.some(e => e.type === 'EntitySpawned');
        const hasDetection = receivedEvents.some(e => e.type === 'Detection');

        expect(hasSpawned, 'Event stream should contain EntitySpawned').toBe(true);
        expect(hasDetection, 'Event stream should contain Detection').toBe(true);
    }, 20000); 
});
