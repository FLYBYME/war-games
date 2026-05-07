import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { OllamaAdapter } from '../../sdk/llm/OllamaAdapter.js';
import { DebugTools } from '../../sdk/tools/DebugTools.js';
import { Ollama } from 'ollama';
import { C } from '../core/Utils.js';
import * as readline from 'readline/promises';
import { Side } from '../../sdk/schemas/index.js';

interface DebugAgentOptions {
    host: string;
    model: string;
}

/**
 * DebugAgentCommand: Standalone CLI command for chatting with the debug agent.
 */
export class DebugAgentCommand extends BaseCommand {
    public readonly name = 'debug-agent';
    public readonly description = 'Start an interactive chat with the autonomous Debug Agent.';
    public readonly category = 'Intelligence';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .option('--host <url>', 'Ollama API host', 'http://192.168.1.4:11434')
            .option('--model <name>', 'Ollama model name', 'qwen3:14b')
            .action((opts: DebugAgentOptions) => this.execute(opts, program.opts()));
    }

    protected async execute(opts: DebugAgentOptions, _globalOpts: unknown): Promise<void> {
        console.log(`\n${C.yellow}${C.bold}🔍 WAR-GAMES DEBUG AGENT${C.reset}`);
        console.log(`${C.dim}Model: ${opts.model}${C.reset}\n`);

        try {
            const ollama = new Ollama({ host: opts.host });
            
            const adapter = new OllamaAdapter({
                ollama,
                model: opts.model,
                tools: DebugTools(),
                system: `You are an expert Software Debugging Agent.
Your objective is to investigate bugs and anomalies by reading the source code, logs, or bug reports.
You have access to 'list_files' and 'read_file' tools. Use them to understand the codebase, locate bugs, and identify the root cause in the code.
Your tone is professional, technical, and analytical.`
            });

            this.attachHandlers(adapter);

            await this.runChatMode(adapter);

        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}✖ Debug Agent Failed:${C.reset} ${error.message}`);
        } finally {
            process.exit(0);
        }
    }

    private async runChatMode(adapter: OllamaAdapter): Promise<void> {
        console.log(`\n${C.green}${C.bold}Chat Mode Enabled. Type 'exit' or 'quit' to end.${C.reset}`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let active = true;
        while (active) {
            const input = await rl.question(`\n${C.cyan}User > ${C.reset}`);
            if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
                active = false;
                break;
            }
            if (input.trim() === '') continue;

            await adapter.chat(
                'debug',
                Side.Neutral,
                input
            );
        }
        rl.close();
    }

    private attachHandlers(adapter: OllamaAdapter) {
        let currentlyThinking = false;
        let atNewRow = true;

        const print = (text: string, textColor: string) => {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (atNewRow) {
                    process.stdout.write(`${C.yellow}[DEBUG] ${C.reset}`);
                    atNewRow = false;
                }
                process.stdout.write(textColor + lines[i] + C.reset);
                if (i < lines.length - 1) {
                    process.stdout.write('\n');
                    atNewRow = true;
                }
            }
        };

        adapter.on("chat:content", (chunk: string) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            print(chunk, C.green);
        });

        adapter.on("chat:thinking", (chunk: string) => {
            if (!currentlyThinking) {
                currentlyThinking = true;
                print("Thinking: ", C.yellow);
            }
            print(chunk, C.yellow);
        });

        adapter.on("chat:finished", () => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
        });

        adapter.on("tool:executing", (chunk: { name: string, args: unknown }) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            print(`Tool executing: ${chunk.name} ${JSON.stringify(chunk.args, null, 2)}\n`, C.magenta);
        });

        adapter.on("tool:result", (chunk: unknown) => {
            print(`Tool result: ${JSON.stringify(chunk, null, 2)}\n`, C.dim);
        });

        adapter.on("tool:error", (chunk: { name: string, error: string }) => {
            print(`Tool error: ${JSON.stringify(chunk, null, 2)}\n`, C.red);
        });
    }
}
