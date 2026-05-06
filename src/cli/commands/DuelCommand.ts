import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side } from '../../sdk/index.js';
import { OllamaAdapter } from '../../sdk/llm/OllamaAdapter.js';
import { DebugTools } from '../../sdk/tools/DebugTools.js';
import { Ollama } from 'ollama';
import { C } from '../core/Utils.js';
import * as readline from 'readline/promises';

/**
 * DuelCommand: Dedicated CLI action for AI vs AI tactical exercises.
 * Uses the Tool-Centric SDK interface.
 */
export class DuelCommand extends BaseCommand {
    public readonly name = 'duel';
    public readonly description = 'Start an AI vs AI tactical duel using the unified tool system.';
    public readonly category = 'Intelligence';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-s, --scenario <id>', 'Scenario ID to load', 'multi-domain-tactical')
            .option('-i, --iterations <count>', 'Number of turn iterations', '5')
            .option('--host <url>', 'Ollama API host', 'http://192.168.1.4:11434')
            .option('--model <name>', 'Ollama model name', 'qwen3:14b')
            .option('-c, --chat', 'Enable interactive chat mode instead of AI vs AI loop', false)
            .option('--enable-debug-agent', 'Enable the Debug Agent sub-process for investigating bugs', false)
            .action((opts) => this.execute(opts, program.opts()));
    }

    protected async execute(opts: any, globalOpts: any): Promise<void> {
        const scenarioId = opts.scenario;
        const maxIterations = parseInt(opts.iterations);
        const serverUrl = globalOpts.url;

        console.log(`\n${C.magenta}${C.bold}⚔  WAR-GAMES UNIFIED TOOL DUEL${C.reset}`);
        console.log(`${C.dim}Scenario: ${scenarioId} | Model: ${opts.model}${C.reset}\n`);

        const client = new WarGamesClient({ url: serverUrl });

        try {
            await client.connect();
            const result = await client.scenario.loadScenarioIntoEngine(scenarioId);
            console.log(`${C.green}✔ Scenario loaded:${C.reset} ${result.matchId}`);

            await client.joinMatch(Side.Neutral, result.matchId);
            await client.pause();

            const ollama = new Ollama({ host: opts.host });

            if (opts.chat) {
                const player = await this.createPlayer(Side.Blue, result.matchId, client, ollama, opts.model, opts.enableDebugAgent);
                await this.runChatMode(player, result.matchId);
            } else {
                const redPlayer = await this.createPlayer(Side.Red, result.matchId, client, ollama, opts.model, opts.enableDebugAgent);
                const bluePlayer = await this.createPlayer(Side.Blue, result.matchId, client, ollama, opts.model, opts.enableDebugAgent);
                await this.runDuelMode(redPlayer, bluePlayer, result.matchId, maxIterations, client);
            }

            await client.deleteMatch(result.matchId);
        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Duel Failed:${C.reset} ${err.message}`);
        } finally {
            client.disconnect();
            process.exit(0);
        }
    }

    private async runChatMode(player: { adapter: OllamaAdapter }, matchId: string): Promise<void> {
        console.log(`\n${C.green}${C.bold}Chat Mode Enabled. Type 'exit' or 'quit' to end.${C.reset}`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        while (true) {
            const input = await rl.question(`\n${C.cyan}User > ${C.reset}`);
            if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
                break;
            }
            if (input.trim() === '') continue;

            await player.adapter.chat(
                matchId,
                Side.Blue,
                input
            );
        }
        rl.close();
    }

    private async runDuelMode(
        redPlayer: { adapter: OllamaAdapter },
        bluePlayer: { adapter: OllamaAdapter },
        matchId: string,
        maxIterations: number,
        client: WarGamesClient
    ): Promise<void> {
        let lastProcessedTick = 0;

        for (let i = 0; i < maxIterations; i++) {
            const winState = await client.queryWinState(matchId);
            if (winState.over) {
                console.log(`\n${C.yellow}${C.bold}🏁 Match ${matchId} has ended${C.reset}`);
                console.dir(winState, { depth: null });
                break;
            }

            // Fetch and filter recent events
            const events = await client.getRecentEvents(matchId, 50);
            const newEvents = events.filter(e => e.tick > lastProcessedTick);
            if (newEvents.length > 0) {
                lastProcessedTick = Math.max(...newEvents.map(e => e.tick));
            }

            const eventSummary = newEvents.length > 0
                ? newEvents.map(e => `[Tick ${e.tick}] ${e.category}: ${e.message}`).join('\n')
                : "No new tactical events reported.";

            console.log(`\n${C.white}${C.bold}--- TURN ${i + 1} ---${C.reset}`);
            console.log(`${C.dim}Recent Events:${C.reset}\n${eventSummary}\n`);


            const systemPrompt = `Situational Report:
${eventSummary}

Current Win State: ${JSON.stringify(winState, null, 2)}

Review the tactical situation and issue any necessary orders. 

Report any bugs you find using the report_bug tool. Use report_bug to report any enhancements to the tools provided to you. Do not 
`

            // Blue Turn

            await bluePlayer.adapter.chat(
                matchId,
                Side.Blue,
                systemPrompt
            );

            // Red Turn
            await redPlayer.adapter.chat(
                matchId,
                Side.Red,
                systemPrompt
            );
        }
    }

    private async createPlayer(side: Side, matchId: string, client: WarGamesClient, ollama: Ollama, model: string, enableDebugAgent: boolean) {
        // Use the tools registered in the client's dispatcher
        const debugTools = DebugTools();
        const baseReportBug = debugTools.find(t => t.name === 'report_bug')!;

        let reportBugTool = baseReportBug;

        if (enableDebugAgent) {
            reportBugTool = {
                ...baseReportBug,
                async call(mId: string | undefined, sId: Side | undefined, args: any) {
                    const result = await baseReportBug.call(mId, sId, args) as any;

                    console.log(`\n${C.yellow}${C.bold}🔍 Debug Agent activated for ${result.reportId}${C.reset}`);

                    const debugAdapter = new OllamaAdapter({
                        ollama,
                        model,
                        tools: DebugTools(),
                        system: `You are an expert Software Debugging Agent.
You have been summoned because the QA Military Analyst reported a bug during a simulation.
Your objective is to investigate the reported bug by reading the source code, logs, or bug reports.
You have access to 'list_files' and 'read_file' tools. Use them to understand the codebase and confirm if the bug is valid, and identify the root cause in the code.
Once you finish your analysis, present a concise technical summary of the problem and the files involved.`
                    });

                    let debugThinking = false;
                    let debugAtNewRow = true;
                    const printDebug = (text: string, colorCode: string) => {
                        const lines = text.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (debugAtNewRow) {
                                process.stdout.write(`${C.yellow}[DEBUG] ${C.reset}`);
                                debugAtNewRow = false;
                            }
                            process.stdout.write(colorCode + lines[i] + C.reset);
                            if (i < lines.length - 1) {
                                process.stdout.write('\n');
                                debugAtNewRow = true;
                            }
                        }
                    };

                    debugAdapter.on("chat:content", (c) => {
                        if (debugThinking) { debugThinking = false; process.stdout.write("\n"); debugAtNewRow = true; }
                        printDebug(c, C.green);
                    });
                    debugAdapter.on("chat:thinking", (c) => {
                        if (!debugThinking) { debugThinking = true; printDebug("Thinking: ", C.yellow); }
                        printDebug(c, C.yellow);
                    });
                    debugAdapter.on("chat:finished", () => {
                        if (debugThinking) { debugThinking = false; process.stdout.write("\n"); debugAtNewRow = true; }
                    });
                    debugAdapter.on("tool:executing", (c: { name: string, args: any }) => {
                        if (debugThinking) { debugThinking = false; process.stdout.write("\n"); debugAtNewRow = true; }
                        printDebug(`Tool executing: ${c.name} ${JSON.stringify(c.args, null, 2)}\n`, C.magenta);
                    });
                    debugAdapter.on("tool:result", (c) => {
                        printDebug(`Tool result: ${JSON.stringify(c, null, 2)}\n`, C.dim);
                    });
                    debugAdapter.on("tool:error", (c) => {
                        printDebug(`Tool error: ${JSON.stringify(c, null, 2)}\n`, C.red);
                    });

                    const debugOutput = await debugAdapter.chat(
                        undefined,
                        undefined,
                        `Investigate bug report ${result.reportId}. Here is the bug information: ${JSON.stringify(result.details, null, 2)}`
                    );
                    console.log(`\n${C.yellow}${C.bold}✅ Debug Agent analysis complete.${C.reset}\n`);

                    return { ...result, debugAnalysis: debugOutput };
                }
            };
        }

        const tools = [...client.tools.getTools(), reportBugTool];

        const adapter = new OllamaAdapter({
            ollama,
            model,
            tools,
            system: `You are a Senior QA Military Analyst assigned to the War Games Evaluation Group. 
Your objective is to monitor tactical exercises, identify anomalies in simulation physics or logic, and ensure the simulation behaves according to technical specifications.

IMPORTANT EXECUTION MODEL:
- Time ONLY progresses when you use the 'wait' tool. The simulation is strictly turn-based for you.
- The simulation engine runs at 10 ticks per simulation second (10Hz). This means 1 minute of simulation time equals 600 ticks.
- When you use the 'wait' tool for N minutes, it attempts to advance the simulation by N * 600 ticks.
- The 'wait' tool will INTERRUPT EARLY if a significant tactical event occurs (e.g., a new contact is detected, a weapon is fired, or a unit is destroyed).
- If 'elapsedTicks' is less than your requested duration, it means an event interrupted the wait. You MUST review the current tactical status and events, then decide whether to issue new orders or wait again.
- You should issue your tactical orders (set course, engage, etc.) while the simulation is paused, then use 'wait' to skip ahead and observe the results.
- When you encounter unexpected behavior (e.g., units moving too fast, missing health components, sensors failing to detect targets at range), you MUST use the 'report_bug' tool to document the issue.
- You have access to 'query_profile_data' to check the ground-truth blueprints of units to verify if their current behavior matches their design.

War-Games Match Context:
- Current match id: ${matchId}
- Current side: ${side}

Your tone is professional, analytical, and critical. You are not just a commander; you are a tester.`
        });

        this.attachHandlers(adapter, side, ollama, model);
        await client.joinMatch(side, matchId);

        return { adapter };
    }

    private attachHandlers(adapter: OllamaAdapter, side: Side, ollama: Ollama, model: string) {
        const color = side === Side.Blue ? C.cyan : C.red;
        const prefix = side === Side.Blue ? `[BLUE] ` : `[RED]  `;
        let currentlyThinking = false;
        let atNewRow = true;

        const printWithPrefix = (text: string, textColor: string) => {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (atNewRow) {
                    process.stdout.write(color + prefix + C.reset);
                    atNewRow = false;
                }
                process.stdout.write(textColor + lines[i] + C.reset);
                if (i < lines.length - 1) {
                    process.stdout.write('\n');
                    atNewRow = true;
                }
            }
        };

        adapter.on("chat:content", (chunk) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            printWithPrefix(chunk, C.green);
        });

        adapter.on("chat:thinking", (chunk) => {
            if (!currentlyThinking) {
                currentlyThinking = true;
                printWithPrefix("Thinking: ", C.yellow);
            }
            printWithPrefix(chunk, C.yellow);
        });

        adapter.on("chat:finished", (chunk) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
        });

        adapter.on("tool:executing", (chunk: { name: string, args: any }) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            printWithPrefix(`Tool executing: ${chunk.name} ${JSON.stringify(chunk.args, null, 2)}\n`, C.magenta);
        });

        adapter.on("tool:result", (chunk) => {
            printWithPrefix(`Tool result: ${JSON.stringify(chunk, null, 2)}\n`, C.dim);
        });

        adapter.on("tool:error", (chunk) => {
            printWithPrefix(`Tool error: ${JSON.stringify(chunk, null, 2)}\n`, C.red);
        });
    }
}
