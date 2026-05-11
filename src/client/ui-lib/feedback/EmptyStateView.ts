import { BaseComponent } from '../BaseComponent';
import { Stack } from '../layout/Stack';
import { Heading } from '../typography/Heading';
import { Text } from '../typography/Text';
import { Theme } from '../theme';

export interface EmptyStateProps {
    icon: string; // e.g., 'fas fa-folder-open'
    title: string;
    description?: string;
    action?: BaseComponent<any> | HTMLElement;
}

export class EmptyStateView extends BaseComponent<EmptyStateProps> {
    constructor(props: EmptyStateProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        const { icon, title, description, action } = this.props;

        this.applyStyles({
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });

        const content = new Stack({
            align: 'center',
            justify: 'center',
            gap: 'sm'
        });

        // Large Muted Icon
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        Object.assign(iconEl.style, {
            fontSize: '48px',
            color: Theme.colors.textMuted,
            opacity: '0.3',
            marginBottom: Theme.spacing.md
        });

        content.appendChildren(iconEl);
        content.appendChildren(new Heading({ text: title, level: 3, variant: 'muted' }));

        if (description) {
            content.appendChildren(new Text({
                text: description,
                variant: 'muted',
                size: 'base'
            }));
        }

        if (action) {
            const actionWrapper = document.createElement('div');
            actionWrapper.style.marginTop = Theme.spacing.md;
            if (action instanceof BaseComponent) {
                actionWrapper.appendChild(action.getElement());
            } else {
                actionWrapper.appendChild(action);
            }
            content.appendChildren(actionWrapper);
        }

        this.appendChildren(content);
    }
}