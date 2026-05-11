// src/client/ui-lib/overlays/Drawer.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface DrawerProps {
    title?: string;
    children: (BaseComponent<any> | HTMLElement)[];
    placement?: 'left' | 'right' | 'bottom' | 'top';
    size?: string;
    onClose: () => void;
}

export class Drawer extends BaseComponent<DrawerProps> {
    private overlay!: HTMLElement;
    private drawerEl!: HTMLElement;

    constructor(props: DrawerProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { title, children, placement = 'right', size = '300px', onClose } = this.props;

        this.applyStyles({
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '40000',
            display: 'none',
            visibility: 'hidden'
        });

        this.element.innerHTML = '';

        // Overlay backdrop
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'absolute',
            top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        this.overlay.onclick = () => this.close();
        this.element.appendChild(this.overlay);

        // Drawer element
        this.drawerEl = document.createElement('div');
        Object.assign(this.drawerEl.style, {
            position: 'absolute',
            backgroundColor: Theme.colors.bgSecondary,
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.3s ease',
            fontFamily: Theme.font.family
        });

        switch (placement) {
            case 'right':
                Object.assign(this.drawerEl.style, { top: '0', right: '0', height: '100%', width: size, transform: 'translateX(100%)' });
                break;
            case 'left':
                Object.assign(this.drawerEl.style, { top: '0', left: '0', height: '100%', width: size, transform: 'translateX(-100%)' });
                break;
            case 'top':
                Object.assign(this.drawerEl.style, { top: '0', left: '0', width: '100%', height: size, transform: 'translateY(-100%)' });
                break;
            case 'bottom':
                Object.assign(this.drawerEl.style, { bottom: '0', left: '0', width: '100%', height: size, transform: 'translateY(100%)' });
                break;
        }

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '16px',
            borderBottom: `1px solid ${Theme.colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const titleEl = document.createElement('div');
        titleEl.textContent = title || '';
        titleEl.style.fontWeight = '600';
        titleEl.style.color = Theme.colors.textMain;
        header.appendChild(titleEl);

        const closeBtn = document.createElement('i');
        closeBtn.className = 'fas fa-times';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.opacity = '0.6';
        closeBtn.onclick = () => this.close();
        header.appendChild(closeBtn);
        this.drawerEl.appendChild(header);

        // Body
        const body = document.createElement('div');
        Object.assign(body.style, { flex: '1', padding: '16px', overflowY: 'auto' });
        children.forEach(child => {
            if (child instanceof BaseComponent) body.appendChild(child.getElement());
            else body.appendChild(child);
        });
        this.drawerEl.appendChild(body);

        this.element.appendChild(this.drawerEl);
        document.body.appendChild(this.element);
    }

    public open(): void {
        this.element.style.display = 'block';
        this.element.style.visibility = 'visible';
        setTimeout(() => {
            this.overlay.style.opacity = '1';
            this.drawerEl.style.transform = 'translate(0,0)';
        }, 10);
    }

    public close(): void {
        const { placement = 'right' } = this.props;
        this.overlay.style.opacity = '0';

        switch (placement) {
            case 'right': this.drawerEl.style.transform = 'translateX(100%)'; break;
            case 'left': this.drawerEl.style.transform = 'translateX(-100%)'; break;
            case 'top': this.drawerEl.style.transform = 'translateY(-100%)'; break;
            case 'bottom': this.drawerEl.style.transform = 'translateY(100%)'; break;
        }

        setTimeout(() => {
            this.element.style.display = 'none';
            this.element.style.visibility = 'hidden';
            if (this.props.onClose) this.props.onClose();
        }, 300);
    }
}
