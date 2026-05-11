// ui-lib/layout/Divider.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
}

export class Divider extends BaseComponent<DividerProps> {
    constructor(props: DividerProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const isHorizontal = this.props.orientation !== 'vertical';

        this.applyStyles({
            backgroundColor: Theme.colors.border,
            width: isHorizontal ? '100%' : '1px',
            height: isHorizontal ? '1px' : '100%',
            flexShrink: '0' // Prevents flex containers from squishing the divider
        });
    }
}