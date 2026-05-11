// ui-lib/layout/Row.ts
import { Stack, StackProps } from './Stack';

export class Row extends Stack {
    constructor(props: Omit<StackProps, 'direction'> = {}) {
        super({ ...props, direction: 'row' });
    }
}
