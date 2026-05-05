import { z } from "zod";
import { Message, Ollama } from 'ollama';

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

export abstract class BaseTool<TSchema extends z.ZodObject<any>> {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly schema: TSchema;

    abstract execute(args: z.infer<TSchema>): string | Promise<string>;

    get definition(): ToolDefinition {
        const shape = this.schema.shape;
        const properties: Record<string, { type: string; description: string }> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value as z.ZodTypeAny;
            properties[key] = {
                type: this.getJsonType(zodValue),
                description: zodValue.description || `The ${key}`
            };
            if (!(zodValue instanceof z.ZodOptional)) {
                required.push(key);
            }
        }

        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    required,
                    properties
                }
            }
        };
    }

    private getJsonType(zodType: z.ZodTypeAny): string {
        if (zodType instanceof z.ZodString) return 'string';
        if (zodType instanceof z.ZodNumber) return 'number';
        if (zodType instanceof z.ZodBoolean) return 'boolean';
        return 'string';
    }
}

export class ToolAgent {
    private ollama: Ollama;
    private tools: BaseTool<any>[];
    private toolMap: Record<string, BaseTool<any>>;

    constructor(baseUrl: string, tools: BaseTool<any>[]) {
        this.ollama = new Ollama({ host: baseUrl });
        this.tools = tools;
        this.toolMap = Object.fromEntries(tools.map(t => [t.name, t]));
    }

    async chat(model: string, messages: Message[]) {
        const currentMessages = [...messages];
        let processing = true;

        while (processing) {
            const stream = await this.ollama.chat({
                model,
                messages: currentMessages,
                tools: this.tools.map(t => t.definition),
                stream: true
            });

            const fullMessage: Message = { role: 'assistant', content: '' };
            
            for await (const chunk of stream) {
                if (chunk.message.thinking) {
                    process.stdout.write(chunk.message.thinking);
                    fullMessage.thinking = (fullMessage.thinking || '') + chunk.message.thinking;
                }
                if (chunk.message.content) {
                    process.stdout.write(chunk.message.content);
                    fullMessage.content += chunk.message.content;
                }
                if (chunk.message.tool_calls) {
                    fullMessage.tool_calls = chunk.message.tool_calls;
                }
            }

            currentMessages.push(fullMessage);

            if (fullMessage.tool_calls && fullMessage.tool_calls.length > 0) {
                console.log(`\n--- Executing ${fullMessage.tool_calls.length} tool calls...`);
                
                for (const toolCall of fullMessage.tool_calls) {
                    const tool = this.toolMap[toolCall.function.name];
                    if (!tool) {
                        currentMessages.push({ role: 'tool', content: `Error: Tool ${toolCall.function.name} not found` });
                        continue;
                    }

                    try {
                        const validatedArgs = tool.schema.parse(toolCall.function.arguments);
                        const output = await tool.execute(validatedArgs);
                        console.log(`\n> ${tool.name}(${JSON.stringify(validatedArgs)}) => ${output}`);
                        
                        currentMessages.push({
                            role: 'tool',
                            content: output.toString(),
                        });
                    } catch (err: any) {
                        currentMessages.push({ role: 'tool', content: `Error: ${err.message}` });
                    }
                }
            } else {
                processing = false;
                return fullMessage.content || '';
            }
        }
        return '';
    }
}
