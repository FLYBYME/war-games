// ui-lib/layout/ScrollArea.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface ScrollAreaProps {
    children?: (BaseComponent<any> | Node | string)[];
    fill?: boolean;
    height?: string;
    width?: string;
    padding?: keyof typeof Theme.spacing | 'none';
}

export class ScrollArea extends BaseComponent<ScrollAreaProps> {
    constructor(props: ScrollAreaProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            children = [],
            fill = false,
            height,
            width,
            padding = 'none'
        } = this.props;

        this.applyStyles({
            overflow: 'auto',
            width: width || (fill ? '100%' : 'auto'),
            height: height || (fill ? '100%' : 'auto'),
            padding: padding !== 'none' ? Theme.spacing[padding] : '0',
            boxSizing: 'border-box',
            position: 'relative' // For absolute positioned children if any
        });

        if (children.length > 0) {
            this.appendChildren(...children);
        }
    }
}
