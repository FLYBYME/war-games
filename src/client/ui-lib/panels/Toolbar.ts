// ui-lib/panels/Toolbar.ts

import { BaseComponent } from '../BaseComponent';
import { Row } from '../layout/Row';
import { Theme } from '../theme';

export interface ToolbarProps {
    variant?: 'primary' | 'secondary' | 'tertiary';
    children?: (BaseComponent<any> | Node | string)[];
}

export class Toolbar extends BaseComponent<ToolbarProps> {
    constructor(props: ToolbarProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { children = [], variant = 'primary' } = this.props;

        this.element.innerHTML = '';

        this.applyStyles({
            height: '35px',
            backgroundColor: variant === 'primary' ? Theme.colors.bgPrimary : variant === 'secondary' ? Theme.colors.bgSecondary : Theme.colors.bgTertiary,
            borderBottom: `1px solid ${Theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${Theme.spacing.sm}`,
            justifyContent: 'space-between',
            boxSizing: 'border-box'
        });

        const row = new Row({
            gap: 'xs',
            align: 'center',
            children: children
        });

        this.appendChildren(row);
    }
}
