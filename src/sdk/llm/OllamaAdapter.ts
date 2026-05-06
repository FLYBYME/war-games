import { Message, Ollama } from "ollama";
import { Side } from "../schemas/domain.js";
import { EventEmitter } from "../EventEmitter.js";
import { WarGamesTool } from "../tools/Tool.js";
import * as Z from "zod";

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            required: string[];
            properties: Record<string, { type: string; description: string }>;
        };
    };
}

export interface OllamaAdapterConfig {
    ollama: Ollama;
    model: string;
    tools?: WarGamesTool[];
    system?: string;
}

export class OllamaAdapter extends EventEmitter {
    private readonly ollama: Ollama;
    private readonly model: string;
    private readonly tools: WarGamesTool[];
    private messages: Message[] = [];

    constructor(config: OllamaAdapterConfig) {
        super();
        this.ollama = config.ollama;
        this.model = config.model;
        this.tools = config.tools ?? [];
        if (config.system) {
            this.messages.push({ role: 'system', content: config.system });
        }
    }

    public getTools(): WarGamesTool[] {
        return this.tools;
    }

    public clearHistory(): void {
        this.messages = [];
    }

    public addMessage(message: Message): void {
        this.messages.push(message);
    }

    /**
     * Agentic chat loop: handles streaming, tool calls, and state management.
     */
    public async chat(matchId: string, side: Side, prompt: string): Promise<string> {
        this.addMessage({ role: 'user', content: prompt });
        this.emit('chat:started', { prompt, matchId, side });

        let processing = true;
        let finalContent = '';

        while (processing) {
            const stream = await this.ollama.chat({
                model: this.model,
                messages: this.messages,
                tools: this.tools.map(t => getToolDefinition(t)),
                stream: true
            });

            const fullMessage: Message = { role: 'assistant', content: '' };
            let hasToolCalls = false;

            for await (const chunk of stream) {
                if (chunk.message.thinking) {
                    const text = chunk.message.thinking;
                    fullMessage.thinking = (fullMessage.thinking || '') + text;
                    this.emit('chat:thinking', text);
                }

                if (chunk.message.content) {
                    const text = chunk.message.content;
                    fullMessage.content += text;
                    finalContent += text;
                    this.emit('chat:content', text);
                }

                if (chunk.message.tool_calls && chunk.message.tool_calls.length > 0) {
                    fullMessage.tool_calls = chunk.message.tool_calls;
                    hasToolCalls = true;
                }
            }

            this.messages.push(fullMessage);

            if (hasToolCalls && fullMessage.tool_calls) {
                this.emit('chat:tool_calls_detected', fullMessage.tool_calls);

                for (const call of fullMessage.tool_calls) {
                    const tool = this.tools.find(t => t.name === call.function.name);
                    if (!tool) {
                        const errorMsg = `Error: Tool ${call.function.name} not found`;
                        this.messages.push({ role: 'tool', content: errorMsg });
                        continue;
                    }

                    try {
                        this.emit('tool:executing', { name: tool.name, args: call.function.arguments });
                        
                        // Parse arguments through Zod schema to ensure validity
                        const validatedArgs = tool.inputSchema.parse(call.function.arguments);

                        // Execute tool call with match context
                        const result = await tool.call(matchId, side, validatedArgs);
                        const content = typeof result === 'string' ? result : JSON.stringify(result);
                        
                        this.emit('tool:result', { name: tool.name, result });

                        this.messages.push({
                            role: 'tool',
                            content,
                        });
                    } catch (err: any) {
                        const errorMsg = `Error executing tool ${tool.name}: ${err.message}`;
                        this.emit('tool:error', { name: tool.name, error: err.message });
                        this.messages.push({ role: 'tool', content: errorMsg });
                    }
                }
            } else {
                processing = false;
            }
        }

        this.emit('chat:finished', finalContent);
        return finalContent;
    }
}

/**
 * Helper to map WarGamesTool to Ollama's ToolDefinition format.
 */
export function getToolDefinition(tool: WarGamesTool<any, any>): ToolDefinition {
    const shape = tool.inputSchema.shape;
    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as Z.ZodTypeAny;
        properties[key] = {
            type: getJsonType(zodValue),
            description: zodValue.description || `The ${key}`
        };
        if (!(zodValue instanceof Z.ZodOptional)) {
            required.push(key);
        }
    }

    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                required,
                properties
            }
        }
    };
}

function getJsonType(zodType: Z.ZodTypeAny): string {
    if (zodType instanceof Z.ZodString) return 'string';
    if (zodType instanceof Z.ZodNumber) return 'number';
    if (zodType instanceof Z.ZodBoolean) return 'boolean';
    if (zodType instanceof Z.ZodEnum) return 'string';
    return 'string';
}
