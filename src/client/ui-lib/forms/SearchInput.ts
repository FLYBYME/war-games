import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { TextInput } from './TextInput';
import { Popover } from '../overlays/Popover';

export interface SearchInputProps {
    placeholder?: string;
    history?: string[];
    onSearch?: (value: string) => void;
    onChange?: (value: string) => void;
}

export class SearchInput extends BaseComponent<SearchInputProps> {
    private input: TextInput;

    constructor(props: SearchInputProps) {
        super('div', props);
        this.input = new TextInput({
            placeholder: props.placeholder || 'Search...',
            onEnter: (val) => this.handleSearch(val),
            onChange: (val) => {
                if (this.props.onChange) this.props.onChange(val);
            }
        });
        this.render();
    }

    private handleSearch(value: string) {
        if (value && this.props.onSearch) {
            this.props.onSearch(value);
        }
    }

    public render(): void {
        this.applyStyles({
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%'
        });

        const icon = document.createElement('i');
        icon.className = 'fas fa-search';
        Object.assign(icon.style, {
            position: 'absolute',
            left: Theme.spacing.sm,
            fontSize: '12px',
            opacity: '0.6',
            pointerEvents: 'none',
            zIndex: '1'
        });

        // Adjust internal input padding to make room for icon
        this.input.getElement().style.paddingLeft = '28px';
        this.input.getElement().style.paddingRight = '28px';

        const historyBtn = document.createElement('i');
        historyBtn.className = 'fas fa-chevron-down';
        Object.assign(historyBtn.style, {
            position: 'absolute',
            right: Theme.spacing.sm,
            fontSize: '10px',
            cursor: 'pointer',
            opacity: '0.6'
        });

        historyBtn.onclick = () => this.showHistory(historyBtn);

        this.appendChildren(icon, this.input, historyBtn);
    }

    private showHistory(anchor: HTMLElement) {
        const history = this.props.history || [];
        if (history.length === 0) return;

        const items = history.map(term => {
            const el = document.createElement('div');
            Object.assign(el.style, {
                padding: `4px ${Theme.spacing.sm}`,
                cursor: 'pointer',
                fontSize: Theme.font.sizeBase
            });
            el.textContent = term;
            el.onclick = () => {
                this.input.updateProps({ value: term });
                this.handleSearch(term);
                popover.hide();
            };
            return el;
        });

        const popover = new Popover({
            anchor: this.element,
            content: items,
            placement: 'bottom'
        });
        popover.show();
    }
}