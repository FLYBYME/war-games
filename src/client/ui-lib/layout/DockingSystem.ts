import { BaseComponent } from '../BaseComponent';
import { SplitView } from './SplitView';
import { Tab } from '../navigation/Tab';
import { Stack } from './Stack';
import { Theme } from '../theme';

export interface DockingArea {
    id: string;
    tabs: { label: string; icon?: string; content: BaseComponent<any> | HTMLElement }[];
    activeTabIndex: number;
}

export interface DockingSystemProps {
    layout: 'horizontal' | 'vertical';
    areas: DockingArea[];
}

export class DockingSystem extends BaseComponent<DockingSystemProps> {
    constructor(props: DockingSystemProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        const { layout, areas } = this.props;

        const panes = areas.map(area => this.createDockingArea(area));

        const mainSplit = new SplitView({
            orientation: layout,
            panes: panes,
            initialSizes: areas.map(() => 100 / areas.length)
        });

        this.applyStyles({ width: '100%', height: '100%' });
        this.appendChildren(mainSplit);
    }

    private createDockingArea(area: DockingArea): HTMLElement {
        const container = new Stack({ fill: true, direction: 'column' });

        // Tab Header
        const header = new Stack({
            direction: 'row',
            height: '35px',
            width: '100%',
            align: 'center',
            padding: 'none',
            // If you need specific background colors, 
            // it's better to add a 'variant' prop to Stack or use addClasses
        });

        // If you must apply a one-off style, use the public getElement() 
        // to access the raw HTMLElement
        Object.assign(header.getElement().style, {
            backgroundColor: Theme.colors.bgSecondary
        });
        area.tabs.forEach((t, i) => {
            const tab = new Tab({
                label: t.label,
                icon: t.icon,
                active: i === area.activeTabIndex,
                onClick: () => {
                    this.updateProps({
                        areas: this.props.areas.map(a =>
                            a.id === area.id ? { ...a, activeTabIndex: i } : a
                        )
                    });
                }
            });
            header.appendChildren(tab);
        });

        // Content Area
        const content = new Stack({ fill: true, scrollable: true });
        const activeContent = area.tabs[area.activeTabIndex].content;
        content.appendChildren(activeContent);

        container.appendChildren(header, content);
        return container.getElement();
    }
}