import { Modal, ModalProps } from './Modal';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';
import { Button } from '../forms/Button';

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    detail?: string;
    primaryLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export class ConfirmDialog extends Modal {
    constructor(options: ConfirmDialogOptions, resolve: (value: boolean) => void) {
        const body = new Stack({ gap: 'sm', padding: 'none' });
        body.appendChildren(new Text({ text: options.message }));

        if (options.detail) {
            body.appendChildren(new Text({ text: options.detail, variant: 'muted', size: 'sm' }));
        }

        super({
            title: options.title || 'Confirm',
            children: [body],
            width: '400px',
            footer: [
                new Button({
                    label: options.cancelLabel || 'Cancel',
                    variant: 'secondary',
                    onClick: () => {
                        resolve(false);
                        this.hide();
                    }
                }),
                new Button({
                    label: options.primaryLabel || 'OK',
                    variant: options.isDestructive ? 'danger' : 'primary',
                    onClick: () => {
                        resolve(true);
                        this.hide();
                    }
                })
            ],
            onClose: () => resolve(false)
        } as ModalProps);
    }

    public static show(options: ConfirmDialogOptions): Promise<boolean> {
        return new Promise((resolve) => {
            const dialog = new ConfirmDialog(options, resolve);
            dialog.show();
        });
    }
}
