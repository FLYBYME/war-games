import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// --- Schemas ---

export const AgentConfigSchema = z.object({
    temperature: z.number().optional().describe("Sampling temperature"),
    topP: z.number().optional().describe("Top-p sampling"),
    maxTokens: z.number().optional().describe("Maximum tokens to generate"),
}).describe("Configuration parameters for the agent's LLM");

export const AgentSchema = z.object({
    id: z.string().describe("Unique identifier for the agent"),
    name: z.string().describe("Display name of the agent"),
    systemPrompt: z.string().describe("The base instructions for the agent"),
    model: z.string().describe("The LLM model to use (e.g., 'llama3.2')"),
    config: AgentConfigSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const ThreadSchema = z.object({
    id: z.string().describe("Unique identifier for the thread"),
    agentId: z.string().describe("The agent associated with this thread"),
    matchId: z.string().optional().describe("Optional match context"),
    name: z.string().describe("Display name of the thread"),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const MessageSchema = z.object({
    id: z.string().describe("Unique identifier for the message"),
    threadId: z.string().describe("The thread this message belongs to"),
    role: z.enum(['user', 'assistant', 'tool', 'system']).describe("The role of the message author"),
    content: z.string().nullable().describe("The text content of the message"),
    toolCalls: z.array(z.object({
        name: z.string(),
        arguments: z.any(),
    })).nullable().describe("Any tool calls made in this message"),
    createdAt: z.date(),
});

export const AgentEventSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('thinking'), text: z.string() }),
    z.object({ type: z.literal('content'), text: z.string() }),
    z.object({ type: z.literal('tool_call'), name: z.string(), args: z.any(), callId: z.string() }),
    z.object({ type: z.literal('tool_result'), name: z.string(), result: z.any(), callId: z.string() }),
    z.object({ type: z.literal('done'), messageId: z.string() }),
    z.object({ type: z.literal('error'), error: z.string() }),
]);

export const AgentCreateInputSchema = z.object({
    name: z.string().describe("Name of the agent"),
    systemPrompt: z.string().describe("System prompt instructions"),
    model: z.string().default('llama3.2').describe("Model name"),
    config: AgentConfigSchema.default({}),
});

export const AgentListInputSchema = z.object({});
export const AgentListOutputSchema = z.array(AgentSchema);

export const ThreadCreateInputSchema = z.object({
    agentId: z.string().describe("Target agent ID"),
    matchId: z.string().optional().describe("Optional match ID context"),
    name: z.string().describe("Thread name"),
});

export const ThreadHistoryInputSchema = z.object({
    threadId: z.string().describe("Target thread ID"),
});
export const ThreadHistoryOutputSchema = z.array(MessageSchema);

export const AgentRunStreamInputSchema = z.object({
    threadId: z.string().describe("Target thread ID"),
    prompt: z.string().describe("User prompt to send to the agent"),
    allowedTools: z.array(z.string()).optional().describe("Optional list of tool keys the agent can use"),
});

export const AgentDeleteInputSchema = z.object({
    agentId: z.string().describe("The ID of the agent to delete"),
});

export const AgentDeleteOutputSchema = z.object({
    success: z.boolean().describe("Whether the agent was successfully deleted"),
});

export const AgentSeedInputSchema = z.object({
    overwrite: z.boolean().default(true).describe("Whether to overwrite existing agents with new prompts")
});

export const AgentSeedOutputSchema = z.object({
    created: z.number().describe("Number of agents created"),
    updated: z.number().describe("Number of agents updated"),
});

// --- Contracts ---

export const agentCreateContract = defineContract({
    domain: 'agent',
    action: 'create',
    description: 'Create a new AI agent with a specific system prompt and model.',
    inputSchema: AgentCreateInputSchema,
    outputSchema: AgentSchema,
    rest: { method: 'POST', path: '/agents' }
});

export const agentListContract = defineContract({
    domain: 'agent',
    action: 'list',
    description: 'List all available agents.',
    inputSchema: AgentListInputSchema,
    outputSchema: AgentListOutputSchema,
    rest: { method: 'GET', path: '/agents' }
});

export const agentDeleteContract = defineContract({
    domain: 'agent',
    action: 'delete',
    description: 'Delete an agent and all its associated threads and messages.',
    inputSchema: AgentDeleteInputSchema,
    outputSchema: AgentDeleteOutputSchema,
    rest: { method: 'DELETE', path: '/agents/:agentId' }
});

export const agentSeedContract = defineContract({
    domain: 'agent',
    action: 'seed',
    description: 'Populate or update the agent registry with system prompts from the prompts folder.',
    inputSchema: AgentSeedInputSchema,
    outputSchema: AgentSeedOutputSchema,
    rest: { method: 'POST', path: '/agents/seed' }
});

export const threadCreateContract = defineContract({
    domain: 'agent',
    action: 'thread_create',
    description: 'Create a new conversation thread for an agent.',
    inputSchema: ThreadCreateInputSchema,
    outputSchema: ThreadSchema,
    rest: { method: 'POST', path: '/agents/:agentId/threads' }
});

export const threadHistoryContract = defineContract({
    domain: 'agent',
    action: 'thread_history',
    description: 'Retrieve the message history for a specific thread.',
    inputSchema: ThreadHistoryInputSchema,
    outputSchema: ThreadHistoryOutputSchema,
    rest: { method: 'GET', path: '/threads/:threadId/history' }
});

export const agentRunStreamContract = defineContract({
    domain: 'agent',
    action: 'run_stream',
    description: 'Execute a run on a thread and stream the agent response.',
    inputSchema: AgentRunStreamInputSchema,
    outputSchema: AgentEventSchema,
    rest: { method: 'POST', path: '/threads/:threadId/run', isStream: true }
});
