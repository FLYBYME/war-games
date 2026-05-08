import { WarGamesClient, Side, ViewStatePayload } from "../sdk/index.js";

async function main() {
    const client = new WarGamesClient({ url: 'ws://localhost:3000' });
    await client.connect();
    const result = await client.scenario.loadScenarioIntoEngine('salvo-aggregation');
    const matchId = result.matchId!;
    await client.joinMatch(Side.Blue, matchId);

    console.log("Joined match:", matchId);

    // Initial State
    const vs1 = await client.getLatestViewState();
    if (!vs1) throw new Error("No view state");
    const startTick = vs1.tick;

    console.log("Start Tick:", startTick);
    await client.resume(1);

    // Wait 2 seconds real time
    await new Promise(r => setTimeout(r, 2000));

    const vs2 = await client.getLatestViewState();
    if (!vs2) throw new Error("No view state");
    const unit = vs2.units.find((u) => u.side === Side.Blue);

    if (unit) {
        console.log(`Unit ${unit.id} speed: ${unit.speedKts} kts`);

        // Command speed change
        console.log("Setting speed to 600 kts...");
        await client.dispatch({ type: 'SetSpeed', entityId: unit.id, speedKts: 600 });

        await new Promise(r => setTimeout(r, 5000));

        const vs3 = await client.getLatestViewState();
        if (!vs3) throw new Error("No view state");
        const unitUpdated = vs3.units.find(u => u.id === unit.id);
        console.log(`Unit ${unit.id} updated speed: ${unitUpdated?.speedKts} kts`);
    }

    await client.deleteMatch(matchId);
    client.disconnect();
    process.exit(0);
}

main().catch(console.error);
