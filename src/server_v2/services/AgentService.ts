import { db } from '../db/db.js';
import { agents, threads, messages } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { Ollama } from 'ollama';
import { OllamaAdapter } from '../../llm/OllamaAdapter.js';
import { globalContractRegistry } from '../../sdk_v2/contracts/core/tool_contract.js';

export class AgentService {
    private readonly ollama: Ollama;

    constructor(ollamaHost?: string) {
        const host = ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
        this.ollama = new Ollama({ host });
    }

    async createAgent(input: { name: string; systemPrompt: string; model: string; config: any }) {
        const id = crypto.randomUUID();
        const now = new Date();
        const [agent] = await db.insert(agents).values({
            id,
            name: input.name,
            systemPrompt: input.systemPrompt,
            model: input.model,
            config: input.config,
            createdAt: now,
            updatedAt: now,
        }).returning();
        return agent;
    }

    async listAgents() {
        return db.select().from(agents).orderBy(desc(agents.createdAt));
    }

    async createThread(input: { agentId: string; matchId?: string; name: string }) {
        const id = crypto.randomUUID();
        const now = new Date();
        const [thread] = await db.insert(threads).values({
            id,
            agentId: input.agentId,
            matchId: input.matchId,
            name: input.name,
            createdAt: now,
            updatedAt: now,
        }).returning();
        return thread;
    }

    async listThreads(filter: { agentId?: string; matchId?: string } = {}) {
        let query = db.select().from(threads);
        const conditions = [];
        if (filter.agentId) conditions.push(eq(threads.agentId, filter.agentId));
        if (filter.matchId) conditions.push(eq(threads.matchId, filter.matchId));
        
        // Simplified query handling for now
        if (conditions.length > 0) {
            // In a real app we'd use 'and(...conditions)'
            if (filter.agentId) return db.select().from(threads).where(eq(threads.agentId, filter.agentId)).orderBy(desc(threads.updatedAt));
            if (filter.matchId) return db.select().from(threads).where(eq(threads.matchId, filter.matchId)).orderBy(desc(threads.updatedAt));
        }
        return query.orderBy(desc(threads.updatedAt));
    }

    async updateThread(threadId: string, input: { name: string }) {
        const [thread] = await db.update(threads)
            .set({ name: input.name, updatedAt: new Date() })
            .where(eq(threads.id, threadId))
            .returning();
        return thread;
    }

    async deleteThread(threadId: string) {
        await db.delete(messages).where(eq(messages.threadId, threadId));
        const result = await db.delete(threads).where(eq(threads.id, threadId)).returning();
        return result.length > 0;
    }

    async updateMessage(messageId: string, input: { content: string }) {
        const [message] = await db.update(messages)
            .set({ content: input.content })
            .where(eq(messages.id, messageId))
            .returning();
        return message;
    }

    async deleteMessage(messageId: string) {
        const result = await db.delete(messages).where(eq(messages.id, messageId)).returning();
        return result.length > 0;
    }

