import { WarGamesClientV2 } from './sdk_v2/generated/WarGamesClientV2.js';

const sdk = new WarGamesClientV2('http://localhost:3000/api/v2');

async function main() {
    console.log('Loading scenarios...');
    const result = await sdk.api.db.scenario_list({ page: 1, pageSize: 100 });
    console.log('Scenarios:');
    console.dir(result.scenarios, { depth: null });
    console.log('Total count: ' + result.totalCount);

    const scenarioId = result.scenarios.find((s) => s.id === 'basic-movement')?.id;
    if (!scenarioId) {
        throw new Error('Scenario not found');
    }
    console.log('Scenario ID: ' + scenarioId);



    console.log('Loading profiles...');
    const profiles = await sdk.api.db.profile_list({ page: 1, pageSize: 100 });
    console.log('Profiles:');
    console.dir(profiles.profiles, { depth: null });
    console.log('Total count: ' + profiles.totalCount);
    // create new match
    console.log('Creating new match...');
    const match = await sdk.api.match.create({
        scenarioId,
        name: 'Basic Movement Test',
        description: 'Test scenario with a basic mine',
        maxTurns: 10000
    });
    console.log('Match created:', match);

    const matchID = match.id;

    console.log('Loading match...');
    const loadedMatch = await sdk.api.match.get({ matchId: matchID });
    console.log('Match loaded:');
    console.dir(loadedMatch, { depth: null });

    console.log('Loading matches...');
    const matches = await sdk.api.match.list({ page: 1, pageSize: 100 });
    console.log('Matches:');
    console.dir(matches, { depth: null });

    console.log('Loading win state...');
    const winState = await sdk.api.match.get_win_state({ matchId: matchID });
    console.log('Win state:');
    console.dir(winState, { depth: null });


    // get sim state
    console.log('Getting sim state...');
    const simState = await sdk.api.sim.get({ matchId: matchID });
    console.log('Sim state:');
    console.dir(simState, { depth: null });


    // step sim
    console.log('Stepping sim (10,000 ticks) and monitoring metrics...');
    
    let isStepping = true;
    const metricsMonitor = (async () => {
        while (isStepping) {
            try {
                const metrics = await sdk.api.sim.get_metrics({});
                const rssMB = (metrics.memory.rss / 1024 / 1024).toFixed(2);
                const heapMB = (metrics.memory.heapUsed / 1024 / 1024).toFixed(2);
                console.error(`[MONITOR] Server Memory -> RSS: ${rssMB} MB, Heap: ${heapMB} MB`);
            } catch (e) {
                // Ignore transient errors during step
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    })();

    const steppedSim = await sdk.api.sim.step({
        matchId: matchID,
        ticks: 10000
    });
    
    isStepping = false;
    await metricsMonitor;

    console.log('Sim stepped:');
    console.dir(steppedSim, { depth: null });

    // get sim state
    console.log('Getting sim state...');
    const simState2 = await sdk.api.sim.get({ matchId: matchID });
    console.log('Sim state:');
    console.dir(simState2, { depth: null });

    // Get entities for this match
    console.log('Getting entities for match...');
    const entitiesResult = await sdk.api.entity.list({
        matchId: matchID
    });
    console.log('Entities:');
    console.dir(entitiesResult, { depth: null });

    // get plane-1
    console.log('Getting entity ship-1...');
    const entityShip1 = await sdk.api.entity.get({ matchId: matchID, entityId: 'ship-1' });
    console.log('Entity ship-1:');
    console.dir(entityShip1, { depth: null });

    console.log('Getting entity plane-1...');
    const entityPlane1 = await sdk.api.entity.get({ matchId: matchID, entityId: 'plane-1' });
    console.log('Entity plane-1:');
    console.dir(entityPlane1, { depth: null });

    // get plane movement samples
    console.log('Getting plane state samples...');
    const planeSamples = await sdk.api.history.get_entity_samples({
        batchId: matchID,
        entityId: 'plane-1',
        sampleCount: 10
    });
    console.log('Plane Samples:');
    console.dir(planeSamples, { depth: null });
    // delete match
    console.log('Deleting match...');
    const deletedMatch = await sdk.api.match.delete({ matchId: matchID });
    console.log('Match deleted:');
    console.dir(deletedMatch, { depth: null });


}

main();