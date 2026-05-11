/**
 * NotificationToast — Animated toast notification system.
 *
 * Renders stacked toast notifications in the bottom-right corner.
 * Supports info, success, warning, error variants with auto-dismiss.
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export type TacticalNotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface TacticalToastProps {
    message: string;
    variant?: TacticalNotificationVariant;
    /** Auto-dismiss after this many milliseconds (0 = manual dismiss) */
    duration?: number;
    /** Action button */
    action?: { label: string; onClick: () => void };
    onDismiss?: () => void;
}

const VARIANT_CONFIG: Record<TacticalNotificationVariant, { icon: string; color: string; bg: string }> = {
    info: { icon: 'fas fa-info-circle', color: '#007acc', bg: 'rgba(0, 122, 204, 0.15)' },
    success: { icon: 'fas fa-check-circle', color: '#4caf50', bg: 'rgba(76, 175, 80, 0.15)' },
    warning: { icon: 'fas fa-exclamation-triangle', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.15)' },
    error: { icon: 'fas fa-times-circle', color: '#f44336', bg: 'rgba(244, 67, 54, 0.15)' },
};

export class TacticalToast extends BaseComponent<TacticalToastProps> {
    private dismissTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: TacticalToastProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            message,
            variant = 'info',
            duration = 5000,
            action,
        } = this.props;

        const config = VARIANT_CONFIG[variant];


        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: config.bg,
            border: `1px solid ${config.color}`,
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            color: Theme.colors.textMain,
            fontSize: '12px',
            fontFamily: Theme.font.family,
            maxWidth: '400px',
            animation: 'toast-slide-in 0.3s ease forwards',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            opacity: '1',
        });

        this.element.innerHTML = '';

        // Icon
        const icon = document.createElement('i');
        icon.className = config.icon;
        icon.style.color = config.color;
        icon.style.fontSize = '16px';
        icon.style.flexShrink = '0';
        this.element.appendChild(icon);

        // Message
        const msg = document.createElement('span');
        msg.textContent = message;
        msg.style.flex = '1';
        this.element.appendChild(msg);

        // Action button
        if (action) {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            Object.assign(btn.style, {
                padding: '2px 8px',
                backgroundColor: config.color,
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
            });
            btn.addEventListener('click', action.onClick);
            this.element.appendChild(btn);
        }

        // Dismiss button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        Object.assign(closeBtn.style, {
            background: 'transparent',
            border: 'none',
            color: Theme.colors.textMuted,
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            lineHeight: '1',
        });
        closeBtn.addEventListener('click', () => this.dismiss());
        this.element.appendChild(closeBtn);

        // Auto-dismiss
        if (duration > 0) {
            this.dismissTimer = setTimeout(() => this.dismiss(), duration);
        }
    }

    public dismiss(): void {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }

        this.applyStyles({
            opacity: '0',
            transform: 'translateX(100%)',
        });

        setTimeout(() => {
            this.element.remove();
            this.props.onDismiss?.();
        }, 300);
    }
}

/**
 * TacticalNotificationContainer — Manages a stack of tactical toast notifications.
 */
export class TacticalNotificationContainer {
    private container: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            bottom: '40px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '8px',
            zIndex: '20000',
            pointerEvents: 'auto',
        });
        document.body.appendChild(this.container);
    }

    public show(props: TacticalToastProps): TacticalToast {
        const toast = new TacticalToast({
            ...props,
            onDismiss: () => {
                props.onDismiss?.();
            }
        });
        this.container.appendChild(toast.getElement());
        return toast;
    }

    public destroy(): void {
        this.container.remove();
    }
}
