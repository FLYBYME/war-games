import { Message, Ollama } from "ollama";
import { EventEmitter } from "events";
import { ToolContract, toolKey } from "../sdk_v2/contracts/core/tool_contract.js";
import * as Z from "zod";

/**
 * ToolDefinition: Ollama-compatible function schema.
 */
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

/**
 * AssistantResponse: The structured output from the LLM adapter.
 */
export interface AssistantResponse {
    content: string;
    thinking?: string;
    toolCalls?: Array<{
        name: string;
        arguments: any;
    }>;
}

export interface OllamaAdapterConfig {
    ollama: Ollama;
    model: string;
    system?: string;
}

/**
 * OllamaAdapter: A pure protocol translator for Ollama.
 * It handles message history and translates V2 ToolContracts into LLM schemas.
 * It DOES NOT execute tools; it only returns the LLM's requests.
 */
export class OllamaAdapter extends EventEmitter {
    private readonly ollama: Ollama;
    private readonly model: string;
    private messages: Message[] = [];

    constructor(config: OllamaAdapterConfig) {
        super();
        this.ollama = config.ollama;
        this.model = config.model;
        if (config.system) {
            this.messages.push({ role: 'system', content: config.system });
        }
    }

    public clearHistory(): void {
        this.messages = [];
    }

    public addMessage(message: Message): void {
        this.messages.push(message);
    }

    public getHistory(): Message[] {
        return [...this.messages];
    }

    /**
     * Chat: Sends a prompt to the LLM and returns the assistant's response.
     * Supports streaming thinking/content and tool call detection.
     */
    public async *chatStream(prompt: string, toolContracts: ToolContract[] = []): AsyncIterable<AssistantResponse & { type: 'thinking' | 'content' | 'tool_calls' | 'finished' }> {
        this.addMessage({ role: 'user', content: prompt });
        this.emit('chat:started', { prompt });

        const tools = toolContracts.map(t => getToolDefinition(t));

        const stream = await this.ollama.chat({
            model: this.model,
            messages: this.messages,
            tools: tools.length > 0 ? tools : undefined,
            stream: true,
            think: false,
            options: {
                temperature: 0.1
            }
        });

        const fullMessage: Message = { role: 'assistant', content: '' };

        for await (const chunk of stream) {
            if (chunk.message.thinking) {
                const text = chunk.message.thinking;
                fullMessage.thinking = (fullMessage.thinking || '') + text;
                this.emit('chat:thinking', text);
                yield { type: 'thinking', thinking: text, content: '' };
            }

            if (chunk.message.content) {
                const text = chunk.message.content;
                fullMessage.content += text;
                this.emit('chat:content', text);
                yield { type: 'content', content: text };
            }

            if (chunk.message.tool_calls && chunk.message.tool_calls.length > 0) {
                fullMessage.tool_calls = chunk.message.tool_calls;
                yield {
                    type: 'tool_calls',
                    content: '',
                    toolCalls: chunk.message.tool_calls.map(tc => ({
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }))
                };
            }
        }

        this.addMessage(fullMessage);
        this.emit('chat:finished', fullMessage.content);

        yield {
            type: 'finished',
            content: fullMessage.content,
            thinking: fullMessage.thinking,
            toolCalls: fullMessage.tool_calls?.map(tc => ({
                name: tc.function.name,
                arguments: tc.function.arguments
            }))
        };
    }

    public async chat(prompt: string, toolContracts: ToolContract[] = []): Promise<AssistantResponse> {
        let finalResponse: AssistantResponse = { content: '' };
        for await (const chunk of this.chatStream(prompt, toolContracts)) {
            if (chunk.type === 'finished') {
                finalResponse = {
                    content: chunk.content,
                    thinking: chunk.thinking,
                    toolCalls: chunk.toolCalls
                };
            }
        }
        return finalResponse;
    }
}

/**
 * Helper to map ToolContract to Ollama's ToolDefinition format.
 */
export function getToolDefinition(tool: ToolContract): ToolDefinition {
    if (!(tool.inputSchema instanceof Z.ZodObject)) {
        throw new Error(`Tool ${toolKey(tool)} inputSchema must be a ZodObject`);
    }

    const shape = tool.inputSchema.shape;
    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
        const zodValue = value as Z.ZodTypeAny;
        properties[key] = {
            type: getJsonType(zodValue),
            description: zodValue.description || `The ${key}`
        };
        if (!(zodValue instanceof Z.ZodOptional) && !(zodValue instanceof Z.ZodDefault)) {
            required.push(key);
        }
    }

    return {
        type: 'function',
        function: {
            name: toolKey(tool),
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
    let unwrapped = zodType;

    // Unwrap common wrappers
    while (true) {
        if (unwrapped instanceof Z.ZodOptional || unwrapped instanceof Z.ZodDefault || unwrapped instanceof Z.ZodNullable) {
            unwrapped = (unwrapped as any)._def.innerType;
        } else if (unwrapped instanceof Z.ZodEffects) {
            unwrapped = (unwrapped as any)._def.schema;
        } else {
            break;
        }
    }

    if (unwrapped instanceof Z.ZodString) return 'string';
    if (unwrapped instanceof Z.ZodNumber) return 'number';
    if (unwrapped instanceof Z.ZodBoolean) return 'boolean';
    if (unwrapped instanceof Z.ZodEnum) return 'string';
    if (unwrapped instanceof Z.ZodArray) return 'array';
    if (unwrapped instanceof Z.ZodObject) return 'object';
    if (unwrapped instanceof Z.ZodDiscriminatedUnion) return 'object';
    if (unwrapped instanceof Z.ZodRecord) return 'object';
    if (unwrapped instanceof Z.ZodUnion) return 'object';

    return 'string';
}
