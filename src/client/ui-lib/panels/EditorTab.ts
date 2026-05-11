import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export interface EditorTabProps {
    id: string;
    title: string;
    icon?: string;
    active?: boolean;
    isDirty?: boolean;
    providerId?: string;
    isPinned?: boolean;

    // Callbacks
    onActivate?: (id: string) => void;
    onClose?: (id: string) => void;
    onContextMenu?: (id: string, x: number, y: number) => void;
    onDragStart?: (id: string, e: DragEvent) => void;
    onDragEnd?: (id: string, e: DragEvent) => void;
}

export class EditorTab extends BaseComponent<EditorTabProps> {
    constructor(props: EditorTabProps) {
        super('div', props);
        this.render();
        this.initRootEvents(); // Attach root listeners once
    }

    public render(): void {
        const {
            title,
            icon,
            active = false,
            isDirty = false,
            isPinned = false
        } = this.props;

        // Base container attributes
        this.element.draggable = true;
        this.element.title = this.props.id;

        // Use Theme values directly for styling
        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            padding: isPinned ? `0 ${Theme.spacing.sm}` : `0 ${Theme.spacing.md}`,
            height: '35px',
            backgroundColor: active ? Theme.colors.bgPrimary : Theme.colors.bgSecondary,
            borderRight: `1px solid ${Theme.colors.border}`,
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            minWidth: isPinned ? '40px' : '120px',
            maxWidth: '200px',
            boxSizing: 'border-box',
            justifyContent: isPinned ? 'center' : 'flex-start'
        });

        // Active bottom indicator
        if (active) {
            const indicator = document.createElement('div');
            Object.assign(indicator.style, {
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: Theme.colors.accent
            });
            this.element.appendChild(indicator);
        }

        // File/View Icon
        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.marginRight = isPinned ? '0' : Theme.spacing.sm;
            iconEl.style.fontSize = '14px';
            this.element.appendChild(iconEl);
        }

        // Title Text (hidden if pinned to save horizontal space)
        if (!isPinned) {
            const labelText = new Text({
                text: title,
                truncate: true,
                variant: active ? 'main' : 'muted',
                size: 'sm'
            });

            const textEl = labelText.getElement();
            textEl.style.flex = '1';
            this.element.appendChild(textEl);
        }

        // Action/Indicator Icon (Close, Dirty dot, or Pin)
        const actionBtn = document.createElement('i');

        if (isPinned) {
            actionBtn.className = 'fas fa-thumbtack';
        } else if (isDirty) {
            actionBtn.className = 'fas fa-circle';
        } else {
            actionBtn.className = 'fas fa-times';
        }

        Object.assign(actionBtn.style, {
            marginLeft: isPinned ? '0' : Theme.spacing.sm,
            fontSize: isDirty ? '8px' : '12px',
            padding: '4px',
            borderRadius: Theme.radius,
            visibility: (active || isDirty || isPinned) ? 'visible' : 'hidden',
            opacity: active ? '0.8' : '0.5',
            position: isPinned ? 'absolute' : 'static',
            top: isPinned ? '2px' : 'auto',
            right: isPinned ? '2px' : 'auto'
        });

        if (isPinned) {
            actionBtn.style.fontSize = '10px';
            actionBtn.style.transform = 'rotate(45deg)';
        }

        // Interaction effects for the action button
        actionBtn.onmouseenter = () => actionBtn.style.backgroundColor = Theme.colors.bgTertiary;
        actionBtn.onmouseleave = () => actionBtn.style.backgroundColor = 'transparent';

        actionBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.props.onClose && !isPinned) {
                this.props.onClose(this.props.id);
            }
        };

        // Hover effects for the overall tab wrapper
        this.element.onmouseenter = () => {
            if (!active) this.applyStyles({ backgroundColor: Theme.colors.bgTertiary });
            actionBtn.style.visibility = 'visible';
        };

        this.element.onmouseleave = () => {
            if (!active) this.applyStyles({ backgroundColor: Theme.colors.bgSecondary });
            if (!active && !isDirty && !isPinned) actionBtn.style.visibility = 'hidden';
        };

        this.element.appendChild(actionBtn);
    }

    /**
     * Attaches persistent event listeners to the root element. 
     * Since `updateProps()` only clears `innerHTML`, these listeners 
     * safely persist across state re-renders.
     */
    private initRootEvents(): void {
        this.element.addEventListener('click', () => {
            if (this.props.onActivate) this.props.onActivate(this.props.id);
        });

        this.element.addEventListener('auxclick', (e: MouseEvent) => {
            if (e.button === 1 && this.props.onClose) { // Middle click
                e.preventDefault();
                this.props.onClose(this.props.id);
            }
        });

        this.element.addEventListener('contextmenu', (e: MouseEvent) => {
            e.preventDefault();
            if (this.props.onContextMenu) this.props.onContextMenu(this.props.id, e.clientX, e.clientY);
        });

        this.element.addEventListener('dragstart', (e: DragEvent) => {
            this.element.style.opacity = '0.5';
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.props.id);
            }
            if (this.props.onDragStart) this.props.onDragStart(this.props.id, e);
        });

        this.element.addEventListener('dragend', (e: DragEvent) => {
            this.element.style.opacity = '1';
            if (this.props.onDragEnd) this.props.onDragEnd(this.props.id, e);
        });
    }

    // ==========================================
    // Public API mapped to ui-lib patterns
    // ==========================================

    public setActive(active: boolean): void {
        this.updateProps({ active });
    }

    public setDirty(isDirty: boolean): void {
        this.updateProps({ isDirty });
    }

    public setPinned(isPinned: boolean): void {
        this.updateProps({ isPinned });
    }

    public getId(): string {
        return this.props.id;
    }
}