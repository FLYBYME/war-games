import { Modal, ModalProps } from './Modal';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';
import { TextInput } from '../forms/TextInput';
import { Button } from '../forms/Button';

export interface PromptDialogOptions {
    title?: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    password?: boolean;
    okLabel?: string;
    cancelLabel?: string;
}

export class PromptDialog extends Modal {

    constructor(options: PromptDialogOptions, resolve: (value: string | null) => void) {
        let currentValue = options.defaultValue || '';
        const input = new TextInput({
            placeholder: options.placeholder,
            value: currentValue,
            type: options.password ? 'password' : 'text',
            onChange: (val) => { currentValue = val; }
        });

        const body = new Stack({
            gap: 'md',
            children: [
                new Text({ text: options.message }),
                input
            ]
        });

        super({
            title: options.title || 'Input',
            children: [body],
            footer: [
                new Button({
                    label: options.cancelLabel || 'Cancel',
                    variant: 'secondary',
                    onClick: () => {
                        resolve(null);
                        this.hide();
                    }
                }),
                new Button({
                    label: options.okLabel || 'OK',
                    variant: 'primary',
                    onClick: () => {
                        resolve(currentValue);
                        this.hide();
                    }
                })
            ],
            onClose: () => resolve(null)
        } as ModalProps);

        // Focus input after show
        setTimeout(() => {
            const el = input.getElement().querySelector('input');
            if (el) el.focus();
        }, 50);
    }

    public static show(options: PromptDialogOptions): Promise<string | null> {
        return new Promise((resolve) => {
            const dialog = new PromptDialog(options, resolve);
            dialog.show();
        });
    }
}
