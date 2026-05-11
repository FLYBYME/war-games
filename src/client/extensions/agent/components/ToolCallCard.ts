import * as uiLib from '../../../ui-lib';

export interface ToolCallProps {
    name: string;
    args: string;
    result?: string;
}

export class ToolCallCard extends uiLib.BaseComponent<ToolCallProps> {
    constructor(props: ToolCallProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { name, args, result } = this.props;

        this.applyStyles({
            width: '90%',
            alignSelf: 'flex-start',
            margin: '4px 0',
            opacity: result ? '1' : '0.7'
        });

        const card = new uiLib.Card({
            variant: 'default',
            children: [
                new uiLib.Row({
                    gap: 'xs',
                    align: 'center',
                    children: [
                        new uiLib.Icon({ icon: 'fas fa-tools', size: 'sm' }),
                        new uiLib.Text({ text: name.toUpperCase(), weight: 'bold', size: 'xs', variant: 'muted' }),
                        result ? new uiLib.Icon({ icon: 'fas fa-check-circle', size: 'sm', color: 'var(--success)' }) : new uiLib.Spinner({ size: 'sm' })
                    ]
                }),
                new uiLib.Text({ 
                    text: args,
                    size: 'xs',
                    variant: 'muted'
                })
            ]
        });

        if (result) {
            card.appendChildren(new uiLib.Text({
                text: `→ ${result}`,
                size: 'xs',
                variant: 'accent'
            }));
        }

        this.appendChildren(card);
    }
}
