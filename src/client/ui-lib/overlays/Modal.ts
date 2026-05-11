// ui-lib/overlays/Modal.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Button } from '../forms/Button';

export interface ModalProps {
    title: string;
    children: (BaseComponent<any> | Node | string)[];
    isOpen?: boolean;
    onClose?: () => void;
    width?: string;
    footer?: (BaseComponent<any> | Node | string)[];
}

export class Modal extends BaseComponent<ModalProps> {
    private backdrop: HTMLDivElement;
    private modalContainer: HTMLDivElement;

    constructor(props: ModalProps) {
        super('div', props);
        this.backdrop = document.createElement('div');
        this.modalContainer = document.createElement('div');
        this.render();
        if (props.isOpen) this.show();
    }

    public render(): void {
        const { title, children, width = '500px', footer = [] } = this.props;

        // Backdrop
        Object.assign(this.backdrop.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });

        // Modal Container
        Object.assign(this.modalContainer.style, {
            backgroundColor: Theme.colors.bgPrimary,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            width: width,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        });

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: `${Theme.spacing.md} ${Theme.spacing.lg}`,
            borderBottom: `1px solid ${Theme.colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.margin = '0';
        titleEl.style.fontSize = '16px';
        titleEl.style.color = Theme.colors.textMain;
        header.appendChild(titleEl);

        const closeBtn = new Button({
            icon: 'fas fa-times',
            variant: 'ghost',
            onClick: () => this.hide()
        });
        header.appendChild(closeBtn.getElement());

        // Body
        const body = document.createElement('div');
        Object.assign(body.style, {
            padding: Theme.spacing.lg,
            flex: '1',
            overflowY: 'auto',
            maxHeight: '70vh',
            color: Theme.colors.textMain
        });

        children.forEach(child => {
            if (child instanceof BaseComponent) {
                body.appendChild(child.getElement());
            } else if (typeof child === 'string') {
                body.appendChild(document.createTextNode(child));
            } else {
                body.appendChild(child);
            }
        });

        // Footer
        const footerEl = document.createElement('div');
        Object.assign(footerEl.style, {
            padding: `${Theme.spacing.md} ${Theme.spacing.lg}`,
            borderTop: `1px solid ${Theme.colors.border}`,
            display: footer.length > 0 ? 'flex' : 'none',
            justifyContent: 'flex-end',
            gap: Theme.spacing.md,
            backgroundColor: Theme.colors.bgSecondary
        });

        footer.forEach(child => {
            if (child instanceof BaseComponent) {
                footerEl.appendChild(child.getElement());
            } else if (typeof child === 'string') {
                footerEl.appendChild(document.createTextNode(child));
            } else {
                footerEl.appendChild(child);
            }
        });

        this.modalContainer.appendChild(header);
        this.modalContainer.appendChild(body);
        this.modalContainer.appendChild(footerEl);
        this.backdrop.appendChild(this.modalContainer);

        // Close on backdrop click
        this.backdrop.onclick = (e) => {
            if (e.target === this.backdrop) this.hide();
        };
    }

    public show(): void {
        if (!this.backdrop.parentNode) {
            document.body.appendChild(this.backdrop);
        }
        this.backdrop.style.display = 'flex';
        this.props.isOpen = true;
    }

    public hide(): void {
        this.backdrop.style.display = 'none';
        this.props.isOpen = false;
        if (this.props.onClose) this.props.onClose();
    }
}
