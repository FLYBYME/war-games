
// ui-lib/layout/Column.ts
import { Stack, StackProps } from './Stack';

export class Column extends Stack {
    constructor(props: Omit<StackProps, 'direction'> = {}) {
        super({ ...props, direction: 'column' });
    }
}