// ui-lib/navigation/TitleBar.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export class TitleBar extends BaseComponent<{ title: string }> {
    constructor(title: string = 'WAR-GAMES IDE') {
        super('div', { title });
        this.render();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '35px',
            flex: '1',
            pointerEvents: 'none', // Allow clicks through to the header if needed
            userSelect: 'none'
        });

        this.element.innerHTML = '';
        const titleText = new Text({
            text: this.props.title,
            variant: 'main',
            size: 'sm',
            weight: 'bold'
        });

        this.element.appendChild(titleText.getElement());
    }
}
