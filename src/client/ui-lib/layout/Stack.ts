// ui-lib/layout/Stack.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface StackProps {
    direction?: 'row' | 'column';
    align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    gap?: keyof typeof Theme.spacing | 'none';
    padding?: keyof typeof Theme.spacing | 'none';
    margin?: keyof typeof Theme.spacing | 'none';
    fill?: boolean; // If true, applies flex: 1 (grows to fill available space)
    scrollable?: boolean; // Useful for long file trees or lists
    width?: string;
    height?: string;
    minWidth?: string;
    minHeight?: string;
    children?: (BaseComponent<any> | Node | string)[];
}

export class Stack extends BaseComponent<StackProps> {
    constructor(props: StackProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            direction = 'column',
            align = 'stretch',
            justify = 'flex-start',
            gap = 'none',
            padding = 'none',
            margin = 'none',
            fill = false,
            scrollable = false,
            width,
            height,
            minWidth,
            minHeight,
            children = []
        } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: direction,
            alignItems: align,
            justifyContent: justify,
            gap: gap !== 'none' ? Theme.spacing[gap] : '0',
            padding: padding !== 'none' ? Theme.spacing[padding] : '0',
            margin: margin !== 'none' ? Theme.spacing[margin] : '0',
            flex: fill ? '1' : '0 0 auto',
            overflow: scrollable ? 'auto' : 'visible',
            boxSizing: 'border-box',
            width: width || (fill ? '100%' : 'auto'),
            height: height || (fill ? '100%' : 'auto'),
            minWidth: minWidth || '0',
            minHeight: minHeight || '0'
        });

        if (children.length > 0) {
            this.appendChildren(...children);
        }
    }
}