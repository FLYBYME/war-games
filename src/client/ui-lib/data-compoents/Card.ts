// src/client/ui-lib/data/Card.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface CardProps {
    title?: string;
    subtitle?: string;
    headerIcon?: string;
    children?: (BaseComponent<any> | HTMLElement)[];
    footer?: (BaseComponent<any> | HTMLElement)[];
    variant?: 'default' | 'elevated' | 'ghost';
    padding?: string;
    width?: string;
}

export class Card extends BaseComponent<CardProps> {
    constructor(props: CardProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { title, subtitle, headerIcon, children, footer, variant = 'default', padding = 'md', width } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: variant === 'ghost' ? 'transparent' : Theme.colors.bgSecondary,
            border: variant === 'elevated' ? 'none' : `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            boxShadow: variant === 'elevated' ? '0 8px 24px rgba(0, 0, 0, 0.2)' : 'none',
            overflow: 'hidden',
            width: width || 'auto',
            fontFamily: Theme.font.family,
            transition: 'all 0.2s ease',
            margin: '0' // Removed fixed margin
        });

        this.element.innerHTML = '';

        // Header
        if (title || subtitle || headerIcon) {
            const header = document.createElement('div');
            Object.assign(header.style, {
                padding: '12px 16px',
                borderBottom: `1px solid ${Theme.colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
            });

            if (title) {
                const titleEl = document.createElement('div');
                Object.assign(titleEl.style, {
                    fontSize: '11px',
                    fontWeight: '800',
                    color: Theme.colors.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em'
                });

                if (headerIcon) {
                    const icon = document.createElement('i');
                    icon.className = headerIcon;
                    titleEl.appendChild(icon);
                }

                const text = document.createElement('span');
                text.textContent = title;
                titleEl.appendChild(text);
                header.appendChild(titleEl);
            }

            if (subtitle) {
                const subEl = document.createElement('div');
                Object.assign(subEl.style, {
                    fontSize: '14px',
                    color: Theme.colors.textMain,
                    fontWeight: '600',
                    marginTop: '2px'
                });
                subEl.textContent = subtitle;
                header.appendChild(subEl);
            }

            this.element.appendChild(header);
        }

        // Body
        const body = document.createElement('div');
        const pVal = (Theme.spacing as any)[padding] || padding;
        Object.assign(body.style, {
            padding: pVal,
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.sm
        });

        if (children) {
            children.forEach(child => {
                if (!child) return;
                if (typeof (child as any).getElement === 'function') {
                    body.appendChild((child as any).getElement());
                } else if (child instanceof HTMLElement || child instanceof Node) {
                    body.appendChild(child);
                }
            });
        }
        this.element.appendChild(body);

        // Footer
        if (footer && footer.length > 0) {
            const footerEl = document.createElement('div');
            Object.assign(footerEl.style, {
                padding: '8px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                borderTop: `1px solid ${Theme.colors.border}`,
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                alignItems: 'center'
            });

            footer.forEach(child => {
                if (!child) return;
                if (typeof (child as any).getElement === 'function') {
                    footerEl.appendChild((child as any).getElement());
                } else if (child instanceof HTMLElement || child instanceof Node) {
                    footerEl.appendChild(child);
                }
            });
            this.element.appendChild(footerEl);
        }
    }
}
