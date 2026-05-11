// src/client/pages/UIDemo.ts

import * as ui from '../ui-lib';
import { BaseComponent } from '../ui-lib/BaseComponent';

export class UIDemoPage extends BaseComponent {
    constructor() {
        super('div');
        this.render();
    }

    public render(): void {
        this.applyStyles({
            padding: '40px',
            backgroundColor: ui.Theme.colors.bgPrimary,
            color: ui.Theme.colors.textMain,
            height: '100vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px'
        });

        this.appendChildren(
            new ui.Heading({ text: 'IDE UI Library Showcase', level: 1 }),
            this.renderLayoutSection(),
            this.renderOverlaySection(),
            this.renderFormSection(),
            this.renderIDESection()
        );
    }

    private renderLayoutSection(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `<h2>1. Advanced Layout</h2>`;

        const stack = new ui.Stack({
            gap: 'md',
            children: [
                new ui.Text({ text: 'ScrollArea Example (fixed height):' }),
                new ui.ScrollArea({
                    height: '150px',
                    width: '300px',
                    padding: 'md',
                    children: [
                        new ui.Text({ text: 'Line 1: Lots of content here...' }),
                        ...Array.from({ length: 20 }).map((_, i) => new ui.Text({ text: `Line ${i + 2}: More content...` }))
                    ]
                }),
                new ui.Divider(),
                new ui.Text({ text: 'Collapsible Example:' }),
                new ui.Collapsible({
                    title: 'Advanced Settings',
                    children: [
                        new ui.Stack({
                            padding: 'md',
                            children: [
                                new ui.Text({ text: 'Nested inside a collapsible!' }),
                                new ui.Button({ label: 'Do Something' })
                            ]
                        })
                    ]
                }),
                new ui.Divider(),
                new ui.Text({ text: 'SplitView Example (Horizontal):' }),
                this.renderSplitViewDemo()
            ]
        });

        container.appendChild(stack.getElement());
        return container;
    }

    private renderSplitViewDemo(): HTMLElement {
        const splitView = new ui.SplitView({
            orientation: 'horizontal',
            panes: [
                new ui.Stack({ fill: true, padding: 'md', children: [new ui.Text({ text: 'Left Pane' })] }),
                new ui.Stack({ fill: true, padding: 'md', children: [new ui.Text({ text: 'Right Pane' })] })
            ],
            initialSizes: [30, 70]
        });

        const wrap = document.createElement('div');
        wrap.style.height = '200px';
        wrap.style.border = `1px solid ${ui.Theme.colors.border}`;
        wrap.appendChild(splitView.getElement());
        return wrap;
    }

    private renderOverlaySection(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `<h2>2. Overlays & Floating Elements</h2>`;

        const modal = new ui.Modal({
            title: 'Welcome to the IDE',
            children: [new ui.Text({ text: 'This is a modal dialog. You can put anything here.' })],
            footer: [
                new ui.Button({ label: 'Cancel', onClick: () => modal.hide() }),
                new ui.Button({ label: 'Accept', variant: 'primary', onClick: () => modal.hide() })
            ]
        });

        const popover = new ui.Popover({
            anchor: document.createElement('div'), // Will be set below
            content: ['Interactive popover content', new ui.Button({ label: 'Click Me' })]
        });

        const stack = new ui.Stack({
            direction: 'row',
            gap: 'md',
            children: [
                new ui.Button({
                    label: 'Open Modal',
                    variant: 'primary',
                    onClick: () => modal.show()
                }),
                new ui.Button({
                    label: 'Open Popover',
                    onClick: (e) => {
                        popover.updateProps({ anchor: e.target as HTMLElement });
                        popover.show();
                    }
                }),
                new ui.Button({
                    label: 'Right Click Me',
                    onClick: (e) => {
                        new ui.ContextMenu([
                            { label: 'Cut', action: () => console.log('Cut'), icon: 'fas fa-cut' },
                            { label: 'Copy', action: () => console.log('Copy'), icon: 'fas fa-copy' },
                            { label: 'Paste', action: () => console.log('Paste'), icon: 'fas fa-paste' },
                            { separator: true },
                            {
                                label: 'Share',
                                items: [
                                    { label: 'Twitter', action: () => console.log('Twitter') },
                                    { label: 'GitHub', action: () => console.log('GitHub') }
                                ]
                            }
                        ], e.clientX, e.clientY);
                    }
                })
            ]
        });

        container.appendChild(stack.getElement());
        return container;
    }

    private renderFormSection(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `<h2>3. Expanded Form Controls</h2>`;

        const stack = new ui.Stack({
            gap: 'lg',
            children: [
                new ui.Select({
                    label: 'Theme',
                    options: [
                        { label: 'Dark Modern', value: 'dark' },
                        { label: 'Light Pro', value: 'light' },
                        { label: 'Solarized', value: 'solarized' }
                    ],
                    value: 'dark',
                    onChange: (v) => console.log('Selected:', v)
                }),
                new ui.Switch({
                    label: 'Enable Cloud Sync',
                    checked: true,
                    onChange: (c) => console.log('Switch:', c)
                }),
                new ui.RadioGroup({
                    name: 'difficulty',
                    options: [
                        { label: 'Easy', value: 'easy' },
                        { label: 'Default', value: 'default' },
                        { label: 'Hardcore', value: 'hard' }
                    ],
                    value: 'default',
                    onChange: (v) => console.log('Radio:', v)
                }),
                new ui.Slider({
                    label: 'Font Size',
                    min: 8,
                    max: 24,
                    value: 14,
                    onChange: (v) => console.log('Slider:', v)
                })
            ]
        });

        container.appendChild(stack.getElement());
        return container;
    }

    private renderIDESection(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `<h2>4. Specialized IDE Components</h2>`;

        const stack = new ui.Stack({
            gap: 'md',
            children: [
                new ui.Row({
                    gap: 'sm',
                    children: [
                        new ui.Text({ text: 'Command Palette Shortcut:' }),
                        new ui.KeybindingLabel({ keys: ['Ctrl', 'Shift', 'P'] })
                    ]
                }),
                new ui.Button({
                    label: 'Trigger Toast',
                    onClick: () => {
                        new ui.NotificationToast({
                            message: 'Success! Your project has been built.',
                            type: 'success'
                        }).show();
                    }
                }),
                new ui.Text({ text: 'Code Snippet:' }),
                new ui.CodeBlock({
                    language: 'typescript',
                    code: 'function hello() {\n  console.log("Hello UI Library!");\n}'
                })
            ]
        });

        container.appendChild(stack.getElement());
        return container;
    }
}
