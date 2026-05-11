import * as uiLib from '../../../ui-lib';
import { ChatService } from '../services/ChatService';

export interface PromptEditorViewProps {
    chatService: ChatService;
}

export class PromptEditorView extends uiLib.BaseComponent<PromptEditorViewProps> {
    private promptArea: uiLib.TextArea;
    private saveBtn: uiLib.Button;
    private statusText: uiLib.Text;

    constructor(props: PromptEditorViewProps) {
        super('div', props);
        this.promptArea = new uiLib.TextArea({
            placeholder: 'Enter system instructions...',
            rows: 20
        });
        this.saveBtn = new uiLib.Button({
            label: 'Save Prompt',
            icon: 'fas fa-save',
            variant: 'primary',
            onClick: () => this.handleSave()
        });
        this.statusText = new uiLib.Text({ text: '', size: 'xs', variant: 'muted' });

        this.render();
        this.setupSubscriptions();
    }

    private setupSubscriptions() {
        this.props.chatService.activeAgent.subscribe((agent) => {
            if (agent) {
                this.promptArea.updateProps({ value: agent.systemPrompt });
                this.statusText.updateProps({ text: `Editing ${agent.name} (${agent.model})` });
            }
        });
    }

    private async handleSave() {
        const newPrompt = this.promptArea.getValue();
        this.saveBtn.updateProps({ disabled: true, label: 'Saving...' });
        
        try {
            await this.props.chatService.updateAgentPrompt(newPrompt);
            this.statusText.updateProps({ text: '✅ Prompt updated successfully' });
            setTimeout(() => {
                const agent = this.props.chatService.activeAgent.get();
                if (agent) this.statusText.updateProps({ text: `Editing ${agent.name} (${agent.model})` });
            }, 3000);
        } catch (err) {
            this.statusText.updateProps({ text: `❌ Error: ${err instanceof Error ? err.message : String(err)}` });
        } finally {
            this.saveBtn.updateProps({ disabled: false, label: 'Save Prompt' });
        }
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 'md',
            gap: 'md',
            backgroundColor: 'var(--bg-main, #121212)'
        });

        const header = new uiLib.Row({
            align: 'center',
            justify: 'space-between',
            children: [
                new uiLib.Column({
                    children: [
                        new uiLib.Heading({ text: 'PROMPT ENGINEERING', level: 4 }),
                        this.statusText
                    ]
                }),
                this.saveBtn
            ]
        });

        const scrollArea = new uiLib.ScrollArea({
            fill: true,
            children: [this.promptArea]
        });
        this.promptArea.getElement().style.width = '100%';
        this.promptArea.getElement().style.fontFamily = 'monospace';

        this.appendChildren(header, scrollArea);
    }
}
