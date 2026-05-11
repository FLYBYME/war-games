import * as uiLib from '../../../ui-lib';
import { ChatService, ChatMessage } from '../services/ChatService';
import { MessageBubble } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { ThreadsSidebar } from './ThreadsSidebar';

export interface AgentChatViewProps {
    chatService: ChatService;
}

export class AgentChatView extends uiLib.BaseComponent<AgentChatViewProps> {
    private messageList: uiLib.Column;
    private scrollArea: uiLib.ScrollArea;
    private textInput: uiLib.TextArea;
    private sendBtn: uiLib.Button;
    private agentSelect: uiLib.Select;
    private sidebar: ThreadsSidebar;

    constructor(props: AgentChatViewProps) {
        super('div', props);
        this.messageList = new uiLib.Column({ gap: 'md', padding: 'md' });
        this.scrollArea = new uiLib.ScrollArea({ fill: true, children: [this.messageList] });
        this.textInput = new uiLib.TextArea({ placeholder: 'Message agent...', rows: 1 });
        this.sendBtn = new uiLib.Button({ 
            label: 'Send', 
            variant: 'primary', 
            size: 'sm',
            onClick: () => this.handleSend()
        });
        this.agentSelect = new uiLib.Select({
            options: [],
            placeholder: 'Select Agent...',
            onChange: (val) => this.props.chatService.selectAgent(val)
        });
        this.sidebar = new ThreadsSidebar({ chatService: props.chatService });

        this.render();
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        this.props.chatService.messages.subscribe(() => this.updateMessages());
        this.props.chatService.isTyping.subscribe((typing: boolean) => {
            this.sendBtn.updateProps({ disabled: typing, label: typing ? '...' : 'Send' });
        });
        this.props.chatService.agents.subscribe((agents) => {
            const options = agents.map(a => ({ label: a.name, value: a.id }));
            this.agentSelect.updateProps({ options });
            
            // Set initial value if none selected
            if (!this.agentSelect.props.value && options.length > 0) {
                this.agentSelect.updateProps({ value: options[0].value });
                void this.props.chatService.selectAgent(options[0].value);
            }
        });
        this.props.chatService.currentAgentId.subscribe((id) => {
            if (id) this.agentSelect.updateProps({ value: id });
        });
    }

    private handleSend() {
        const text = this.textInput.getValue();
        if (!text) return;
        this.textInput.updateProps({ value: '' });
        void this.props.chatService.sendMessage(text);
    }

    private updateMessages() {
        this.messageList.getElement().innerHTML = '';
        const messages = this.props.chatService.messages.get();

        for (const msg of messages) {
            this.messageList.appendChildren(new MessageBubble({ message: msg }));
            
            if (msg.toolCalls) {
                for (const tc of msg.toolCalls) {
                    this.messageList.appendChildren(new ToolCallCard({ ...tc }));
                }
            }
        }

        // Auto-scroll
        setTimeout(() => {
            this.scrollArea.getElement().scrollTop = this.scrollArea.getElement().scrollHeight;
        }, 10);
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            flexDirection: 'row',
            height: '100%',
            width: '100%',
            backgroundColor: 'var(--bg-main)'
        });

        const chatBody = new uiLib.Column({ fill: true });

        const header = new uiLib.Row({
            padding: 'sm',
            gap: 'md',
            align: 'center',
            children: [
                new uiLib.Heading({ text: 'AGENT CONTEXT', level: 5 }),
                this.agentSelect
            ]
        });
        header.getElement().style.borderBottom = '1px solid var(--border)';

        const footer = new uiLib.Row({
            padding: 'sm',
            gap: 'sm',
            align: 'flex-end',
            children: [
                this.textInput,
                this.sendBtn
            ]
        });
        footer.getElement().style.borderTop = '1px solid var(--border)';
        this.textInput.getElement().style.flex = '1';

        chatBody.appendChildren(header, this.scrollArea, footer);

        this.appendChildren(this.sidebar, chatBody);
    }
}

