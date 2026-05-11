// src/client/ui-lib/data/Tag.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export type TagVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'muted';

export interface TagProps {
    label: string;
    variant?: TagVariant;
    icon?: string;
    onClose?: () => void;
    size?: 'sm' | 'md';
    outline?: boolean;
}

export class Tag extends BaseComponent<TagProps> {
    constructor(props: TagProps) {
        super('span', props);
        this.render();
    }

    public render(): void {
        const { label, variant = 'default', icon, onClose, size = 'sm', outline = false } = this.props;

        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: size === 'sm' ? '1px 8px' : '3px 10px',
            borderRadius: '12px',
            fontSize: size === 'sm' ? '11px' : '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            cursor: 'default',
            userSelect: 'none',
            border: '1px solid transparent'
        });

        // Background and Text colors based on variant
        let bgColor = Theme.colors.bgTertiary;
        let textColor = Theme.colors.textMain;
        let borderColor = 'transparent';

        switch (variant) {
            case 'accent':
                bgColor = outline ? 'transparent' : Theme.colors.accent;
                textColor = outline ? Theme.colors.accent : '#ffffff';
                borderColor = outline ? Theme.colors.accent : 'transparent';
                break;
            case 'success':
                bgColor = outline ? 'transparent' : Theme.colors.success;
                textColor = outline ? Theme.colors.success : '#ffffff';
                borderColor = outline ? Theme.colors.success : 'transparent';
                break;
            case 'warning':
                bgColor = outline ? 'transparent' : Theme.colors.warning;
                textColor = outline ? Theme.colors.warning : '#ffffff';
                borderColor = outline ? Theme.colors.warning : 'transparent';
                break;
            case 'error':
                bgColor = outline ? 'transparent' : Theme.colors.error;
                textColor = outline ? Theme.colors.error : '#ffffff';
                borderColor = outline ? Theme.colors.error : 'transparent';
                break;
            case 'muted':
                bgColor = outline ? 'transparent' : Theme.colors.bgSecondary;
                textColor = Theme.colors.textMuted;
                borderColor = outline ? Theme.colors.border : 'transparent';
                break;
            default:
                bgColor = outline ? 'transparent' : Theme.colors.bgTertiary;
                textColor = Theme.colors.textMain;
                borderColor = outline ? Theme.colors.border : 'transparent';
                break;
        }

        this.element.style.backgroundColor = bgColor;
        this.element.style.color = textColor;
        this.element.style.borderColor = borderColor;

        this.element.innerHTML = '';

        if (icon) {
            const i = document.createElement('i');
            i.className = icon;
            i.style.fontSize = size === 'sm' ? '10px' : '12px';
            i.style.opacity = '0.8';
            this.element.appendChild(i);
        }

        const span = document.createElement('span');
        span.textContent = label;
        this.element.appendChild(span);

        if (onClose) {
            const closeBtn = document.createElement('i');
            closeBtn.className = 'fas fa-times';
            closeBtn.style.marginLeft = '4px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.opacity = '0.6';
            closeBtn.style.fontSize = '10px';
            closeBtn.onmouseenter = () => closeBtn.style.opacity = '1';
            closeBtn.onmouseleave = () => closeBtn.style.opacity = '0.6';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                onClose();
            };
            this.element.appendChild(closeBtn);
        }
    }
}
