import { Ollama } from 'ollama';
import { OllamaAdapter } from './OllamaAdapter.js';
import { WarGamesAgent } from './WarGamesAgent.js';
import { WarGamesClientV2 } from '../sdk_v2/generated/WarGamesClientV2.js';
import { Side } from '../engine/core/Types.js';
import * as Contracts from '../sdk_v2/contracts/index.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * War-Games V2 Agent Demo
 * 
 * This script demonstrates the autonomous AI commander using the clean V2 architecture.
 * It uses the OllamaAdapter for reasoning and the WarGamesClientV2 (SDK) for action.
 */
async function main() {
    // Force contract registration by accessing the namespace
    const contractCount = Object.keys(Contracts).length;
    console.log(`\x1b[2m[DEBUG] Loaded ${contractCount} contract exports\x1b[0m`);

    // 1. Setup Clients
    const ollama = new Ollama({ host: 'http://192.168.1.10:11434' });
    const client = new WarGamesClientV2('http://localhost:3000/api/v2');

    // 2. Initialize Protocol Adapter
    const adapter = new OllamaAdapter({
        ollama,
        model: 'qwen3.5:2b',// NEVER CHANGE THE MODEL.
        system: `You are the War-Games Tactical AI Commander, an autonomous agent responsible for managing and executing complex military simulations.

### CORE SYSTEM SPECIFICATIONS
- **Tick Rate**: The simulation runs at 10 ticks per second (1 tick = 100ms).
- **Architecture**: You interact with the engine via a type-safe V2 SDK organized into functional domains.

### FUNCTIONAL DOMAINS
- **MATCH**: Lifecycle management. Use 'match_list' and 'match_get' to orient yourself.
- **ENTITY**: Ground Truth data. Provides the absolute state (position, HP, fuel) of all units.
- **TRACK**: Operational Picture. Sensor-derived detections. This is what units "know" about the world.
- **NAV/KINEMATICS**: Movement control. Units use high-fidelity physics for propulsion and steering.
- **COMBAT**: Weapon release and engagement. Governed by Rules of Engagement (ROE) and Weapon Release Authority (WRA).
- **SENSOR/EW**: Emissions management. EMCON (Emission Control) levels determine sensor silence.
- **DB**: The "Registry". Contains unit profiles and scenario templates.

### OPERATIONAL PROTOCOLS
1. **Orientation**: Always check the current match status and entity list before taking tactical actions.
2. **Detection**: Use 'track_list' to identify potential threats before engaging.
3. **Engagement**: Ensure ROE allows firing before using combat tools.
4. **Maintenance**: Monitor 'logistics' (fuel/HP) and use 'mission' to assign autonomous behaviors.
5. **Stability**: If the simulation behaves unexpectedly or returns errors, use the 'bug' domain to report issues.

Be precise, tactical, and direct. If a command fails, analyze the error and retry with corrected parameters or query the state to understand why.`
    });

    // 3. Create the Autonomous Agent
    // We no longer pass matchId/side here.
    // We can also optionally restrict the tools this agent can use.
    const agent = new WarGamesAgent({
        adapter,
        client,
        // allowedTools: ['match_list', 'match_create', 'db_profile_list', 'db_profile_get'] 
    });

    // 4. Set up Logging
    console.log("\x1b[1m\x1b[35m⛊ Tactical AI Commander Online\x1b[0m");

    agent.on('agent:executing_tool', ({ name, args }) => {
        console.log(`\n\x1b[34m[Action]\x1b[0m Executing ${name}...`);
        console.log(`\x1b[2m${JSON.stringify(args, null, 2)}\x1b[0m`);
    });

    agent.on('agent:tool_result', ({ name, result }) => {
        console.log(`\x1b[32m[Observation]\x1b[0m ${name} result:`);
        console.log(`\x1b[2m${JSON.stringify(result, null, 2)}\x1b[0m`);
    });

    agent.on('agent:tool_error', ({ name, error }) => {
        console.log(`\x1b[31m[Error]\x1b[0m ${name} failed: ${error}`);
    });

    adapter.on('chat:thinking', (text) => {
        process.stdout.write(`\x1b[2m${text}\x1b[0m`);
    });

    adapter.on('chat:content', (text) => {
        process.stdout.write(text);
    });

    const rl = readline.createInterface({ input, output });

    while (true) {
        const prompt = await rl.question('\n\x1b[1mUser Request:\x1b[0m ');

        try {
            // Pass context (matchId, side) per execution call
            await agent.run(prompt);
            console.log();
        } catch (err: any) {
            console.error("\n\x1b[31m✖ Agent Error:\x1b[0m", err.message);
            console.log("\nMake sure the War-Games server is running (npm run cli -- start-server)");
        }
    }
}

main().catch(err => {
    if (err.code === 'ECONNREFUSED') {
        console.error("\n\x1b[31m✖ Error:\x1b[0m Could not connect to Ollama. Is it running?");
    } else {
        console.error(err);
    }
});
