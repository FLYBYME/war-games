import { Modal, ModalProps } from './Modal';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';
import { Button } from '../forms/Button';
import { TextInput } from '../forms/TextInput';
import { TextArea } from '../forms/TextArea';
import { Checkbox } from '../forms/Checkbox';
import { Select } from '../forms/Select';
import { BaseComponent } from '../BaseComponent';

export interface FormField {
    id: string;
    label: string;
    type?: 'text' | 'password' | 'checkbox' | 'select' | 'email' | 'textarea';
    defaultValue?: any;
    value?: any;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    disabled?: boolean;
}

export interface FormDialogOptions {
    title?: string;
    message?: string;
    okLabel?: string;
    cancelLabel?: string;
    fields: FormField[];
    validateForm?: (values: Record<string, any>) => string | null | Promise<string | null>;
}

export class FormDialog extends Modal {
    constructor(options: FormDialogOptions, resolve: (value: Record<string, any> | null) => void) {
        const values: Record<string, any> = {};
        const formStack = new Stack({ gap: 'md' });
        const errorText = new Text({ text: '', variant: 'error', size: 'sm' });
        errorText.getElement().style.display = 'none';

        if (options.message) {
            formStack.appendChildren(new Text({ text: options.message, variant: 'muted' }));
        }
        formStack.appendChildren(errorText);

        options.fields.forEach(field => {
            let control: BaseComponent<any>;
            values[field.id] = field.value ?? field.defaultValue ?? '';

            if (field.type === 'checkbox') {
                control = new Checkbox({
                    label: field.label,
                    checked: !!values[field.id],
                    disabled: field.disabled,
                    onChange: (val) => values[field.id] = val
                });
            } else if (field.type === 'select') {
                control = new Select({
                    options: field.options || [],
                    value: values[field.id],
                    disabled: field.disabled,
                    onChange: (val) => values[field.id] = val
                });
            } else if (field.type === 'textarea') {
                control = new TextArea({
                    placeholder: field.placeholder,
                    value: values[field.id],
                    disabled: field.disabled,
                    onChange: (val) => values[field.id] = val
                });
            } else {
                control = new TextInput({
                    type: field.type === 'password' ? 'password' : (field.type === 'email' ? 'email' : 'text'),
                    placeholder: field.placeholder,
                    value: values[field.id],
                    disabled: field.disabled,
                    onChange: (val) => values[field.id] = val
                });
            }

            const fieldRow = new Stack({ gap: 'xs' });
            if (field.type !== 'checkbox') {
                fieldRow.appendChildren(new Text({ text: field.label, weight: 'bold', size: 'sm' }));
            }
            fieldRow.appendChildren(control);
            formStack.appendChildren(fieldRow);
        });

        super({
            title: options.title || 'Form',
            children: [formStack],
            footer: [
                new Button({
                    label: options.cancelLabel || 'Cancel',
                    variant: 'secondary',
                    onClick: () => { resolve(null); this.hide(); }
                }),
                new Button({
                    label: options.okLabel || 'Submit',
                    variant: 'primary',
                    onClick: async () => {
                        if (options.validateForm) {
                            const error = await options.validateForm(values);
                            if (error) {
                                errorText.updateProps({ text: error });
                                errorText.getElement().style.display = 'block';
                                return;
                            }
                        }
                        resolve(values);
                        this.hide();
                    }
                })
            ],
            onClose: () => resolve(null)
        } as ModalProps);
    }

    public static show(options: FormDialogOptions): Promise<Record<string, any> | null> {
        return new Promise((resolve) => {
            const dialog = new FormDialog(options, resolve);
            dialog.show();
        });
    }
}
