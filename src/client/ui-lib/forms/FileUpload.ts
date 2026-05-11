// src/client/ui-lib/forms/FileUpload.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface FileUploadProps {
    onFileSelected: (file: File) => void;
    accept?: string;
    multiple?: boolean;
    label?: string;
    description?: string;
}

export class FileUpload extends BaseComponent<FileUploadProps> {
    private input!: HTMLInputElement;

    constructor(props: FileUploadProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { accept, multiple, label = 'Drag and drop files here', description = 'or click to browse' } = this.props;

        this.applyStyles({
            border: `2px dashed ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            padding: '32px 16px',
            textAlign: 'center',
            backgroundColor: Theme.colors.bgSecondary,
            cursor: 'pointer',
            transition: 'border-color 0.2s, background-color 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            fontFamily: Theme.font.family
        });

        this.element.innerHTML = '';

        const icon = document.createElement('i');
        icon.className = 'fas fa-cloud-upload-alt';
        Object.assign(icon.style, {
            fontSize: '32px',
            color: Theme.colors.textMuted,
            marginBottom: '4px'
        });
        this.element.appendChild(icon);

        const labelEl = document.createElement('div');
        Object.assign(labelEl.style, {
            fontSize: '14px',
            fontWeight: '600',
            color: Theme.colors.textMain
        });
        labelEl.textContent = label;
        this.element.appendChild(labelEl);

        const descEl = document.createElement('div');
        Object.assign(descEl.style, {
            fontSize: '12px',
            color: Theme.colors.textMuted
        });
        descEl.textContent = description;
        this.element.appendChild(descEl);

        this.input = document.createElement('input');
        this.input.type = 'file';
        if (accept) this.input.accept = accept;
        if (multiple) this.input.multiple = true;
        this.input.style.display = 'none';
        this.input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                Array.from(files).forEach(f => this.props.onFileSelected(f));
            }
        };
        this.element.appendChild(this.input);

        this.element.onclick = () => this.input.click();

        this.element.ondragover = (e) => {
            e.preventDefault();
            this.element.style.borderColor = Theme.colors.accent;
            this.element.style.backgroundColor = Theme.colors.bgTertiary;
        };

        this.element.ondragleave = () => {
            this.element.style.borderColor = Theme.colors.border;
            this.element.style.backgroundColor = Theme.colors.bgSecondary;
        };

        this.element.ondrop = (e) => {
            e.preventDefault();
            this.element.style.borderColor = Theme.colors.border;
            this.element.style.backgroundColor = Theme.colors.bgSecondary;
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                Array.from(files).forEach(f => this.props.onFileSelected(f));
            }
        };
    }
}
