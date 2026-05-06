import { vitest, describe, it, expect, beforeEach } from 'vitest';
import { OllamaAdapter } from '../llm/OllamaAdapter.js';
import { WarGamesTool } from '../tools/Tool.js';
import { Side } from '../index.js';
import * as Z from 'zod';
import { Message, Ollama } from 'ollama';

describe('OllamaAdapter', () => {
    let mockOllama: any;
    let adapter: OllamaAdapter;
    let mockTool: WarGamesTool<any, any>;

    beforeEach(() => {
        mockOllama = {
            chat: vitest.fn()
        };

        mockTool = {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: Z.object({ arg1: Z.string() }),
            outputSchema: Z.string(),
            call: vitest.fn().mockResolvedValue('tool_result')
        };

        adapter = new OllamaAdapter({
            ollama: mockOllama as any,
            model: 'test-model',
            tools: [mockTool]
        });
    });

    it('should handle a simple chat without tool calls', async () => {
        const mockStream = (async function* () {
            yield { message: { role: 'assistant', content: 'Hello' } };
            yield { message: { role: 'assistant', content: ' world' } };
        })();

        mockOllama.chat.mockResolvedValue(mockStream);

        const contentHandler = vitest.fn();
        adapter.on('chat:content', contentHandler);

        const result = await adapter.chat('match-1', Side.Blue, 'Hi');

        expect(result).toBe('Hello world');
        expect(contentHandler).toHaveBeenCalledTimes(2);
        expect(mockOllama.chat).toHaveBeenCalledWith(expect.objectContaining({
            model: 'test-model',
            messages: expect.arrayContaining([
                expect.objectContaining({ role: 'user', content: 'Hi' })
            ])
        }));
    });

    it('should handle tool calls and recurse', async () => {
        // First call returns a tool call
        const mockStream1 = (async function* () {
            yield { 
                message: { 
                    role: 'assistant', 
                    content: '', 
                    tool_calls: [{ 
                        function: { 
                            name: 'test_tool', 
                            arguments: { arg1: 'val1' } 
                        } 
                    }] 
                } 
            };
        })();

        // Second call returns final content
        const mockStream2 = (async function* () {
            yield { message: { role: 'assistant', content: 'Tool worked!' } };
        })();

        mockOllama.chat
            .mockResolvedValueOnce(mockStream1)
            .mockResolvedValueOnce(mockStream2);

        const toolResultHandler = vitest.fn();
        adapter.on('tool:result', toolResultHandler);

        const result = await adapter.chat('match-1', Side.Blue, 'Use the tool');

        expect(result).toBe('Tool worked!');
        expect(mockTool.call).toHaveBeenCalledWith('match-1', Side.Blue, { arg1: 'val1' });
        expect(toolResultHandler).toHaveBeenCalledWith({ name: 'test_tool', result: 'tool_result' });
        
        // Check message history
        expect(mockOllama.chat).toHaveBeenCalledTimes(2);
    });

    it('should emit thinking events', async () => {
        const mockStream = (async function* () {
            yield { message: { role: 'assistant', thinking: 'I am thinking...' } };
            yield { message: { role: 'assistant', content: 'Done.' } };
        })();

        mockOllama.chat.mockResolvedValue(mockStream);

        const thinkingHandler = vitest.fn();
        adapter.on('chat:thinking', thinkingHandler);

        await adapter.chat('match-1', Side.Blue, 'Think');

        expect(thinkingHandler).toHaveBeenCalledWith('I am thinking...');
    });

    it('should include system prompt if provided', async () => {
        const sysAdapter = new OllamaAdapter({
            ollama: mockOllama as any,
            model: 'test-model',
            system: 'You are a helpful assistant'
        });

        const mockStream = (async function* () {
            yield { message: { role: 'assistant', content: 'OK' } };
        })();
        mockOllama.chat.mockResolvedValue(mockStream);

        await sysAdapter.chat('match-1', Side.Blue, 'Hi');

        expect(mockOllama.chat).toHaveBeenCalledWith(expect.objectContaining({
            messages: expect.arrayContaining([
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Hi' }
            ])
        }));
    });
});
