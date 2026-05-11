// src/client/ui-lib/data/Table.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TableColumn<T> {
    key: keyof T | string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (item: T) => (BaseComponent<any> | HTMLElement | string);
}

export interface TableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    onRowSelect?: (item: T) => void;
    stickyHeader?: boolean;
    height?: string;
    selectable?: boolean;
}

export class Table<T = any> extends BaseComponent<TableProps<T>> {
    private sortKey: string | null = null;
    private sortDir: 'asc' | 'desc' = 'asc';

    constructor(props: TableProps<T>) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { data, columns, stickyHeader, height, selectable } = this.props;

        this.applyStyles({
            width: '100%',
            overflowX: 'auto',
            overflowY: height ? 'auto' : 'visible',
            height: height || 'auto',
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius || '4px',
            backgroundColor: Theme.colors.bgSecondary,
            fontFamily: Theme.font.family,
            fontSize: '12px'
        });

        this.element.innerHTML = '';

        const table = document.createElement('table');
        Object.assign(table.style, {
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left'
        });

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        if (stickyHeader) {
            thead.style.position = 'sticky';
            thead.style.top = '0';
            thead.style.zIndex = '10';
        }

        columns.forEach(col => {
            const th = document.createElement('th');
            Object.assign(th.style, {
                padding: '8px 12px',
                borderBottom: `2px solid ${Theme.colors.border}`,
                backgroundColor: Theme.colors.bgTertiary,
                color: Theme.colors.textMuted,
                fontWeight: '600',
                whiteSpace: 'nowrap',
                width: col.width || 'auto'
            });

            const content = document.createElement('div');
            content.style.display = 'flex';
            content.style.alignItems = 'center';
            content.style.gap = '4px';
            content.textContent = col.header;

            if (col.sortable) {
                th.style.cursor = 'pointer';
                const sortIcon = document.createElement('i');
                sortIcon.className = 'fas fa-sort';
                sortIcon.style.fontSize = '10px';
                sortIcon.style.opacity = '0.5';
                content.appendChild(sortIcon);

                th.onclick = () => {
                    this.handleSort(col.key as string);
                };
            }

            th.appendChild(content);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');

        let displayData = [...data];
        if (this.sortKey) {
            displayData.sort((a, b) => {
                const valA = (a as any)[this.sortKey!];
                const valB = (b as any)[this.sortKey!];
                if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        displayData.forEach((item) => {
            const tr = document.createElement('tr');
            Object.assign(tr.style, {
                borderBottom: `1px solid ${Theme.colors.border}`,
                transition: 'background-color 0.1s'
            });

            tr.onmouseenter = () => tr.style.backgroundColor = Theme.colors.bgTertiary;
            tr.onmouseleave = () => tr.style.backgroundColor = 'transparent';

            if (selectable) {
                tr.style.cursor = 'pointer';
                tr.onclick = () => {
                    if (this.props.onRowSelect) this.props.onRowSelect(item);

                    // Highlight selected row
                    tbody.querySelectorAll('tr').forEach(r => {
                        (r as HTMLElement).style.backgroundColor = 'transparent';
                        (r as HTMLElement).style.fontWeight = '400';
                    });
                    tr.style.backgroundColor = Theme.colors.bgTertiary;
                    tr.style.fontWeight = '600';
                };
            }

            columns.forEach(col => {
                const td = document.createElement('td');
                td.style.padding = '8px 12px';

                if (col.render) {
                    const rendered = col.render(item);
                    if (rendered instanceof BaseComponent) {
                        td.appendChild(rendered.getElement());
                    } else if (rendered instanceof HTMLElement) {
                        td.appendChild(rendered);
                    } else {
                        td.textContent = rendered;
                    }
                } else {
                    td.textContent = String((item as any)[col.key]);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        this.element.appendChild(table);
    }

    private handleSort(key: string): void {
        if (this.sortKey === key) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortKey = key;
            this.sortDir = 'asc';
        }
        this.render();
    }
}
