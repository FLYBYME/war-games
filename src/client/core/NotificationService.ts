/**
 * NotificationService - Provides interactive toast notifications and status bar messages.
 *
 * Replaces raw `alert()` / `console.log` for user-facing feedback.
 */

import * as ui from '../ui-lib';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface NotificationAction {
    label: string;
    action: () => void | Promise<void>;
    isPrimary?: boolean;
}

export interface NotificationSource {
    id: string;
    label: string;
}

export interface NotificationOptions {
    message: string;
    detail?: string;
    severity?: NotificationSeverity;
    source?: NotificationSource;
    actions?: NotificationAction[];
    timeout?: number;
    progress?: boolean;
}

export interface NotificationHandle {
    close: () => void;
    updateMessage: (newMessage: string) => void;
    updateProgress: (isProgressing: boolean) => void;
}

const SEVERITY_CONFIG: Record<NotificationSeverity, { icon: string; defaultTimeout: number }> = {
    info: { icon: 'fas fa-info-circle', defaultTimeout: 5000 },
    success: { icon: 'fas fa-check-circle', defaultTimeout: 4000 },
    warning: { icon: 'fas fa-exclamation-triangle', defaultTimeout: 6000 },
    error: { icon: 'fas fa-times-circle', defaultTimeout: 8000 },
};

export class NotificationService {
    private statusBar: ui.StatusBar;
    private statusTimeout: ReturnType<typeof setTimeout> | null = null;
    private activeToasts: Set<ui.NotificationToast> = new Set();

    constructor(statusBar: ui.StatusBar) {
        this.statusBar = statusBar;
    }

    /**
     * Show a toast notification.
     * Overloaded to accept a simple string or a full options object.
     */
    public notify(message: string, severity?: NotificationSeverity, timeout?: number): NotificationHandle;
    public notify(options: NotificationOptions): NotificationHandle;
    public notify(arg: string | NotificationOptions, severityOrConfig?: NotificationSeverity, timeoutOrConfig?: number): NotificationHandle {
        let opts: NotificationOptions;

        if (typeof arg === 'string') {
            opts = {
                message: arg,
                severity: severityOrConfig || 'info',
                timeout: timeoutOrConfig
            };
        } else {
            opts = arg;
        }

        return this.createToast(opts);
    }

    /**
     * Display a transient message in the status bar (no toast).
     */
    public setStatusMessage(message: string, timeout: number = 4000): void {
        this.statusBar.setMessage(message);

        if (this.statusTimeout) clearTimeout(this.statusTimeout);

        this.statusTimeout = setTimeout(() => {
            this.statusBar.setMessage('');
            this.statusTimeout = null;
        }, timeout);
    }

    /**
     * Clears all active toast notifications immediately.
     */
    public clearAll(): void {
        this.activeToasts.forEach(toast => toast.destroy());
        this.activeToasts.clear();
    }

    // ── Private ──────────────────────────────────────────────

    private createToast(opts: NotificationOptions): NotificationHandle {
        const severity = opts.severity || 'info';
        const config = SEVERITY_CONFIG[severity];

        const toast = new ui.NotificationToast({
            message: opts.message,
            type: severity,
            duration: opts.timeout ?? config.defaultTimeout,
            detail: opts.detail,
            actions: opts.actions,
            source: opts.source,
            progress: opts.progress,
            onClose: () => {
                this.activeToasts.delete(toast);
            },
            onSourceAction: (e) => {
                if (!opts.source) return;
                const source = opts.source;
                const items: ui.ContextMenuItem[] = [
                    {
                        label: `Manage Extension`,
                        icon: 'fas fa-puzzle-piece',
                        action: () => console.log('Manage extension:', source.id)
                    },
                    {
                        label: `Turn Off Notifications from '${source.label}'`,
                        icon: 'fas fa-bell-slash',
                        action: () => console.log('Disable notifications for:', source.id)
                    }
                ];
                new ui.ContextMenu(items, e.clientX, e.clientY);
            }
        });

        this.activeToasts.add(toast);
        toast.show();

        return {
            close: () => toast.destroy(),
            updateMessage: (newMsg: string) => toast.updateMessage(newMsg),
            updateProgress: (isProgressing: boolean) => toast.updateProgress(isProgressing)
        };
    }
}
