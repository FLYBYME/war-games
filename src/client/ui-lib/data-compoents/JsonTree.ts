/**
 * JsonTree — Collapsible JSON viewer for API responses and debug data.
 *
 * Renders a nested, interactive JSON tree with expand/collapse,
 * type-colored values, and copy-to-clipboard support.
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface JsonTreeProps {
    data: unknown;
    /** Max initial depth to expand (default: 2) */
    expandDepth?: number;
    /** Root label (optional) */
    label?: string;
}

export class JsonTree extends BaseComponent<JsonTreeProps> {
    constructor(props: JsonTreeProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { data, expandDepth = 2, label } = this.props;

        this.applyStyles({
            fontFamily: 'var(--font-mono, "JetBrains Mono", "Fira Code", monospace)',
            fontSize: '12px',
            lineHeight: '1.6',
            color: Theme.colors.textMain,
            overflow: 'auto',
        });

        this.element.innerHTML = '';
        const tree = this.buildNode(label ?? 'root', data, 0, expandDepth);
        this.element.appendChild(tree);
    }

    private buildNode(key: string, value: unknown, depth: number, expandDepth: number): HTMLElement {
        const row = document.createElement('div');
        row.style.paddingLeft = `${depth * 16}px`;

        if (value === null || value === undefined) {
            row.innerHTML = `<span style="color:${Theme.colors.textMuted}">${this.escapeHtml(key)}</span>: <span style="color:#f44336">null</span>`;
            return row;
        }

        if (typeof value === 'string') {
            row.innerHTML = `<span style="color:${Theme.colors.textMuted}">${this.escapeHtml(key)}</span>: <span style="color:#ce9178">"${this.escapeHtml(value)}"</span>`;
            return row;
        }

        if (typeof value === 'number') {
            row.innerHTML = `<span style="color:${Theme.colors.textMuted}">${this.escapeHtml(key)}</span>: <span style="color:#b5cea8">${value}</span>`;
            return row;
        }

        if (typeof value === 'boolean') {
            row.innerHTML = `<span style="color:${Theme.colors.textMuted}">${this.escapeHtml(key)}</span>: <span style="color:#569cd6">${value}</span>`;
            return row;
        }

        if (Array.isArray(value)) {
            return this.buildCollapsible(key, value, depth, expandDepth, `Array(${value.length})`);
        }

        if (typeof value === 'object') {
            const entries = Object.keys(value as Record<string, unknown>);
            return this.buildCollapsible(key, value as Record<string, unknown>, depth, expandDepth, `{${entries.length}}`);
        }

        row.innerHTML = `<span style="color:${Theme.colors.textMuted}">${this.escapeHtml(key)}</span>: <span>${String(value)}</span>`;
        return row;
    }

    private buildCollapsible(
        key: string,
        value: Record<string, unknown> | unknown[],
        depth: number,
        expandDepth: number,
        summary: string
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.paddingLeft = `${depth * 16}px`;

        const header = document.createElement('div');
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '4px';

        const expanded = depth < expandDepth;

        const arrow = document.createElement('span');
        arrow.textContent = expanded ? '▼' : '▶';
        arrow.style.fontSize = '8px';
        arrow.style.width = '10px';
        arrow.style.color = Theme.colors.textMuted;

        const keySpan = document.createElement('span');
        keySpan.textContent = key;
        keySpan.style.color = Theme.colors.textMuted;

        const summarySpan = document.createElement('span');
        summarySpan.textContent = summary;
        summarySpan.style.color = 'var(--accent, #007acc)';
        summarySpan.style.fontSize = '10px';

        header.appendChild(arrow);
        header.appendChild(keySpan);
        header.appendChild(summarySpan);

        const children = document.createElement('div');
        children.style.display = expanded ? 'block' : 'none';

        const entries = Array.isArray(value)
            ? value.map((v, i) => [String(i), v] as [string, unknown])
            : Object.entries(value);

        for (const [childKey, childValue] of entries) {
            children.appendChild(this.buildNode(childKey, childValue, depth + 1, expandDepth));
        }

        header.addEventListener('click', () => {
            const isExpanded = children.style.display !== 'none';
            children.style.display = isExpanded ? 'none' : 'block';
            arrow.textContent = isExpanded ? '▶' : '▼';
        });

        wrapper.appendChild(header);
        wrapper.appendChild(children);
        return wrapper;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
