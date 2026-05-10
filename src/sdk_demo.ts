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
        maxTurns: 1000
    });
    console.log('Match created:', match);

    const matchID = match.id;

    console.log('Loading match...');
    const loadedMatch = await sdk.api.match.get({ matchId: matchID });
    console.log('Match loaded:');
    console.dir(loadedMatch, { depth: null });

    // --- Environment Queries ---
    console.log('\n--- Environment Intelligence ---');
    const envState = await sdk.api.env.get({ matchId: matchID });
    console.log('Environment State:');
    console.dir(envState, { depth: null });

    const terrainSample = await sdk.api.env.sample_terrain({
        matchId: matchID,
        position: { x: 5000, y: 0, z: 0 }
    });
    console.log('Terrain Sample at (5000, 0, 0):');
    console.dir(terrainSample, { depth: null });

    // --- Map Queries ---
    console.log('\n--- Map Intelligence ---');
    const regions = await sdk.api.map.list_regions({});
    console.log('Available Regions:');
    console.dir(regions.regions, { depth: null });

    const elevationProfile = await sdk.api.map.get_elevation_profile({
        matchId: matchID,
        from: { x: 0, y: 0, z: 0 },
        to: { x: 10000, y: 0, z: 0 },
        samples: 10
    });
    console.log('Elevation Profile (0 -> 10km):');
    console.dir(elevationProfile.profile, { depth: null });

    console.log('\n--- Simulation Step ---');
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

    // --- Start Real-Time Telemetry Stream ---
    console.log('\n--- Starting Live Telemetry Stream ---');
    let tickCount = 0;
    const streamStopController = new AbortController();

    // We run the stream consumption in the background
    const telemetryHandler = (async () => {
        try {
            console.log(`[STREAM] Listening for events in match ${matchID}...`);
            const stream = sdk.api.sim.get_stream({ matchId: matchID });

            for await (const event of stream) {
                if (event.type === 'TickCompleted') {
                    tickCount++;
                    if (tickCount % 100 === 0) {
                        console.log(`[STREAM] Sim Tick: ${event.tick}`);
                    }
                } else {
                    console.log(`[STREAM] EVENT: ${event.type}`, event.data);
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('[STREAM] Error:', err.message);
            }
        }
    })();

    // step sim
    console.log('Stepping sim (1,000 ticks) and monitoring live stream...');

    const steppedSim = await sdk.api.sim.step({
        matchId: matchID,
        ticks: 1000
    });

    console.log('Sim stepped:');
    console.dir(steppedSim, { depth: null });

    // Allow a moment for the final events to flush
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Stopping live stream...');
    // In a browser/Node fetch environment, stopping the loop or closing the match will end the stream

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

    // --- Agent Interaction ---
    console.log('\n--- Agent Intelligence ---');
    console.log('Creating a new Strategic Analyst agent...');
    const agent = await sdk.api.agent.create({
        name: 'Strategic Analyst',
        systemPrompt: 'You are a military strategic analyst. You have access to tools to query the state of the simulation. Analyze the current situation and provide recommendations. Be concise but thorough.',
        model: 'qwen3.5:2b',
        config: { temperature: 0.1 }
    });
    console.log('Agent created:', agent.id);

    console.log('Creating a new conversation thread...');
    const thread = await sdk.api.agent.thread_create({
        agentId: agent.id,
        matchId: matchID,
        name: 'Initial Analysis'
    });
    console.log('Thread created:', thread.id);

    console.log('\n[AGENT] Starting streaming analysis...');
    const agentStream = sdk.api.agent.run_stream({
        threadId: thread.id,
        prompt: 'Analyze the current positions of ship-1 and plane-1. What are their statuses? Match ID is: ' + matchID + ' Side is Blue',
        // allowedTools: [
        //     'entity_get',
        //     'entity_list',
        //     'sim_get',
        //     'kinematics_get',
        //     'history_list_telemetry',
        //     'history_get_entity_samples'
        // ]
    });

    for await (const event of agentStream) {
        switch (event.type) {
            case 'thinking':
                process.stdout.write(`\x1b[90m${event.text}\x1b[0m`);
                break;
            case 'content':
                process.stdout.write(event.text);
                break;
            case 'tool_call':
                console.log(`\n\x1b[33m[TOOL CALL]\x1b[0m ${event.name}(${JSON.stringify(event.args)})`);
                break;
            case 'tool_result':
                console.log(`\x1b[32m[TOOL RESULT]\x1b[0m ${event.name} returned data: \n ${JSON.stringify(event.result)}`);
                break;
            case 'done':
                console.log(`\n\x1b[36m[AGENT DONE]\x1b[0m Message ID: ${event.messageId}`);
                break;
            case 'error':
                console.error(`\n\x1b[31m[AGENT ERROR]\x1b[0m ${event.error}`);
                break;
        }
    }

    // delete match
    console.log('\nDeleting match...');
    const deletedMatch = await sdk.api.match.delete({ matchId: matchID });
    console.log('Match deleted:');
    console.dir(deletedMatch, { depth: null });


    process.exit(0);
}

main();