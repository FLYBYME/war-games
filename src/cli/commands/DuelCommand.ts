import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side, SimulationEvent } from '../../sdk/index.js';
import { OllamaAdapter } from '../../sdk/llm/OllamaAdapter.js';
import { DebugTools } from '../../sdk/tools/DebugTools.js';
import { Ollama } from 'ollama';
import { C } from '../core/Utils.js';
import * as readline from 'readline/promises';
import * as fs from 'fs';
import * as path from 'path';

interface DuelOptions {
    scenario: string;
    iterations: string;
    host: string;
    model: string;
    chat: boolean;
    enableDebugAgent: boolean;
}

/**
 * DuelCommand: Dedicated CLI action for AI vs AI tactical exercises.
 * Uses the Tool-Centric SDK interface.
 */
export class DuelCommand extends BaseCommand {
    public readonly name = 'duel';
    public readonly description = 'Start an AI vs AI tactical duel using the unified tool system.';
    public readonly category = 'Intelligence';

    private logStream: fs.WriteStream | null = null;

    private log(message: string, useConsole: boolean = true) {
        if (useConsole) {
            process.stdout.write(message);
        }
        if (this.logStream) {
            // Strip ANSI codes: \x1B\[[0-9;]*[mGJK]
            const clean = message.replace(/\x1B\[[0-9;]*[mGJK]/g, '');
            this.logStream.write(clean);
        }
    }

    private logLine(message: string = '', useConsole: boolean = true) {
        this.log(message + '\n', useConsole);
    }

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
            .action((opts: DuelOptions) => {
                const globalOpts = program.opts() as { url: string };
                void this.execute(opts, globalOpts);
            });
    }

    protected async execute(opts: DuelOptions, globalOpts: { url: string }): Promise<void> {
        const scenarioId = opts.scenario;
        const maxIterations = parseInt(opts.iterations);
        const serverUrl = globalOpts.url;

        // Initialize logging
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const logFile = path.join(logDir, `duel_${timestamp}.log`);
        this.logStream = fs.createWriteStream(logFile);

        this.logLine(`\n${C.magenta}${C.bold}⚔  WAR-GAMES UNIFIED TOOL DUEL${C.reset}`);
        this.logLine(`${C.dim}Scenario: ${scenarioId} | Model: ${opts.model}${C.reset}\n`);

        const client = new WarGamesClient({ url: serverUrl });

        try {
            await client.connect();
            const result = await client.scenario.loadScenarioIntoEngine(scenarioId);
            this.logLine(`${C.green}✔ Scenario loaded:${C.reset} ${result.matchId}`);

            await client.joinMatch(Side.Neutral, result.matchId!);
            await client.pause();

            const ollama = new Ollama({ host: opts.host });

            if (opts.chat) {
                const player = await this.createPlayer(Side.Blue, result.matchId!, client, ollama, opts.model, opts.enableDebugAgent);
                await this.runChatMode(player, result.matchId!);
            } else {
                const redPlayer = await this.createPlayer(Side.Red, result.matchId!, client, ollama, opts.model, opts.enableDebugAgent);
                const bluePlayer = await this.createPlayer(Side.Blue, result.matchId!, client, ollama, opts.model, opts.enableDebugAgent);
                await this.runDuelMode(redPlayer, bluePlayer, result.matchId!, maxIterations, client);
            }

            if (result.matchId) {
                await client.deleteMatch(result.matchId);
            }
        } catch (err: unknown) {
            const error = err as Error;
            this.logLine(`\n${C.red}${C.bold}✖ Duel Failed:${C.reset} ${error.message}`);
            this.logLine(`${C.red}${C.bold}${error.stack}${C.reset}`);
        } finally {
            if (this.logStream) {
                this.logStream.end();
            }
            client.disconnect();
            process.exit(0);
        }
    }

