// ui-lib/ide/NotificationToast.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface NotificationAction {
    label: string;
    action: () => void | Promise<void>;
    isPrimary?: boolean;
}

export interface NotificationToastProps {
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    detail?: string;
    actions?: NotificationAction[];
    source?: { id: string; label: string };
    progress?: boolean;
    onClose?: () => void;
    onSourceAction?: (e: MouseEvent) => void;
}

export class NotificationToast extends BaseComponent<NotificationToastProps> {
    private messageElement!: HTMLElement;
    private progressElement: HTMLElement | null = null;
    private expandedArea: HTMLElement | null = null;
    private chevron: HTMLElement | null = null;

    constructor(props: NotificationToastProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { message, type = 'info', detail, actions, source, progress } = this.props;

        let iconClass = 'fa-info-circle';
        let color = Theme.colors.accent;

        if (type === 'success') {
            iconClass = 'fa-check-circle';
            color = Theme.colors.success;
        } else if (type === 'warning') {
            iconClass = 'fa-exclamation-triangle';
            color = Theme.colors.warning;
        } else if (type === 'error') {
            iconClass = 'fa-times-circle';
            color = Theme.colors.error;
        }

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.xs,
            padding: Theme.spacing.md,
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: Theme.radius,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            color: Theme.colors.textMain,
            minWidth: '320px',
            maxWidth: '450px',
            pointerEvents: 'auto',
            marginBottom: Theme.spacing.sm,
            animation: 'slideIn 0.3s ease-out',
            overflow: 'hidden'
        });

        // -- Main Row --
        const mainRow = document.createElement('div');
        Object.assign(mainRow.style, {
            display: 'flex',
            alignItems: 'flex-start',
            gap: Theme.spacing.md,
            width: '100%'
        });

        const icon = document.createElement('i');
        icon.className = `fas ${iconClass}`;
        icon.style.color = color;
        icon.style.marginTop = '2px';

        this.messageElement = document.createElement('div');
        this.messageElement.textContent = message;
        this.messageElement.style.flex = '1';
        this.messageElement.style.fontSize = Theme.font.sizeBase;
        this.messageElement.style.lineHeight = '1.4';

        const controls = document.createElement('div');
        Object.assign(controls.style, {
            display: 'flex',
            alignItems: 'center',
            gap: Theme.spacing.sm,
            marginLeft: Theme.spacing.sm
        });

        const hasExpandedArea = !!detail || (actions && actions.length > 0);

        if (source && this.props.onSourceAction) {
            const gear = document.createElement('i');
            gear.className = 'fas fa-cog';
            Object.assign(gear.style, {
                cursor: 'pointer',
                opacity: '0.5',
                fontSize: '12px',
                padding: '2px'
            });
            gear.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.props.onSourceAction!(e);
            };
            controls.appendChild(gear);
        }

        if (hasExpandedArea) {
            this.chevron = document.createElement('i');
            this.chevron.className = 'fas fa-chevron-down';
            Object.assign(this.chevron.style, {
                cursor: 'pointer',
                opacity: '0.5',
                fontSize: '12px',
                padding: '2px'
            });
            this.chevron.onclick = () => this.toggleExpand();
            controls.appendChild(this.chevron);
        }

        const close = document.createElement('i');
        close.className = 'fas fa-times';
        Object.assign(close.style, {
            cursor: 'pointer',
            opacity: '0.5',
            fontSize: '12px',
            padding: '2px'
        });
        close.onclick = () => this.destroy();
        controls.appendChild(close);

        mainRow.appendChild(icon);
        mainRow.appendChild(this.messageElement);
        mainRow.appendChild(controls);

        this.element.appendChild(mainRow);

        // -- Expanded Area --
        if (hasExpandedArea) {
            this.expandedArea = document.createElement('div');
            Object.assign(this.expandedArea.style, {
                display: 'none',
                marginTop: Theme.spacing.sm,
                paddingLeft: '32px', // icon width + gap
                width: '100%'
            });

            if (detail) {
                const detailText = document.createElement('div');
                detailText.textContent = detail;
                detailText.style.fontSize = '12px';
                detailText.style.opacity = '0.8';
                detailText.style.marginBottom = Theme.spacing.sm;
                detailText.style.whiteSpace = 'pre-wrap';
                this.expandedArea.appendChild(detailText);
            }

            if (actions && actions.length > 0) {
                const actionsRow = document.createElement('div');
                Object.assign(actionsRow.style, {
                    display: 'flex',
                    gap: Theme.spacing.sm,
                    marginTop: Theme.spacing.xs
                });

                actions.forEach(act => {
                    const btn = document.createElement('button');
                    btn.textContent = act.label;
                    Object.assign(btn.style, {
                        padding: '4px 12px',
                        fontSize: '12px',
                        borderRadius: Theme.radius,
                        cursor: 'pointer',
                        border: act.isPrimary ? 'none' : `1px solid ${Theme.colors.border}`,
                        backgroundColor: act.isPrimary ? Theme.colors.accent : 'transparent',
                        color: act.isPrimary ? '#ffffff' : Theme.colors.textMain
                    });
                    btn.onclick = async () => {
                        await Promise.resolve(act.action());
                        this.destroy();
                    };
                    actionsRow.appendChild(btn);
                });
                this.expandedArea.appendChild(actionsRow);
            }

            this.element.appendChild(this.expandedArea);
        }

        // -- Footer (Source & Progress) --
        if (source || progress) {
            const footer = document.createElement('div');
            Object.assign(footer.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: Theme.spacing.xs,
                marginTop: Theme.spacing.xs,
                paddingLeft: '32px',
                width: '100%'
            });

            if (source) {
                const sourceInfo = document.createElement('div');
                sourceInfo.textContent = `Source: ${source.label}`;
                sourceInfo.style.fontSize = '10px';
                sourceInfo.style.opacity = '0.5';
                footer.appendChild(sourceInfo);
            }

            if (progress) {
                this.progressElement = document.createElement('div');
                Object.assign(this.progressElement.style, {
                    height: '2px',
                    backgroundColor: Theme.colors.accent,
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden'
                });

                const inner = document.createElement('div');
                Object.assign(inner.style, {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    height: '100%',
                    width: '30%',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    animation: 'progressIndeterminate 1.5s infinite linear'
                });
                this.progressElement.appendChild(inner);
                footer.appendChild(this.progressElement);

                // Add progress animation if not present
                if (!document.getElementById('ui-lib-progress-anim')) {
                    const style = document.createElement('style');
                    style.id = 'ui-lib-progress-anim';
                    style.textContent = `
                        @keyframes progressIndeterminate {
                            0% { left: -30%; }
                            100% { left: 100%; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }

            this.element.appendChild(footer);
        }
    }

    private toggleExpand(): void {
        if (!this.expandedArea || !this.chevron) return;
        const isHidden = this.expandedArea.style.display === 'none';
        this.expandedArea.style.display = isHidden ? 'block' : 'none';
        this.chevron.className = `fas fa-chevron-${isHidden ? 'up' : 'down'}`;
    }

    public updateMessage(message: string): void {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    public updateProgress(active: boolean): void {
        if (this.progressElement) {
            this.progressElement.style.display = active ? 'block' : 'none';
        }
    }

    public show(): void {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '30px',
                right: '20px',
                zIndex: '10000',
                display: 'flex',
                flexDirection: 'column-reverse',
                pointerEvents: 'none'
            });
            document.body.appendChild(container);

            // Add slideIn animation if not present
            if (!document.getElementById('ui-lib-animations')) {
                const style = document.createElement('style');
                style.id = 'ui-lib-animations';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        container.appendChild(this.element);

        // Hover pause logic
        let timeoutId: any = null;
        let isPaused = false;
        const duration = this.props.duration !== undefined ? this.props.duration : 5000;

        const startTimer = () => {
            if (duration > 0 && !isPaused) {
                timeoutId = setTimeout(() => this.destroy(), duration);
            }
        };

        const stopTimer = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        this.element.onmouseenter = () => {
            isPaused = true;
            stopTimer();
        };

        this.element.onmouseleave = () => {
            isPaused = false;
            startTimer();
        };

        startTimer();
    }

    public destroy(): void {
        this.element.style.transition = 'opacity 0.3s, transform 0.3s';
        this.element.style.opacity = '0';
        this.element.style.transform = 'translateX(20px)';
        setTimeout(() => {
            super.destroy();
            if (this.props.onClose) this.props.onClose();
        }, 300);
    }
}