    async updateAgent(agentId: string, input: { name?: string; systemPrompt?: string; model?: string; config?: any }) {
        const [agent] = await db.update(agents)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(agents.id, agentId))
            .returning();
        return agent;
    }

    async getThreadHistory(threadId: string) {
        return db.select().from(messages).where(eq(messages.threadId, threadId)).orderBy(messages.createdAt);
    }

    async *runAgentStream(threadId: string, prompt: string, allowedTools?: string[], sdkBaseUrl: string = 'http://localhost:3000/api/v2') {
        const [thread] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);
        if (!thread) throw new Error(`Thread not found: ${threadId}`);

        const [agent] = await db.select().from(agents).where(eq(agents.id, thread.agentId)).limit(1);
        if (!agent) throw new Error(`Agent not found: ${thread.agentId}`);

        // 1. Persist User Message
        const userMessageId = crypto.randomUUID();
        await db.insert(messages).values({
            id: userMessageId,
            threadId,
            role: 'user',
            content: prompt,
            createdAt: new Date(),
        });

        // 2. Build History for LLM
        const history = await this.getThreadHistory(threadId);

        // 3. Setup Adapter
        let systemPrompt = agent.systemPrompt;
        if (thread.matchId) {
            systemPrompt += `\n\n[CONTEXT] Current Match ID: ${thread.matchId}.`;
            systemPrompt += `\n[VALID SIDES] Blue, Red, Green, Neutral. Use these for side filters.`;
            systemPrompt += `\nUse the match ID for all simulation tool calls.`;
        }

        const adapter = new OllamaAdapter({
            ollama: this.ollama,
            model: agent.model,
            system: systemPrompt,
        });

        for (const m of history) {
            if (m.role !== 'system') {
                adapter.addMessage({
                    role: m.role as any,
                    content: m.content || '',
                    tool_calls: (m.toolCalls as any)?.map((tc: any) => ({
                        function: { name: tc.name, arguments: tc.arguments }
                    }))
                });
            }
        }

        const allContracts = Array.from(globalContractRegistry.values());
        const contracts = allowedTools
            ? allContracts.filter(c => allowedTools.includes(`${c.domain}_${c.action}`))
            : allContracts;

        // 4. Run Loop
        let isProcessing = true;
        let currentPrompt = prompt;

        // Dynamic import of SDK to avoid circular dependencies or build issues if it's not generated yet
        const { WarGamesClientV2 } = await import('../../sdk_v2/generated/WarGamesClientV2.js');
        const client = new WarGamesClientV2(sdkBaseUrl);

        while (isProcessing) {
            let lastAssistantContent = '';
            let lastAssistantThinking = '';
            let lastAssistantToolCalls: any[] = [];

            for await (const chunk of adapter.chatStream(currentPrompt, contracts)) {
                if (chunk.type === 'thinking') {
                    lastAssistantThinking += chunk.thinking;
                    yield { type: 'thinking', text: chunk.thinking };
                } else if (chunk.type === 'content') {
                    lastAssistantContent += chunk.content;
                    yield { type: 'content', text: chunk.content };
                } else if (chunk.type === 'tool_calls') {
                    lastAssistantToolCalls = chunk.toolCalls || [];
                    for (const tc of lastAssistantToolCalls) {
                        yield { type: 'tool_call', name: tc.name, args: tc.arguments, callId: crypto.randomUUID() };
                    }
                } else if (chunk.type === 'finished') {
                    // Chat finished for this turn
                }
            }

            // If we have tool calls, execute them
            if (lastAssistantToolCalls.length > 0) {
                const results: any[] = [];
                for (const tc of lastAssistantToolCalls) {
                    try {
                        const domainApi = (client.api as any)[tc.name.split('_')[0]];
                        const action = tc.name.split('_').slice(1).join('_');
                        const result = await domainApi[action](tc.arguments);

                        results.push(result);
                        yield { type: 'tool_result', name: tc.name, result, callId: crypto.randomUUID() };

                        adapter.addMessage({
                            role: 'tool',
                            content: JSON.stringify(result)
                        });
                    } catch (err: any) {
                        const errorResult = { error: err.message };
                        results.push(errorResult);
                        yield { type: 'tool_result', name: tc.name, result: errorResult, callId: crypto.randomUUID() };
                        adapter.addMessage({
                            role: 'tool',
                            content: JSON.stringify(errorResult)
                        });
                    }
                }

                // Continue the loop with a prompt to process tool results
                currentPrompt = "Based on the tool results, continue.";
            } else {
                // No more tool calls, we are done
                const assistantMessageId = crypto.randomUUID();
                await db.insert(messages).values({
                    id: assistantMessageId,
                    threadId,
                    role: 'assistant',
                    content: lastAssistantContent,
                    toolCalls: lastAssistantToolCalls.length > 0 ? lastAssistantToolCalls : null,
                    createdAt: new Date(),
                });
                yield { type: 'done', messageId: assistantMessageId };
                isProcessing = false;
            }
        }
    }

    async deleteAgent(agentId: string) {
        // Cascading delete is not in schema, so we do it manually
        const agentThreads = await db.select().from(threads).where(eq(threads.agentId, agentId));
        for (const thread of agentThreads) {
            await db.delete(messages).where(eq(messages.threadId, thread.id));
        }
        await db.delete(threads).where(eq(threads.agentId, agentId));
        const result = await db.delete(agents).where(eq(agents.id, agentId)).returning();
        return result.length > 0;
    }

    async seedAgents(overwrite: boolean = true) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const promptsDir = path.join(process.cwd(), 'src', 'server_v2', 'prompts');

        let created = 0;
        let updated = 0;

        try {
            const files = await fs.readdir(promptsDir);
            for (const file of files) {
                if (!file.endsWith('.md')) continue;

                const name = file.replace('.md', '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const systemPrompt = await fs.readFile(path.join(promptsDir, file), 'utf-8');

                // Check if agent exists by name (simplified for seeding)
                const [existing] = await db.select().from(agents).where(eq(agents.name, name)).limit(1);

                if (existing) {
                    if (overwrite && existing.systemPrompt !== systemPrompt) {
                        await db.update(agents)
                            .set({ systemPrompt, updatedAt: new Date() })
                            .where(eq(agents.id, existing.id));
                        updated++;
                    }
                } else {
                    await this.createAgent({
                        name,
                        systemPrompt,
                        model: 'qwen3.5:14b', // Default for now
                        config: { temperature: 0.1 }
                    });
                    created++;
                }
            }
        } catch (err) {
            console.error('Error seeding agents:', err);
        }

        return { created, updated };
    }
}
