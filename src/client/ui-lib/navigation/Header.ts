// ui-lib/navigation/Header.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { MenuBar } from './MenuBar';
import { TitleBar } from './TitleBar';

export class Header extends BaseComponent<{}> {
    public menuBar: MenuBar;
    public titleBar: TitleBar;

    constructor() {
        super('div', {});
        this.menuBar = new MenuBar();
        this.titleBar = new TitleBar();
        this.render();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between', // Pushes menu to left and spacer/title logic
            height: '35px',
            backgroundColor: Theme.colors.bgPrimary,
            borderBottom: `1px solid ${Theme.colors.border}`,
            padding: `0 ${Theme.spacing.sm}`,
            position: 'relative',
            zIndex: '200'
        });

        this.element.innerHTML = '';

        // Left: MenuBar
        this.element.appendChild(this.menuBar.getElement());

        // Center: TitleBar (Absolute center within the flex container)
        const titleContainer = document.createElement('div');
        Object.assign(titleContainer.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', // Don't block menu interactions
            zIndex: '1'
        });
        titleContainer.appendChild(this.titleBar.getElement());
        this.element.appendChild(titleContainer);

        // Right spacer to keep flex balance if needed, 
        // but absolute centering is often cleaner for IDE titles.
    }

    public dispose(): void {
        this.menuBar.dispose();
        this.titleBar.dispose();
        super.dispose();
    }
}
