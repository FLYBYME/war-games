import { Extension, ExtensionContext } from '../../core/extensions/Extension';
import { ViewProvider } from '../../core/extensions/ViewProvider';
import { ChatService } from './services/ChatService';
import { AgentChatView } from './components/AgentChatView';
import { PromptEditorView } from './components/PromptEditorView';

export const AgentExtension: Extension = {
    id: 'wargames.agent',
    name: 'AI Agent',
    version: '2.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();
        
        const chatService = new ChatService(client);

        const chatProvider: ViewProvider = {
            id: 'agent.chat',
            name: 'AI Agent Chat',
            resolveView: (container, _disposables) => {
                const view = new AgentChatView({ chatService });
                view.mount(container);
            }
        };

        const editorProvider: ViewProvider = {
            id: 'agent.editor',
            name: 'Prompt Editor',
            resolveView: (container, _disposables) => {
                const view = new PromptEditorView({ chatService });
                view.mount(container);
            }
        };

        ide.views.registerProvider('bottom-panel', chatProvider);
        ide.views.registerProvider('bottom-panel', editorProvider);

        ide.activityBar.registerItem({
            id: 'agent.chat',
            location: 'bottom-panel',
            icon: 'fas fa-robot',
            title: 'AI Agent Chat',
            order: 30
        });

        ide.activityBar.registerItem({
            id: 'agent.editor',
            location: 'bottom-panel',
            icon: 'fas fa-terminal',
            title: 'Prompt Editor',
            order: 31
        });

        ide.commands.register({
            id: 'agent.openChat',
            label: 'Open AI Agent Chat',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'agent.chat');
            }
        });

        ide.commands.register({
            id: 'agent.openEditor',
            label: 'Open Prompt Editor',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'agent.editor');
            }
        });

        console.log('✅ AgentExtension V2 activated');
    }
};

