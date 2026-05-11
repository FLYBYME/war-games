import { Signal } from '../../../core/Signal';
import { WarGamesClientV2 } from '../../../../sdk_v2/generated/WarGamesClientV2';
import * as Contracts from '../../../../sdk_v2/contracts';
import { z } from 'zod';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    toolCalls?: { name: string; args: string; result?: string }[];
}

export type Agent = z.infer<typeof Contracts.AgentSchema>;
export type Thread = z.infer<typeof Contracts.ThreadSchema>;

export class ChatService {
    public readonly messages = new Signal<ChatMessage[]>([]);
    public readonly threads = new Signal<Thread[]>([]);
    public readonly agents = new Signal<Agent[]>([]);
    public readonly isTyping = new Signal<boolean>(false);
    public readonly currentAgentId = new Signal<string | null>(null);
    public readonly currentThreadId = new Signal<string | null>(null);
    public readonly activeAgent = new Signal<Agent | null>(null);

    constructor(private client: WarGamesClientV2) {
        void this.refreshAgents();
    }

    public async refreshAgents() {
        const agents = await this.client.api.agent.list({});
        this.agents.set(agents);
        
        // If we have a current agent, update the activeAgent object
        const currentId = this.currentAgentId.get();
        if (currentId) {
            const found = agents.find(a => a.id === currentId);
            if (found) this.activeAgent.set(found);
        }
    }

    public async refreshThreads() {
        const agentId = this.currentAgentId.get();
        if (!agentId) return;

        const threads = await this.client.api.agent.thread_list({ agentId });
        this.threads.set(threads);
    }

    public async selectAgent(agentId: string) {
        this.currentAgentId.set(agentId);
        
        const agent = this.agents.get().find(a => a.id === agentId);
        if (agent) {
            this.activeAgent.set(agent);
        } else {
            // Fallback: refresh and try again
            await this.refreshAgents();
            const refreshedAgent = this.agents.get().find(a => a.id === agentId);
            if (refreshedAgent) this.activeAgent.set(refreshedAgent);
        }

        // Load recent threads for this agent
        await this.refreshThreads();

        // If there are threads, pick the most recent one, otherwise create new
        const threads = this.threads.get();
        if (threads.length > 0) {
            await this.setThread(threads[0].id);
        } else {
            await this.createNewThread(`New Chat with ${agent?.name || agentId}`);
        }
    }

    public async setThread(threadId: string) {
        this.currentThreadId.set(threadId);
        await this.loadHistory(threadId);
    }

    public async createNewThread(name: string) {
        const agentId = this.currentAgentId.get();
        if (!agentId) return;

        const thread = await this.client.api.agent.thread_create({ 
            agentId, 
            name 
        });
        
        await this.refreshThreads();
        await this.setThread(thread.id);
    }

    public async deleteThread(threadId: string) {
        await this.client.api.agent.thread_delete({ threadId });
        await this.refreshThreads();
        
        if (this.currentThreadId.get() === threadId) {
            const threads = this.threads.get();
            if (threads.length > 0) {
                await this.setThread(threads[0].id);
            } else {
                this.currentThreadId.set(null);
                this.messages.set([]);
            }
        }
    }

    public async updateAgentPrompt(systemPrompt: string) {
        const agentId = this.currentAgentId.get();
        if (!agentId) return;

        const updated = await this.client.api.agent.update({
            agentId,
            systemPrompt
        });

        this.activeAgent.set(updated);
        // Also update in list
        this.agents.set(this.agents.get().map(a => a.id === agentId ? updated : a));
    }

    private async loadHistory(threadId: string) {
        this.messages.set([]);
        const history = await this.client.api.agent.thread_history({ threadId });
        
        const chatMessages: ChatMessage[] = history.map((m: any) => ({
            id: m.id,
            role: m.role as any,
            content: m.content || '',
            timestamp: m.createdAt.getTime(),
            toolCalls: m.toolCalls?.map((tc: any) => ({
                name: tc.name,
                args: JSON.stringify(tc.arguments)
            }))
        }));
        
        this.messages.set(chatMessages);
    }

    public async sendMessage(text: string) {
        const threadId = this.currentThreadId.get();
        if (!threadId || !text.trim()) return;

        // Add user message locally for immediate feedback
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };
        this.messages.set([...this.messages.get(), userMsg]);

        this.isTyping.set(true);

        try {
            const stream = this.client.api.agent.run_stream({
                threadId,
                prompt: text,
            });

            let assistantMsg: ChatMessage | null = null;

            for await (const event of stream) {
                switch (event.type) {
                    case 'content': {
                        if (!assistantMsg) {
                            assistantMsg = {
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: '',
                                timestamp: Date.now(),
                                toolCalls: []
                            };
                            this.messages.set([...this.messages.get(), assistantMsg]);
                        }
                        assistantMsg.content += event.text;
                        this.messages.set([...this.messages.get()]); // Trigger update
                        break;
                    }
                    case 'tool_call': {
                        if (assistantMsg) {
                            assistantMsg.toolCalls?.push({ 
                                name: event.name, 
                                args: JSON.stringify(event.args) 
                            });
                            this.messages.set([...this.messages.get()]);
                        }
                        break;
                    }
                    case 'tool_result': {
                        if (assistantMsg) {
                            const tc = assistantMsg.toolCalls?.find(t => t.name === event.name);
                            if (tc) tc.result = JSON.stringify(event.result);
                            this.messages.set([...this.messages.get()]);
                        }
                        break;
                    }
                    case 'done': {
                        if (assistantMsg) assistantMsg.id = event.messageId;
                        this.isTyping.set(false);
                        // Refresh threads to update 'updatedAt' if needed
                        void this.refreshThreads();
                        break;
                    }
                }
            }
        } catch (err) {
            console.error('ChatService: Error sending message', err);
            this.messages.set([...this.messages.get(), {
                id: crypto.randomUUID(),
                role: 'system',
                content: `Error: ${err instanceof Error ? err.message : String(err)}`,
                timestamp: Date.now()
            }]);
            this.isTyping.set(false);
        }
    }
}

