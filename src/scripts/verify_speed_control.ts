import { WarGamesClient } from '../sdk/WarGamesClient.js';
import { Side } from '../sdk/schemas/domain.js';

async function testSpeedControl() {
    const client = new WarGamesClient({ url: 'ws://localhost:3000' });
    
    console.log('Connecting to server...');
    await client.connect();
    
    console.log('Loading scenario "Mine Countermeasures"...');
    const scenarios = await client.scenario.listScenarios();
    const target = scenarios.find(s => s.name.includes('Mine')) || scenarios[0];
    
    const loadRes = await client.scenario.loadScenarioIntoEngine(target.filename);
    const matchId = (loadRes as any).matchId;
    
    console.log(`Joined match: ${matchId}. Waiting for ViewState...`);
    client.joinMatch(Side.Blue, matchId);
    
    const unitId = await new Promise<string>((resolve) => {
        client.events.on('state:viewState', (vs) => {
            const unit = vs.units.find((u: any) => u.side === Side.Blue);
            if (unit) resolve(unit.id);
        });
    });
    
    console.log(`Found unit: ${unitId}. Setting speed to 15 kts...`);
    client.scenario.resume();

    await client.nav.setSpeed(unitId, 15);
    console.log('Command sent. Waiting for confirmation in ViewState...');
    
    let success = false;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const vs = await client.getLatestViewState();
        const unit = vs?.units.find((u: any) => u.id === unitId);
        
        if (!unit) continue;

        const actual = Math.round(unit.vel ? Math.sqrt(unit.vel.x**2 + unit.vel.y**2 + unit.vel.z**2) * 1.94 : 0);
        console.log(`Tick ${vs?.tick}: Actual=${actual} kts, Desired=${unit.desiredSpeedKts}`);
        
        if (unit.desiredSpeedKts === 15) {
            success = true;
            break;
        }
    }
    
    if (success) {
        console.log('SUCCESS: Speed control verified via SDK!');
    } else {
        console.error('FAILURE: Speed control not updated on server.');
        process.exit(1);
    }
    
    client.disconnect();
    process.exit(0);
}

testSpeedControl().catch(err => {
    console.error(err);
    process.exit(1);
});
