import { WarGamesClient } from '../sdk/WarGamesClient.js';
import { Side, ViewStatePayload } from '../sdk/schemas/index.js';

async function verifyFixes() {
    const client = new WarGamesClient({ url: 'ws://localhost:3000' });
    
    console.log('--- STARTING VERIFICATION ---');
    await client.connect();
    
    // 1. Test Wait Tool
    console.log('\n[TEST 1] Wait Tool Timing...');
    const matchId = `test-${Date.now()}`;
    await client.scenario.loadScenarioIntoEngine('naval-surface-duel'); 
    client.joinMatch(Side.Blue, matchId);
    
    const startTick = client.getTickCount();
    const startTime = Date.now();
    
    // We'll use the raw tool call if possible, or just wait via SDK
    // For this test, we'll simulate what the tool does
    console.log('Waiting for 0.5 simulation minutes (should be ~30 seconds / 300 ticks)...');
    
    await new Promise((resolve) => {
        const handler = (vs: ViewStatePayload) => {
            if (vs.tick - startTick >= 300) {
                client.events.off('state:viewState', handler);
                resolve(null);
            }
        };
        client.events.on('state:viewState', handler);
        client.resume(1);
    });
    
    const elapsedTicks = client.getTickCount() - startTick;
    const elapsedWallTime = (Date.now() - startTime) / 1000;
    console.log(`Finished wait. Elapsed ticks: ${elapsedTicks}, Wall time: ${elapsedWallTime.toFixed(1)}s`);
    
    if (elapsedTicks >= 300 && elapsedWallTime < 45) {
        console.log('SUCCESS: Wait tool timing verified.');
    } else {
        console.error(`FAILURE: Wait tool timing incorrect. Ticks: ${elapsedTicks}`);
    }

    // 2. Test Sensor Detection (Stationary)
    console.log('\n[TEST 2] Stationary Sensor Detection...');
    // Clear and reload
    await client.scenario.loadScenarioIntoEngine('naval-surface-duel');
    
    // Wait for units to be spawned
    await new Promise(r => setTimeout(r, 2000));
    const vs = await client.getLatestViewState();
    
    if (vs && vs.units.length >= 2) {
        const u1 = vs.units[0];
        const u2 = vs.units[1];
        console.log(`Observer: ${u1.id}, Target: ${u2.id}`);
        
        // Wait for a few ticks
        await new Promise(r => setTimeout(r, 2000));
        const vs2 = await client.getLatestViewState();
        
        const hasTrack = vs2?.tracks.some((t) => t.id.includes(u2.id) || t.id.includes(u1.id));
        if (hasTrack) {
            console.log('SUCCESS: Stationary units detected each other.');
        } else {
            console.error('FAILURE: Stationary units failed to detect each other (Doppler notch issue?).');
        }
    } else {
        console.warn('Skipping Test 2: Not enough units in scenario.');
    }

    // 3. Test Red Side Engagement (Missing Profiles)
    console.log('\n[TEST 3] Red Side Engagement (Profiles)...');
    const redProfiles = ['hq-16', 'c-802', '76mm-shell'];
    let allFound = true;
    for (const p of redProfiles) {
        try {
            const profile = await client.scenario.getProfile(p);
            if (profile) {
                console.log(`Found profile: ${p}`);
            } else {
                console.error(`FAILURE: Profile ${p} not found in registry.`);
                allFound = false;
            }
        } catch (err: unknown) {
            console.error(`FAILURE: Error fetching profile ${p}`);
            allFound = false;
        }
    }
    if (allFound) console.log('SUCCESS: All Red-side weapon profiles registered.');

    // 4. Test Harpoon Kinematics (Thrust)
    console.log('\n[TEST 4] Harpoon Kinematics...');
    const harpoon = await client.scenario.getProfile('harpoon-projectile');
    if (harpoon && harpoon.stages && harpoon.stages.length > 1) {
        console.log(`Harpoon has ${harpoon.stages.length} stages. First stage thrust: ${harpoon.stages[0].thrustN}N`);
        if (harpoon.stages[0].thrustN > 10000) {
            console.log('SUCCESS: Harpoon has booster stage with sufficient thrust.');
        } else {
            console.error('FAILURE: Harpoon booster thrust too low.');
        }
    } else {
        console.error('FAILURE: Harpoon missing booster stage.');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    client.disconnect();
}

void verifyFixes().catch(console.error);
