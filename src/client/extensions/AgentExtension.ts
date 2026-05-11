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
                const root = new uiLib.Column({ fill: true });

                // Header
                const header = new uiLib.Row({ 
                    padding: 'sm', 
                    gap: 'md', 
                    align: 'center' 
                });

                const headerTitle = new uiLib.Heading({ text: 'AI AGENT', level: 4 });
                
                const agentSelect = new uiLib.Select({
                    options: [
                        { label: 'QA Analyst', value: 'qa-analyst' },
                        { label: 'Tactical Commander', value: 'tactical-commander' },
                    ],
                    value: 'qa-analyst',
                    placeholder: 'Select agent...'
                });

                header.appendChildren(headerTitle, agentSelect);
                root.appendChildren(header);

                // Message area with ScrollArea
                const messageList = new uiLib.Column({ gap: 'md', padding: 'md' });
                const scrollArea = new uiLib.ScrollArea({ fill: true, children: [messageList] });
                root.appendChildren(scrollArea);

                // Input area
                const inputRow = new uiLib.Row({ 
                    padding: 'sm', 
                    gap: 'sm', 
                    align: 'flex-end' 
                });

                const textInput = new uiLib.TextArea({
                    placeholder: 'Send a message to the agent...',
                    rows: 1
                });
                textInput.getElement().style.flex = '1';

                const sendBtn = new uiLib.Button({
                    label: 'Send',
                    icon: 'fas fa-paper-plane',
                    variant: 'primary',
                    size: 'sm',
                    onClick: () => { void sendMessage(); }
                });

                inputRow.appendChildren(textInput, sendBtn);
                root.appendChildren(inputRow);

                const messages: ChatMessage[] = [];

                const renderMessages = () => {
                    messageList.getElement().innerHTML = '';
                    for (const msg of messages) {
                        const isUser = msg.role === 'user';
                        const isAgent = msg.role === 'agent';

                        const bubble = new uiLib.Column({
                            padding: 'sm',
                            gap: 'xs'
                        });
                        
                        bubble.getElement().style.alignSelf = isUser ? 'flex-end' : 'flex-start';
                        bubble.getElement().style.maxWidth = '85%';
                        bubble.getElement().classList.add('chat-bubble');
                        
                        if (isUser) {
                            bubble.applyStyles({
                                backgroundColor: 'var(--accent, #007acc)',
                                color: '#fff',
                                borderRadius: '8px 8px 0 8px'
                            });
                        } else if (isAgent) {
                            bubble.applyStyles({
                                backgroundColor: 'var(--bg-panel, #1e1e1e)',
                                color: 'var(--text-main, #ccc)',
                                border: '1px solid var(--border, #3e3e42)',
                                borderRadius: '8px 8px 8px 0'
                            });
                        } else {
                            bubble.applyStyles({
                                alignSelf: 'center',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted, #888)',
                                fontSize: '10px',
                                fontStyle: 'italic'
                            });
                        }

                        bubble.getElement().textContent = msg.content;
                        messageList.appendChildren(bubble);

                        // Render tool calls if present
                        if (msg.toolCalls && msg.toolCalls.length > 0) {
                            for (const tc of msg.toolCalls) {
                                const toolCard = new uiLib.Card({
                                    variant: 'default',
                                    children: [
                                        new uiLib.Row({
                                            gap: 'xs',
                                            children: [
                                                new uiLib.Icon({ icon: 'fas fa-tools', size: 'sm' }),
                                                new uiLib.Text({ text: tc.name, weight: 'bold', size: 'xs' })
                                            ]
                                        }),
                                        new uiLib.Text({ 
                                            text: tc.args.length > 100 ? tc.args.substring(0, 100) + '...' : tc.args,
                                            size: 'xs',
                                            variant: 'muted'
                                        })
                                    ]
                                });
                                
                                if (tc.result) {
                                    toolCard.appendChildren(new uiLib.Text({
                                        text: `→ ${tc.result.length > 100 ? tc.result.substring(0, 100) + '...' : tc.result}`,
                                        size: 'xs'
                                    }));
                                }
                                
                                toolCard.applyStyles({ alignSelf: 'flex-start', width: '90%' });
                                messageList.appendChildren(toolCard);
                            }
                        }
                    }
                    
                    // Scroll to bottom
                    setTimeout(() => {
                        scrollArea.getElement().scrollTop = scrollArea.getElement().scrollHeight;
                    }, 0);
                };

                const sendMessage = async () => {
                    const textarea = textInput.getElement().querySelector('textarea') as HTMLTextAreaElement | null;
                    const text = textarea?.value?.trim();
                    if (!text) return;

                    // Clear input
                    if (textarea) {
                        textarea.value = '';
                        textarea.dispatchEvent(new Event('input')); 
                    }

                    // Add user message
                    messages.push({ role: 'user', content: text, timestamp: Date.now() });
                    renderMessages();

                    // Get context
                    const agentId = (agentSelect as any).getValue?.() || 'qa-analyst';

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
                            }
                        }

                        // Finalize the agent message with tool calls
                        const lastAgent = messages.findLast(m => m.role === 'agent');
                        if (lastAgent) {
                            lastAgent.toolCalls = [...toolCalls];
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

                root.mount(container);
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
