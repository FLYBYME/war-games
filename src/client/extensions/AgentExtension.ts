/**
 * AgentExtension — AI Agent chat interface.
 *
 * Provides an interactive chat panel for communicating with AI agents
 * that can invoke simulation tools. Streams agent responses in real-time.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

interface ChatMessage {
    role: 'user' | 'agent' | 'system';
    content: string;
    timestamp: number;
    toolCalls?: { name: string; args: string; result?: string }[];
}

export const AgentExtension: Extension = {
    id: 'wargames.agent',
    name: 'AI Agent',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();
        
        // Thread cache: agentId -> threadId
        const activeThreads = new Map<string, string>();

        const chatProvider: ViewProvider = {
            id: 'agent.chat',
            name: 'AI Agent',
            resolveView: (container, disposables) => {
                const root = document.createElement('div');
                Object.assign(root.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                });

                // Header
                const header = document.createElement('div');
                Object.assign(header.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border, #3e3e42)',
                });
                const headerTitle = new uiLib.Heading({ text: 'AI AGENT', level: 4, transform: 'uppercase' });
                header.appendChild(headerTitle.getElement());

                // Agent selector
                const agentSelect = new uiLib.Select({
                    options: [
                        { label: 'QA Analyst', value: 'qa-analyst' },
                        { label: 'Tactical Commander', value: 'tactical-commander' },
                    ],
                    value: 'qa-analyst',
                    placeholder: 'Select agent...'
                });
                header.appendChild(agentSelect.getElement());
                root.appendChild(header);

                // Message area
                const messageArea = document.createElement('div');
                Object.assign(messageArea.style, {
                    flex: '1',
                    overflow: 'auto',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                });
                root.appendChild(messageArea);

                // Input area
                const inputArea = document.createElement('div');
                Object.assign(inputArea.style, {
                    display: 'flex',
                    gap: '4px',
                    padding: '8px',
                    borderTop: '1px solid var(--border, #3e3e42)',
                });

                const textInput = new uiLib.TextArea({
                    placeholder: 'Send a message to the agent...',
                    rows: 2,
                });
                textInput.getElement().style.flex = '1';
                inputArea.appendChild(textInput.getElement());

                const sendBtn = new uiLib.Button({
                    label: 'Send',
                    icon: 'fas fa-paper-plane',
                    variant: 'primary',
                    size: 'sm',
                    onClick: () => { void sendMessage(); }
                });
                inputArea.appendChild(sendBtn.getElement());
                root.appendChild(inputArea);

                const messages: ChatMessage[] = [];

                const renderMessages = () => {
                    messageArea.innerHTML = '';
                    for (const msg of messages) {
                        const bubble = document.createElement('div');
                        Object.assign(bubble.style, {
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            maxWidth: '85%',
                            wordBreak: 'break-word',
                        });

                        if (msg.role === 'user') {
                            Object.assign(bubble.style, {
                                alignSelf: 'flex-end',
                                backgroundColor: 'var(--accent, #007acc)',
                                color: '#fff',
                            });
                        } else if (msg.role === 'agent') {
                            Object.assign(bubble.style, {
                                alignSelf: 'flex-start',
                                backgroundColor: 'var(--bg-input, #2d2d30)',
                                color: 'var(--text-main, #ccc)',
                                border: '1px solid var(--border, #3e3e42)',
                            });
                        } else {
                            Object.assign(bubble.style, {
                                alignSelf: 'center',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted, #888)',
                                fontSize: '10px',
                                fontStyle: 'italic',
                            });
                        }

                        bubble.textContent = msg.content;
                        messageArea.appendChild(bubble);

                        // Render tool calls if present
                        if (msg.toolCalls) {
                            for (const tc of msg.toolCalls) {
                                const toolCard = document.createElement('div');
                                Object.assign(toolCard.style, {
                                    alignSelf: 'flex-start',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                                    border: '1px solid rgba(0, 122, 204, 0.3)',
                                    color: 'var(--text-main, #ccc)',
                                    maxWidth: '85%',
                                });
                                toolCard.innerHTML = `<strong>🔧 ${tc.name}</strong><br/><span style="color:var(--text-muted)">${tc.args.substring(0, 100)}</span>`;
                                if (tc.result) {
                                    toolCard.innerHTML += `<br/><span style="color:var(--success, #4caf50)">→ ${tc.result.substring(0, 100)}</span>`;
                                }
                                messageArea.appendChild(toolCard);
                            }
                        }
                    }
                    messageArea.scrollTop = messageArea.scrollHeight;
                };

                const sendMessage = async () => {
                    const textarea = textInput.getElement().querySelector('textarea') as HTMLTextAreaElement | null;
                    const text = textarea?.value?.trim();
                    if (!text) return;

                    // Clear input
                    if (textarea) textarea.value = '';

                    // Add user message
                    messages.push({ role: 'user', content: text, timestamp: Date.now() });
                    renderMessages();

                    // Get context
                    const matchId = ide.matches.currentMatchId.get();
                    const selectEl = agentSelect.getElement().querySelector('select') as HTMLSelectElement | null;
                    const agentId = selectEl?.value ?? 'qa-analyst';

                    try {
                        // 1. Ensure we have a thread for this agent
                        let threadId = activeThreads.get(agentId);
                        if (!threadId) {
                            const thread = await client.api.agent.thread_create({ agentId, name: `Chat with ${agentId}` });
                            threadId = thread.id;
                            activeThreads.set(agentId, threadId);
                        }

                        // 2. Run the stream with the prompt
                        const stream = client.api.agent.run_stream({
                            threadId,
                            prompt: text,
                        });

                        let agentContent = '';
                        const toolCalls: { name: string; args: string; result?: string }[] = [];

                        for await (const event of stream) {
                            switch (event.type) {
                                case 'content': {
                                    agentContent += event.text;
                                    // Live update the last agent message
                                    const lastIdx = messages.length - 1;
                                    if (lastIdx >= 0 && messages[lastIdx].role === 'agent') {
                                        messages[lastIdx].content = agentContent;
                                    } else {
                                        messages.push({ role: 'agent', content: agentContent, timestamp: Date.now(), toolCalls });
                                    }
                                    renderMessages();
                                    break;
                                }
                                case 'tool_call': {
                                    toolCalls.push({ name: event.name, args: JSON.stringify(event.args) });
                                    messages.push({
                                        role: 'system',
                                        content: `Calling tool: ${event.name}`,
                                        timestamp: Date.now(),
                                    });
                                    renderMessages();
                                    break;
                                }
                                case 'tool_result': {
                                    const existing = toolCalls.find(tc => tc.name === event.name);
                                    if (existing) {
                                        existing.result = JSON.stringify(event.result);
                                    }
                                    renderMessages();
                                    break;
                                }
                                case 'thinking': {
                                    messages.push({
                                        role: 'system',
                                        content: `💭 ${event.text.substring(0, 100)}`,
                                        timestamp: Date.now(),
                                    });
                                    renderMessages();
                                    break;
                                }
                            }
                        }

                        // Finalize the agent message with tool calls
                        const lastAgent = messages.findLast(m => m.role === 'agent');
                        if (lastAgent) {
                            lastAgent.toolCalls = toolCalls;
                        }
                        renderMessages();

                    } catch (err) {
                        messages.push({
                            role: 'system',
                            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
                            timestamp: Date.now(),
                        });
                        renderMessages();
                    }
                };

                container.appendChild(root);
            }
        };

        ide.views.registerProvider('bottom-panel', chatProvider);

        ide.activityBar.registerItem({
            id: 'agent.chat',
            location: 'bottom-panel',
            icon: 'fas fa-robot',
            title: 'AI Agent',
            order: 30
        });

        ide.commands.register({
            id: 'agent.open',
            label: 'Open AI Agent Chat',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'agent.chat');
            }
        });

        console.log('✅ AgentExtension activated');
    }
};
