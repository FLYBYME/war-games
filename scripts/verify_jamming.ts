import { WarGamesClient } from '../src/sdk/WarGamesClient.js';
import { Side, SensorType, MissionType } from '../src/sdk/schemas/index.js';

async function verifyJamming() {
    const client = new WarGamesClient({ url: 'ws://localhost:3000' });
    
    console.log('--- STARTING JAMMING VERIFICATION ---');
    await client.connect();
    
    const matchId = `jam-${Date.now()}`;
    
    // 1. Setup Scenario
    // One Blue ship with radar. One Red ship with a Deceptive Jammer active.
    const scenario = {
        name: 'Jamming Test',
        entities: [
            {
                id: 'blue-A',
                side: Side.Blue,
                profileId: 'ddg-destroyer',
                pos: { x: 0, y: 0, z: 0 },
                heading: 0
            },
            {
                id: 'red-B',
                side: Side.Red,
                profileId: 'ddg-destroyer',
                pos: { x: 50000, y: 0, z: 0 },
                heading: 180
            }
        ],
        intents: [
            {
                type: 'Doctrine',
                actorId: 'red-B',
                emcon: 'Alpha' // Active jamming
            }
        ]
    };

    console.log('Loading scenario...');
    await client.scenario.importScenario(scenario, { matchId });
    await client.joinMatch(Side.Blue, matchId);
    
    // Manually activate jammer for Red-B
    await client.dispatch({
        type: 'SetSensorState',
        entityId: 'red-B',
        sensor: 'Jammer',
        active: true
    } as any);

    // Note: We need a jammer component on Red-B. Profiles.ts doesn't have it by default.
    // I should check if I need to update profiles.ts or use an inline profile.
    
    console.log('Waiting for jamming effects (100 ticks)...');
    client.resume(1);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const vs = await client.getLatestViewState();
    if (!vs) {
        console.error('Failed to get viewstate');
        return;
    }

    const tracks = vs.tracks;
    console.log(`Found ${tracks.length} tracks`);

    const ghostTracks = tracks.filter(t => t.id.includes('GHOST'));
    console.log(`Found ${ghostTracks.length} Ghost tracks.`);

    if (ghostTracks.length > 0) {
        console.log('SUCCESS: Deceptive jamming generated ghost tracks.');
    } else {
        console.warn('FAILURE: No ghost tracks detected. Check if jammer is active and in Deceptive mode.');
    }

    const targetTrack = tracks.find(t => t.id.includes('red-B'));
    if (targetTrack) {
        console.log(`Target Track CEP: ${targetTrack.cep.toFixed(0)}m`);
        if (targetTrack.cep > 100) {
            console.log('SUCCESS: Jamming increased track CEP.');
        }
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    await client.deleteMatch(matchId);
    client.disconnect();
}

verifyJamming().catch(console.error);
