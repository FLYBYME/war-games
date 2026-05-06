import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { OllamaAdapter } from '../../sdk/llm/OllamaAdapter.js';
import { DebugTools } from '../../sdk/tools/DebugTools.js';
import { Ollama } from 'ollama';
import { C } from '../core/Utils.js';
import * as readline from 'readline/promises';

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
            .action((opts) => this.execute(opts, program.opts()));
    }

    protected async execute(opts: any, globalOpts: any): Promise<void> {
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

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Debug Agent Failed:${C.reset} ${err.message}`);
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

        while (true) {
            const input = await rl.question(`\n${C.cyan}User > ${C.reset}`);
            if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
                break;
            }
            if (input.trim() === '') continue;

            await adapter.chat(
                undefined,
                undefined,
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

        adapter.on("chat:content", (chunk) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            print(chunk, C.green);
        });

        adapter.on("chat:thinking", (chunk) => {
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

        adapter.on("tool:executing", (chunk: { name: string, args: any }) => {
            if (currentlyThinking) {
                currentlyThinking = false;
                process.stdout.write("\n");
                atNewRow = true;
            }
            print(`Tool executing: ${chunk.name} ${JSON.stringify(chunk.args, null, 2)}\n`, C.magenta);
        });

        adapter.on("tool:result", (chunk) => {
            print(`Tool result: ${JSON.stringify(chunk, null, 2)}\n`, C.dim);
        });

        adapter.on("tool:error", (chunk) => {
            print(`Tool error: ${JSON.stringify(chunk, null, 2)}\n`, C.red);
        });
    }
}
