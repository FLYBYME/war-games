import { OllamaAdapter, AssistantResponse } from './OllamaAdapter.js';
import { WarGamesClientV2 } from '../sdk_v2/generated/WarGamesClientV2.js';
import { globalContractRegistry, ToolContract } from '../sdk_v2/contracts/core/tool_contract.js';
import { Side } from '../engine/core/Types.js';
import { EventEmitter } from 'events';

export interface AgentConfig {
    adapter: OllamaAdapter;
    client: WarGamesClientV2;
    /** Optional: List of tool names (e.g. ['match_list', 'sensor_update']) this agent is allowed to use. */
    allowedTools?: string[];
}

/**
 * WarGamesAgent: Orchestrates the LLM and the V2 Simulation Engine.
 * It translates natural language into SDK calls via the provided adapter.
 */
export class WarGamesAgent extends EventEmitter {
    private readonly adapter: OllamaAdapter;
    private readonly client: WarGamesClientV2;
    private readonly allowedTools?: string[];

    constructor(config: AgentConfig) {
        super();
        this.adapter = config.adapter;
        this.client = config.client;
        this.allowedTools = config.allowedTools;
    }

    /**
     * Run: Executes a natural language command for a specific match and side.
     */
    public async run(prompt: string): Promise<string> {
        let currentPrompt = prompt;
        let isProcessing = true;
        let finalResponse = '';

        // Filter contracts based on allowedTools config
        const allContracts = Array.from(globalContractRegistry.values());
        const contracts = this.allowedTools
            ? allContracts.filter(c => this.allowedTools!.includes(`${c.domain}_${c.action}`))
            : allContracts;

        while (isProcessing) {
            const response: AssistantResponse = await this.adapter.chat(currentPrompt, contracts);

            if (response.toolCalls && response.toolCalls.length > 0) {
                this.emit('agent:tool_calls', response.toolCalls);

                for (const call of response.toolCalls) {
                    // Check if tool is allowed (safety check)
                    if (this.allowedTools && !this.allowedTools.includes(call.name)) {
                        const errorMsg = `Error: You are not authorized to use tool '${call.name}'.`;
                        this.adapter.addMessage({ role: 'tool', content: errorMsg });
                        continue;
                    }

                    const result = await this.executeTool(call.name, call.arguments);

                    // Feed the tool result back to the LLM
                    this.adapter.addMessage({
                        role: 'tool',
                        content: typeof result === 'string' ? result : JSON.stringify(result)
                    });
                }

                // Continue the loop with a prompt to process tool results
                currentPrompt = "Based on the tool results above, continue your response or take further action.";
            } else {
                finalResponse = response.content;
                isProcessing = false;
            }
        }

        return finalResponse;
    }

    /**
     * executeTool: Dynamically routes a tool call to the generated SDK.
     */
    private async executeTool(name: string, args: any): Promise<any> {
        const contract = globalContractRegistry.get(name);
        if (!contract) {
            throw new Error(`Tool contract not found: ${name}`);
        }

        this.emit('agent:executing_tool', { name, args });

        try {
            // Locate the method in the client API: client.api[domain][action]
            const domainApi = (this.client.api as any)[contract.domain];
            if (!domainApi || typeof domainApi[contract.action] !== 'function') {
                throw new Error(`SDK method not found for tool: ${name}`);
            }

            const result = await domainApi[contract.action](args);
            this.emit('agent:tool_result', { name, result });
            return result;
        } catch (err: any) {
            this.emit('agent:tool_error', { name, error: err.message });
            return { error: err.message };
        }
    }
}
