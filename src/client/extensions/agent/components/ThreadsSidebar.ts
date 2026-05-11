import * as uiLib from '../../../ui-lib';
import { ChatService, Thread } from '../services/ChatService';

export interface ThreadsSidebarProps {
    chatService: ChatService;
}

export class ThreadsSidebar extends uiLib.BaseComponent<ThreadsSidebarProps> {
    private threadList: uiLib.Column;

    constructor(props: ThreadsSidebarProps) {
        super('div', props);
        this.threadList = new uiLib.Column({ gap: 'xs', padding: 'xs' });
        this.render();
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        this.props.chatService.threads.subscribe(() => this.updateThreadList());
        this.props.chatService.currentThreadId.subscribe(() => this.updateThreadList());
    }

    private updateThreadList() {
        this.threadList.getElement().innerHTML = '';
        const threads = this.props.chatService.threads.get();
        const currentId = this.props.chatService.currentThreadId.get();

        for (const thread of threads) {
            const isActive = thread.id === currentId;
            
            const item = new uiLib.Row({
                padding: 'xs',
                gap: 'xs',
                align: 'center',
                onClick: () => this.props.chatService.setThread(thread.id)
            });

            item.applyStyles({
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: isActive ? 'var(--bg-panel-hover, #2d2d2d)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent, #007acc)' : '3px solid transparent',
                transition: 'background-color 0.2s'
            });

            const title = new uiLib.Text({ 
                text: thread.name, 
                size: 'xs',
                weight: isActive ? 'bold' : 'normal'
            });
            title.getElement().style.flex = '1';
            title.getElement().style.whiteSpace = 'nowrap';
            title.getElement().style.overflow = 'hidden';
            title.getElement().style.textOverflow = 'ellipsis';

            const deleteBtn = new uiLib.Button({
                icon: 'fas fa-trash',
                variant: 'ghost',
                size: 'sm',
                onClick: (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete thread "${thread.name}"?`)) {
                        void this.props.chatService.deleteThread(thread.id);
                    }
                }
            });

            item.appendChildren(title, deleteBtn);
            this.threadList.appendChildren(item);
        }
    }

    public render(): void {
        this.applyStyles({
            width: '200px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-panel, #1e1e1e)',
            borderRight: '1px solid var(--border, #3e3e42)'
        });

        const header = new uiLib.Row({
            padding: 'sm',
            align: 'center',
            justify: 'space-between',
            children: [
                new uiLib.Heading({ text: 'THREADS', level: 6 }),
                new uiLib.Button({
                    icon: 'fas fa-plus',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => {
                        const name = prompt('Thread Name:', 'New Chat');
                        if (name) void this.props.chatService.createNewThread(name);
                    }
                })
            ]
        });


        const scrollArea = new uiLib.ScrollArea({
            fill: true,
            children: [this.threadList]
        });

        this.appendChildren(header, scrollArea);
    }
}
