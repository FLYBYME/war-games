// src/client/ui-lib/data/Avatar.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface AvatarProps {
    src?: string;
    initials?: string;
    size?: number;
    shape?: 'circle' | 'square';
    status?: 'online' | 'offline' | 'away' | 'busy';
    alt?: string;
}

export class Avatar extends BaseComponent<AvatarProps> {
    constructor(props: AvatarProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { src, initials, size = 32, shape = 'circle', status, alt } = this.props;

        this.applyStyles({
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: shape === 'circle' ? '50%' : '4px',
            backgroundColor: Theme.colors.bgTertiary,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            userSelect: 'none',
            flexShrink: '0',
            fontSize: `${size * 0.4}px`,
            fontWeight: '600',
            color: Theme.colors.textMain,
            overflow: 'visible'
        });

        this.element.innerHTML = '';

        if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = alt || '';
            Object.assign(img.style, {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'inherit'
            });
            this.element.appendChild(img);
        } else if (initials) {
            this.element.textContent = initials.toUpperCase().substring(0, 2);
        } else {
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            this.element.appendChild(icon);
        }

        if (status) {
            const dot = document.createElement('div');
            let statusColor = '#858585';
            switch (status) {
                case 'online': statusColor = '#4caf50'; break;
                case 'away': statusColor = '#ff9800'; break;
                case 'busy': statusColor = '#f44336'; break;
            }

            Object.assign(dot.style, {
                width: `${Math.max(6, size * 0.25)}px`,
                height: `${Math.max(6, size * 0.25)}px`,
                backgroundColor: statusColor,
                borderRadius: '50%',
                position: 'absolute',
                bottom: '0',
                right: '0',
                border: `2px solid ${Theme.colors.bgSecondary}`,
                boxSizing: 'content-box'
            });
            this.element.appendChild(dot);
        }
    }
}
