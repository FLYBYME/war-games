// src/client/ui-lib/feedback/Alert.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface AlertProps {
    message: string;
    title?: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
    closable?: boolean;
    onClose?: () => void;
    icon?: string;
}

export class Alert extends BaseComponent<AlertProps> {
    constructor(props: AlertProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { message, title, variant = 'info', closable, onClose, icon } = this.props;

        let bgColor = Theme.colors.bgTertiary;
        let borderColor = Theme.colors.info;
        let iconName = icon || 'fas fa-info-circle';

        switch (variant) {
            case 'success':
                borderColor = Theme.colors.success;
                iconName = icon || 'fas fa-check-circle';
                break;
            case 'warning':
                borderColor = Theme.colors.warning;
                iconName = icon || 'fas fa-exclamation-triangle';
                break;
            case 'error':
                borderColor = Theme.colors.error;
                iconName = icon || 'fas fa-exclamation-circle';
                break;
        }

        this.applyStyles({
            padding: '12px 16px',
            borderRadius: Theme.radius,
            backgroundColor: Theme.colors.bgSecondary,
            borderLeft: `4px solid ${borderColor}`,
            display: 'flex',
            gap: '12px',
            position: 'relative',
            marginBottom: '12px',
            fontFamily: Theme.font.family
        });

        this.element.innerHTML = '';

        const iconEl = document.createElement('i');
        iconEl.className = iconName;
        Object.assign(iconEl.style, {
            color: borderColor,
            fontSize: '16px',
            marginTop: '2px'
        });
        this.element.appendChild(iconEl);

        const content = document.createElement('div');
        Object.assign(content.style, {
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        });

        if (title) {
            const titleEl = document.createElement('div');
            Object.assign(titleEl.style, {
                fontWeight: '600',
                fontSize: '13px',
                color: Theme.colors.textMain
            });
            titleEl.textContent = title;
            content.appendChild(titleEl);
        }

        const msgEl = document.createElement('div');
        Object.assign(msgEl.style, {
            fontSize: '12px',
            color: Theme.colors.textMain,
            lineHeight: '1.4'
        });
        msgEl.textContent = message;
        content.appendChild(msgEl);

        this.element.appendChild(content);

        if (closable) {
            const close = document.createElement('i');
            close.className = 'fas fa-times';
            Object.assign(close.style, {
                cursor: 'pointer',
                opacity: '0.6',
                fontSize: '12px'
            });
            close.onclick = () => {
                this.destroy();
                if (onClose) onClose();
            };
            this.element.appendChild(close);
        }
    }
}
