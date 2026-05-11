import { Modal, ModalProps } from './Modal';
import { Stack } from '../layout/Stack';
import { SearchInput } from '../forms/SearchInput';
import { VirtualList } from '../navigation/VirtualList';
import { Theme } from '../theme';

export interface QuickPickItem {
    id: string;
    label: string;
    description?: string;
    icon?: string;
}

export interface QuickPickOptions {
    title?: string;
    placeholder?: string;
}

export class QuickPickDialog<T extends QuickPickItem> extends Modal {
    constructor(items: T[], options: QuickPickOptions, resolve: (value: T | null) => void) {
        let filteredItems = [...items];

        const list = new VirtualList({
            items: filteredItems,
            itemHeight: 32,
            height: '300px',
            renderItem: (item) => {
                const row = document.createElement('div');
                row.style.cssText = `
                    padding: 4px 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-radius: 4px;
                `;
                row.onmouseenter = () => row.style.backgroundColor = 'rgba(255,255,255,0.05)';
                row.onmouseleave = () => row.style.backgroundColor = 'transparent';
                row.onclick = () => { resolve(item); this.hide(); };

                if (item.icon) {
                    const icon = document.createElement('i');
                    icon.className = item.icon;
                    icon.style.width = '16px';
                    icon.style.textAlign = 'center';
                    row.appendChild(icon);
                }

                const label = document.createElement('span');
                label.textContent = item.label;
                row.appendChild(label);

                if (item.description) {
                    const desc = document.createElement('span');
                    desc.textContent = item.description;
                    desc.style.opacity = '0.5';
                    desc.style.fontSize = '0.9em';
                    desc.style.marginLeft = 'auto';
                    row.appendChild(desc);
                }

                return row;
            }
        });

        const searchInput = new SearchInput({
            placeholder: options.placeholder || 'Search...',
            onChange: (val: string) => {
                const term = val.toLowerCase();
                filteredItems = items.filter(i =>
                    i.label.toLowerCase().includes(term) ||
                    (i.description && i.description.toLowerCase().includes(term))
                );
                list.setItems(filteredItems);
            }
        });

        const body = new Stack({
            gap: 'sm',
            children: [searchInput, list]
        });

        super({
            title: options.title || 'Select',
            children: [body],
            width: '500px',
            onClose: () => resolve(null)
        } as ModalProps);

        // Focus search input after show
        setTimeout(() => {
            const input = searchInput.getElement().querySelector('input');
            if (input) input.focus();
        }, 50);
    }

    public static show<T extends QuickPickItem>(items: T[], options: QuickPickOptions): Promise<T | null> {
        return new Promise((resolve) => {
            const dialog = new QuickPickDialog(items, options, resolve);
            dialog.show();
        });
    }
}
