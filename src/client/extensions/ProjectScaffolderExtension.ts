import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';

// Import the UI Library components
import * as uiLib from '../ui-lib';

export const ProjectScaffolderExtension: Extension = {
    id: 'demo.scaffolder',
    name: 'Project Scaffolder',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        // 1. Register the View Provider
        const scaffolderProvider: ViewProvider = {
            id: 'demo.scaffolder.view',
            name: 'Scaffolder',
            resolveView: (container: HTMLElement) => {

                // -- MASTER LAYOUT --
                // Create a single master container that takes up the entire panel
                const masterLayout = new uiLib.Column({
                    fill: true
                });

                // -- SCAFFOLDER FORM SECTION --
                // This column will only take up as much height as its contents need
                const scaffolderForm = new uiLib.Column({
                    padding: 'md',
                    gap: 'md'
                });

                const header = new uiLib.Heading({
                    text: 'NEW PROJECT',
                    level: 4,
                    transform: 'uppercase',
                    variant: 'muted'
                });

                const nameInput = new uiLib.TextInput({
                    placeholder: 'Project Name...',
                    onChange: (val) => console.log(`Input updated: ${val}`)
                });

                const gitCheckbox = new uiLib.Checkbox({
                    label: 'Initialize Git Repository',
                    checked: true
                });

                const tsCheckbox = new uiLib.Checkbox({
                    label: 'Use TypeScript',
                    checked: true
                });

                const optionsRow = new uiLib.Column({
                    gap: 'sm',
                    children: [gitCheckbox, tsCheckbox]
                });

                const description = new uiLib.Text({
                    text: 'This will generate a boilerplate structure in your current workspace.',
                    variant: 'muted',
                    size: 'sm'
                });

                const createBtn = new uiLib.Button({
                    label: 'Generate Boilerplate',
                    variant: 'primary',
                    icon: 'fas fa-plus',
                    onClick: () => {
                        const name = nameInput.getValue();
                        const useGit = gitCheckbox.isChecked();
                        const useTs = tsCheckbox.isChecked();

                        // Notify the user of the exact configuration being built
                        context.ide.notifications.notify(
                            `Creating project: ${name || 'Untitled'} (Git: ${useGit}, TS: ${useTs})`, 'info'
                        );
                    }
                });

                scaffolderForm.updateProps({
                    children: [header, nameInput, optionsRow, description, createBtn]
                });

                // -- EXPLORER LIST SECTION --
                const sidebarHeader = new uiLib.Toolbar({
                    children: [
                        new uiLib.Heading({ text: 'EXPLORER', level: 4, transform: 'uppercase' }),
                        new uiLib.Spacer(),
                        new uiLib.Button({
                            icon: 'fas fa-file-plus',
                            variant: 'ghost',
                            onClick: () => console.log('New File')
                        })
                    ]
                });

                const files = [
                    { name: 'src', type: 'folder', depth: 0, expanded: true },
                    { name: 'index.ts', type: 'file', depth: 1 },
                    { name: 'styles.css', type: 'file', depth: 1 },
                    { name: 'package.json', type: 'file', depth: 0 }
                ];

                const fileList = new uiLib.VirtualList({
                    items: files,
                    itemHeight: 24,
                    height: '100%',
                    renderItem: (item) => new uiLib.TreeItem({
                        label: item.name,
                        depth: item.depth,
                        hasChildren: item.type === 'folder',
                        expanded: item.expanded,
                        icon: item.type === 'folder' ? 'fas fa-folder' : 'far fa-file-code',
                        actions: [
                            { icon: 'fas fa-edit', onClick: () => console.log('Rename') }
                        ]
                    })
                });

                // Wrap the Toolbar and VirtualList in a Column that expands to fill remaining space
                const explorerSection = new uiLib.Column({
                    fill: true,
                    children: [sidebarHeader, fileList]
                });

                // -- ASSEMBLE AND MOUNT --
                masterLayout.updateProps({
                    children: [
                        scaffolderForm,
                        new uiLib.Divider(),
                        explorerSection
                    ]
                });

                // Mount the single master layout to the DOM container
                masterLayout.mount(container);

                requestAnimationFrame(() => {
                    fileList.getElement().dispatchEvent(new Event('scroll'));
                });
            }
        };

        // 2. Register with the IDE
        context.ide.views.registerProvider('left-panel', scaffolderProvider);

        // 3. Add Activity Bar Icon
        context.ide.activityBar.registerItem({
            id: scaffolderProvider.id,
            location: 'left-panel',
            icon: 'fas fa-hammer',
            title: 'Project Scaffolder',
            order: 110
        });

        // 4. Register a command to open this view
        context.subscriptions.push(
            context.ide.commands.registerDisposable({
                id: 'scaffolder.open',
                label: 'Open Scaffolder',
                handler: () => {
                    context.ide.notifications.notify('Scaffolder ready!', 'info');
                }
            })
        );

        console.log('Project Scaffolder Extension activated');
    }
};