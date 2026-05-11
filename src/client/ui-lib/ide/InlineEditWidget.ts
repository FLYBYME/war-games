// ui-lib/ide/InlineEditWidget.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { TextInput } from '../forms/TextInput';
import { Button } from '../forms/Button';
import { Stack } from '../layout/Stack';
import { Row } from '../layout/Row';
import { Text } from '../typography/Text';

export interface InlineEditWidgetProps {
    lineNumber: number;
    onSubmit: (prompt: string) => Promise<void>;
    onCancel: () => void;
    placeholder?: string;
}

export class InlineEditWidget extends BaseComponent<InlineEditWidgetProps> {
    private input: TextInput;
    private generateBtn: Button;
    private isLoading: boolean = false;

    constructor(props: InlineEditWidgetProps) {
        super('div', props);
        this.input = new TextInput({
            placeholder: props.placeholder || 'Ask AI to edit code...',
            fullWidth: true
        });
        this.generateBtn = new Button({
            label: 'Generate',
            variant: 'primary',
            size: 'sm',
            onClick: () => this.handleSubmit()
        });
        this.render();

        // Auto-focus the input
        requestAnimationFrame(() => {
            this.input.focus();
        });
    }

    public render(): void {
        this.applyStyles({
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.accent}`,
            borderRadius: Theme.radius,
            padding: Theme.spacing.md,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            margin: `${Theme.spacing.xs} 0`
        });

        this.element.innerHTML = '';

        // Prevent Monaco from stealing keyboard events
        const stopProp = (e: KeyboardEvent) => e.stopPropagation();
        this.element.addEventListener('keydown', stopProp);
        this.element.addEventListener('keypress', stopProp);
        this.element.addEventListener('keyup', stopProp);

        const container = new Stack({ gap: 'md' });

        // Row with icon and input
        const inputRow = new Row({ gap: 'sm', align: 'center' });
        const icon = document.createElement('i');
        icon.className = 'fas fa-wand-magic-sparkles';
        icon.style.color = Theme.colors.accent;
        icon.style.fontSize = '14px';

        inputRow.getElement().appendChild(icon);
        inputRow.getElement().appendChild(this.input.getElement());

        // Actions row
        const actionsRow = new Row({ gap: 'sm', align: 'center', justify: 'space-between' });

        const hint = new Text({
            text: 'Enter to generate • Esc to cancel',
            variant: 'muted',
            size: 'xs'
        });

        const buttons = new Row({ gap: 'sm' });
        const cancelBtn = new Button({
            label: 'Cancel',
            variant: 'secondary',
            size: 'sm',
            onClick: () => this.props.onCancel()
        });

        buttons.getElement().appendChild(cancelBtn.getElement());
        buttons.getElement().appendChild(this.generateBtn.getElement());

        actionsRow.getElement().appendChild(hint.getElement());
        actionsRow.getElement().appendChild(buttons.getElement());

        container.getElement().appendChild(inputRow.getElement());
        container.getElement().appendChild(actionsRow.getElement());

        this.element.appendChild(container.getElement());

        // Add Enter and Esc listeners to the input
        this.input.getElement().addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.handleSubmit();
            } else if (e.key === 'Escape') {
                this.props.onCancel();
            }
        });
    }

    private async handleSubmit(): Promise<void> {
        const prompt = this.input.getValue().trim();
        if (!prompt || this.isLoading) return;

        this.setLoading(true);
        try {
            await this.props.onSubmit(prompt);
        } catch (err) {
            console.error('InlineEditWidget: Error submitting', err);
        } finally {
            this.setLoading(false);
        }
    }

    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        this.input.setDisabled(loading);
        this.generateBtn.updateProps({
            loading: loading,
            label: loading ? 'Generating...' : 'Generate'
        });
    }
}
