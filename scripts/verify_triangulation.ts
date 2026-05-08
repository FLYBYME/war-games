import { WarGamesClient } from '../src/sdk/WarGamesClient.js';
import { Side, SensorType, MissionType } from '../src/sdk/schemas/index.js';

async function verifyTriangulation() {
    const client = new WarGamesClient({ url: 'ws://localhost:3000' });
    
    console.log('--- STARTING TRIANGULATION VERIFICATION ---');
    await client.connect();
    
    const matchId = `tri-${Date.now()}`;
    
    // 1. Setup Scenario
    // Two Blue ships (A, B) separated by 30km. One Red ship (C) with active radar 80km away.
    const scenario = {
        name: 'Triangulation Test',
        entities: [
            {
                id: 'blue-A',
                side: Side.Blue,
                profileId: 'ddg-destroyer',
                pos: { x: 0, y: 0, z: 0 },
                heading: 0
            },
            {
                id: 'blue-B',
                side: Side.Blue,
                profileId: 'ddg-destroyer',
                pos: { x: 30000, y: 0, z: 0 },
                heading: 0
            },
            {
                id: 'red-C',
                side: Side.Red,
                profileId: 'ddg-destroyer',
                pos: { x: 15000, y: 80000, z: 0 }, // North of the baseline
                heading: 180
            }
        ],
        intents: [
            {
                type: 'Doctrine',
                side: Side.Red,
                emcon: 'Alpha' // Active radar
            }
        ]
    };

    console.log('Loading scenario...');
    await client.scenario.importScenario(scenario, { matchId });
    await client.joinMatch(Side.Blue, matchId);
    
    // Wait for simulation to run and tracks to form
    console.log('Waiting for ESM triangulation (100 ticks)...');
    client.resume(1);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const vs = await client.getLatestViewState();
    if (!vs) {
        console.error('Failed to get viewstate');
        return;
    }

    const redTracks = vs.tracks.filter(t => t.id.startsWith('ESM-') || t.identification === 'Hostile');
    console.log(`Found ${redTracks.length} potential tracks for Red-C`);

    for (const track of redTracks) {
        console.log(`Track ${track.id}: Pos=${JSON.stringify(track.pos)}, CEP=${track.cep.toFixed(0)}m, Status=${track.classification}`);
        
        // Expected: Position should be close to {x: 15000, y: 80000}
        const distToTruth = Math.sqrt((track.pos.x - 15000)**2 + (track.pos.y - 80000)**2);
        console.log(`Distance to truth: ${distToTruth.toFixed(0)}m`);

        if (distToTruth < 5000 && track.cep < 20000) {
            console.log('SUCCESS: ESM Triangulation resolved position accurately.');
        } else if (track.cep > 40000) {
            console.log('STILL BEARING ONLY: CEP too high.');
        }
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    await client.deleteMatch(matchId);
    client.disconnect();
}

verifyTriangulation().catch(console.error);
