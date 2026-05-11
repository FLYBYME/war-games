// ui-lib/ide/CodeBlock.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface CodeBlockProps {
    code: string;
    language?: string;
}

export class CodeBlock extends BaseComponent<CodeBlockProps> {
    constructor(props: CodeBlockProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { code, language } = this.props;

        this.applyStyles({
            backgroundColor: Theme.colors.bgTertiary,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            padding: Theme.spacing.md,
            overflow: 'auto',
            fontFamily: 'var(--font-code, monospace)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: Theme.colors.textMain,
            width: '100%',
            boxSizing: 'border-box'
        });

        const pre = document.createElement('pre');
        pre.style.margin = '0';

        const codeEl = document.createElement('code');
        codeEl.textContent = code;
        if (language) {
            codeEl.className = `language-${language}`;
        }

        pre.appendChild(codeEl);
        this.element.appendChild(pre);
    }
}