    private async runChatMode(player: { adapter: OllamaAdapter }, matchId: string): Promise<void> {
        this.logLine(`\n${C.green}${C.bold}Chat Mode Enabled. Type 'exit' or 'quit' to end.${C.reset}`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let active = true;
        while (active) {
            this.log(`\n${C.cyan}User > ${C.reset}`);
            const input = await rl.question(''); // Question handles stdout but we want it in log too
            this.log(input + '\n', false); // Write user input to log file only
            if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
                active = false;
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
                this.logLine(`\n${C.yellow}${C.bold}🏁 Match ${matchId} has ended${C.reset}`);
                this.logLine(JSON.stringify(winState, null, 2));
                break;
            }

            // Fetch and filter recent events
            const events = await client.getRecentEvents(matchId, 50);
            const newEvents = events.filter((e: SimulationEvent) => e.tick > lastProcessedTick);
            if (newEvents.length > 0) {
                lastProcessedTick = Math.max(...newEvents.map((e: SimulationEvent) => e.tick));
            }

            const eventSummary = newEvents.length > 0
                ? newEvents.map((e: SimulationEvent) => `[Tick ${e.tick}] ${e.type}: ${JSON.stringify(e.data || {})}`).join('\n')
                : "No new tactical events reported.";

            this.logLine(`\n${C.white}${C.bold}--- TURN ${i + 1} ---${C.reset}`);
            this.logLine(`${C.dim}Recent Events:${C.reset}\n${eventSummary}\n`);


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
        const self = this;
        // Use the tools registered in the client's dispatcher
        const debugTools = DebugTools(client);
        const baseReportBug = debugTools.find(t => t.name === 'report_bug')!;

        const tools = [...client.tools.getTools(), baseReportBug];
        const systemPrompt = `You are an Action-Oriented QA Military Analyst assigned to the War Games Evaluation Group. 
Your objective is to command units, test simulation boundaries, and report anomalies. You must prioritize ACTION over analysis paralysis.

CRITICAL TIME & EXECUTION RULES:
1. Time is FROZEN until you use the 'wait' tool. You operate in a strictly turn-based capacity.
2. The simulation runs at 10 ticks per second (1 minute = 600 ticks).
3. If instructed to reach a specific Target Tick, use this exact formula: durationMinutes = (TargetTick - CurrentTick) / 600.
4. The 'wait' tool will INTERRUPT EARLY on tactical events. If you are interrupted before reaching your target or completing a user's explicit order, YOU MUST IMMEDIATELY CALL 'wait' AGAIN with the newly calculated remaining time. Do not ask for permission.

BUG REPORTING RULES:
- DO NOT SPAM THE SYSTEM. If you have already reported a specific anomaly (e.g., missing hostile units, ghost tracks, assessment failures), DO NOT report it again. Acknowledge the broken state internally and proceed with testing other systems.

INTERACTION & COGNITIVE RULES:
- OBEY USER DIRECTIVES IMMEDIATELY. If the user tells you to pass time, execute the 'wait' tool in your very next response. 
- Identify the goal, calculate the parameters, and execute the tool.

War-Games Match Context:
- Current match id: ${matchId}
- Current side: ${side}

Do not fire weapon yourself, use the missions system to coordinate attacks.

ALLWAYS REPORT ANY ANOMALIES, BUGS, ISSUES, OR UNEXPECTED BEHAVIOR WITH 'report_bug' TOOL.

Execute your duties with precision. Stop overthinking and push the simulation forward.

Its 10 ticks per second.

`

        console.log("TOOLS : ", tools.map(tool => tool.name))

        const adapter = new OllamaAdapter({
            ollama,
            model,
            tools,
            system: systemPrompt
        });

        this.attachHandlers(adapter, side);
        await client.joinMatch(side, matchId);

        return { adapter };
    }

    private attachHandlers(adapter: OllamaAdapter, side: Side) {
        const color = side === Side.Blue ? C.cyan : C.red;
        const prefix = side === Side.Blue ? `[BLUE] ` : `[RED]  `;
        let currentlyThinking = false;
        let atNewRow = true;

        const printWithPrefix = (text: string, textColor: string) => {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (atNewRow) {
                    this.log(color + prefix + C.reset);
                    atNewRow = false;
                }
                this.log(textColor + lines[i] + C.reset);
                if (i < lines.length - 1) {
                    this.log('\n');
                    atNewRow = true;
                }
            }
        };

        adapter.on("chat:content", (chunk: string) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                this.log("\n");
                atNewRow = true;
            }
            printWithPrefix(chunk, C.green);
        });

        adapter.on("chat:thinking", (chunk: string) => {
            if (!currentlyThinking) {
                currentlyThinking = true;
                printWithPrefix("Thinking: ", C.yellow);
            }
            printWithPrefix(chunk, C.yellow);
        });

        adapter.on("chat:finished", () => {
            if (currentlyThinking) {
                currentlyThinking = false;
                this.log("\n");
                atNewRow = true;
            }
        });

        adapter.on("tool:executing", (chunk: { name: string, args: unknown }) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                this.log("\n");
                atNewRow = true;
            }
            printWithPrefix(`Tool executing: ${chunk.name} ${JSON.stringify(chunk.args, null, 2)}\n`, C.magenta);
        });

        adapter.on("tool:result", (chunk: unknown) => {
            printWithPrefix(`Tool result: ${JSON.stringify(chunk, null, 2)}\n`, C.dim);
        });

        adapter.on("tool:error", (chunk: { name: string, error: string }) => {
            printWithPrefix(`Tool error: ${JSON.stringify(chunk, null, 2)}\n`, C.red);
        });
    }
}
