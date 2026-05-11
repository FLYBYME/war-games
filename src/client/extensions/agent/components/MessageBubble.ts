import * as uiLib from '../../../ui-lib';
import { ChatMessage } from '../services/ChatService';

export interface MessageBubbleProps {
    message: ChatMessage;
}

export class MessageBubble extends uiLib.BaseComponent<MessageBubbleProps> {
    constructor(props: MessageBubbleProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { message } = this.props;
        const isUser = message.role === 'user';
        const isAssistant = message.role === 'assistant';

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxWidth: '85%',
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            padding: '8px 12px',
            borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
            backgroundColor: isUser ? 'var(--accent, #007acc)' : 'var(--bg-panel, #1e1e1e)',
            color: isUser ? '#fff' : 'var(--text-main, #ccc)',
            border: isUser ? 'none' : '1px solid var(--border, #3e3e42)',
            fontSize: '13px',
            lineHeight: '1.4'
        });

        this.element.textContent = message.content;

        if (message.role === 'system') {
            this.applyStyles({
                alignSelf: 'center',
                backgroundColor: 'transparent',
                color: 'var(--text-muted, #888)',
                fontSize: '11px',
                fontStyle: 'italic',
                border: 'none',
                padding: '4px'
            });
        }
    }
}
