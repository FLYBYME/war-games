// ui-lib/layout/Spacer.ts
import { BaseComponent } from '../BaseComponent';

export interface SpacerProps {
    flex?: string;
    height?: string;
    width?: string;
}

/**
 * An invisible component that absorbs remaining flex space.
 * Perfect for pushing a toolbar to the left and a settings icon to the right.
 */
export class Spacer extends BaseComponent<SpacerProps> {
    constructor(props: SpacerProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { flex = '1', height, width } = this.props;
        this.applyStyles({
            flex,
            height,
            width,
            pointerEvents: 'none'
        });
    }
}
