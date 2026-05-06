import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { windowManager } from '../../framework/WindowManager';
import { TimeControls } from './TimeControls';

export interface MenuItem {
    label: string;
    action?: () => void;
    items?: MenuItem[];
    testId?: string;
}

/**
 * MenuBar: Top-level navigation and command system.
 */
export class MenuBar extends Component {
    constructor() {
        super('nav', 'menu-bar');
    }

    protected styles(): string {
        return `
            .menu-bar {
                display: flex;
                height: 28px;
                background: var(--bg-surface-2, #2a2a2a);
                border-bottom: 1px solid var(--bg-surface-3, #3a3a3a);
                padding: 0 4px;
                align-items: center;
                z-index: 2000;
                user-select: none;
            }

            .menu-item {
                position: relative;
                height: 100%;
                display: flex;
                align-items: center;
                padding: 0 8px;
                font-size: 11px;
                color: var(--text-primary, #eee);
                cursor: default;
                transition: background 0.1s;
            }
            .menu-item:hover { background: var(--bg-surface-3, #3a3a3a); }

            .menu-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                background: var(--bg-surface-2, #2a2a2a);
                border: 1px solid var(--bg-surface-3, #3a3a3a);
                box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                display: none;
                min-width: 160px;
                padding: 4px 0;
            }

            .menu-item:hover > .menu-dropdown {
                display: block;
            }

            .dropdown-item {
                padding: 6px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.1s;
            }
            .dropdown-item:hover { background: var(--brand-primary, #00d1ff); color: black; }

            .menu-items-container {
                display: flex;
                height: 100%;
            }

            .menu-bar-right {
                margin-left: auto;
                height: 100%;
                display: flex;
                align-items: center;
            }
        `;
    }

    protected render(): void {
        const menus: MenuItem[] = [
            {
                label: 'FILE',
                items: [
                    { label: 'New Scenario', testId: 'menu-new-scenario' },
                    { label: 'Load...', testId: 'menu-load' },
                    { label: 'Save As...', testId: 'menu-save' },
                    { label: 'Exit', action: () => UIStore.activeView.set('menu') }
                ]
            },
            {
                label: 'VIEW',
                items: [
                    { label: 'Tactical Map', action: () => UIStore.activeView.set('tactical') },
                    { label: 'Force OOB', testId: 'menu-oob' },
                    { label: 'Logistics', action: () => UIStore.activeView.set('missions') },
                    { label: 'Intelligence', testId: 'menu-intel' }
                ]
            },
            {
                label: 'TOOLS',
                items: [
                    { label: 'Session Monitor', action: () => windowManager.open({ id: 'sessions', title: 'SESSION MONITOR', width: 400, height: 300 }) },
                    { label: 'Match Management', action: () => windowManager.open({ id: 'matches', title: 'MATCH MANAGEMENT', width: 500, height: 400 }) },
                    { label: 'Map Layers', action: () => windowManager.open({ id: 'layers', title: 'TACTICAL LAYERS', width: 250, height: 450 }) },
                    { label: 'Map Data Management', action: () => windowManager.open({ id: 'map-data', title: 'MAP DATA MANAGEMENT', width: 350, height: 500 }) },
                    { label: 'Weapon Mounts', action: () => windowManager.open({ id: 'mounts', title: 'WEAPON MOUNTS', width: 300, height: 400 }) },
                    { label: 'Sensor Control', action: () => windowManager.open({ id: 'sensors', title: 'SENSOR CONTROL', width: 300, height: 400 }) },
                    { label: 'Contact List', action: () => windowManager.open({ id: 'contacts', title: 'CONTACT LIST', width: 400, height: 500 }) },
                    { label: 'Mission Designer', action: () => windowManager.open({ id: 'mission-planner', title: 'MISSION DESIGNER', width: 400, height: 500 }) },
                    { label: 'Datalink Topology', action: () => windowManager.open({ id: 'network', title: 'DATALINK TOPOLOGY', width: 450, height: 350 }) },
                    { label: 'Fuel & Bingo Status', action: () => windowManager.open({ id: 'logistics', title: 'FUEL & BINGO STATUS', width: 400, height: 400 }) },
                    { label: 'Loadout Configurator', action: () => windowManager.open({ id: 'loadout', title: 'LOADOUT CONFIGURATOR', width: 350, height: 500 }) },
                    { label: 'Environment Injector', action: () => windowManager.open({ id: 'weather', title: 'ENVIRONMENT INJECTOR', width: 350, height: 450 }) },
                    { label: 'Doctrine & ROE', action: () => windowManager.open({ id: 'doctrine', title: 'DOCTRINE & ROE', width: 400, height: 350 }) },
                    { label: 'WRA Editor', action: () => windowManager.open({ id: 'wra', title: 'WRA EDITOR', width: 600, height: 400 }) },
                    { label: 'Losses & Telemetry', action: () => windowManager.open({ id: 'telemetry', title: 'LOSSES & TELEMETRY', width: 400, height: 300 }) },
                    { label: 'Strategic Mini-Map', action: () => windowManager.open({ id: 'minimap', title: 'STRATEGIC MINI-MAP', width: 300, height: 250 }) },
                    { label: 'DB3000 Browser', action: () => windowManager.open({ id: 'db-browser', title: 'DB3000 BROWSER', width: 800, height: 600 }) },
                    { label: 'Profile Editor', action: () => UIStore.activeView.set('profiles') },
                    { label: 'Scenario Editor', action: () => UIStore.activeView.set('scenarios') }
                ]
            },
            {
                label: 'HELP',
                items: [
                    { label: 'Manual', testId: 'menu-manual' },
                    { label: 'Keyboard Shortcuts', testId: 'menu-keys' },
                    { label: 'About', testId: 'menu-about' }
                ]
            }
        ];

        const menuContainer = this.el('div', 'menu-items-container');
        this.element.appendChild(menuContainer);

        menus.forEach(menu => {
            const item = this.el('div', 'menu-item', menu.label);
            const dropdown = this.el('div', 'menu-dropdown');

            menu.items?.forEach(sub => {
                const subItem = this.el('div', 'dropdown-item', sub.label, sub.testId);
                if (sub.action) {
                    this.listen(subItem, 'click', () => sub.action!());
                }
                dropdown.appendChild(subItem);
            });

            item.appendChild(dropdown);
            menuContainer.appendChild(item);
        });

        const rightSide = this.el('div', 'menu-bar-right');
        this.element.appendChild(rightSide);
        
        const timeControls = new TimeControls();
        this.addChild(timeControls, rightSide);
    }
}
