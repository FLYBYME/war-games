import { Component } from '../framework/Component';
import { UIStore } from '../framework/UIStore';

/**
 * ProfileEditorView: Visual editor for DB3000 unit profiles.
 */
export class ProfileEditorView extends Component {
    private jsonEditor!: HTMLTextAreaElement;

    constructor() {
        super('div', 'profile-editor', 'profile-editor');
    }

    protected styles(): string {
        return `
            .profile-editor {
                width: 100%;
                height: 100%;
                display: flex;
                background: var(--bg-base);
            }

            .profile-sidebar {
                width: 300px;
                background: var(--bg-panel);
                border-right: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
            }

            .profile-main {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: var(--sp-4);
                gap: var(--sp-4);
            }

            .editor-container {
                flex: 1;
                background: #05080f;
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                position: relative;
                overflow: hidden;
            }

            .json-editor {
                width: 100%;
                height: 100%;
                background: transparent;
                color: var(--text-accent);
                border: none;
                padding: var(--sp-4);
                font-family: var(--font-mono);
                font-size: 13px;
                resize: none;
                outline: none;
            }

            .profile-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .profile-title {
                font-size: var(--text-xl);
                font-weight: 700;
                color: var(--text-bright);
            }

            .profile-actions {
                display: flex;
                gap: var(--sp-2);
            }

            .btn-save {
                background: var(--color-friendly);
                color: #000;
                border: none;
                padding: var(--sp-2) var(--sp-4);
                border-radius: var(--radius-sm);
                font-weight: 700;
                cursor: pointer;
            }
        `;
    }

    protected render(): void {
        const sidebar = this.el('div', 'profile-sidebar');
        sidebar.appendChild(this.el('div', 'sidebar-header', 'PROFILES'));
        const list = this.el('div', 'library-list');
        ['F-35A', 'DDG-51', 'Tu-160'].forEach(p => {
            const item = this.el('div', 'library-item', p);
            item.onclick = () => this.loadProfile(p);
            list.appendChild(item);
        });
        sidebar.appendChild(list);

        const main = this.el('div', 'profile-main');
        const header = this.el('div', 'profile-header');
        header.appendChild(this.el('div', 'profile-title', 'PROFILE: F-35A'));
        
        const actions = this.el('div', 'profile-actions');
        const saveBtn = this.el('button', 'btn-save', 'SAVE CHANGES');
        saveBtn.onclick = () => this.save();
        actions.appendChild(saveBtn);
        header.appendChild(actions);

        const editorCont = this.el('div', 'editor-container');
        this.jsonEditor = document.createElement('textarea');
        this.jsonEditor.className = 'json-editor';
        this.jsonEditor.spellcheck = false;
        editorCont.appendChild(this.jsonEditor);

        main.appendChild(header);
        main.appendChild(editorCont);

        this.element.appendChild(sidebar);
        this.element.appendChild(main);

        this.loadProfile('F-35A');
    }

    private loadProfile(name: string) {
        const mock = {
            id: name,
            category: 'Aircraft',
            kinematics: { maxSpeed: 1200, maxAlt: 18000, climbRate: 150 },
            signatures: { rcs: 0.001, ir: 0.5 },
            sensors: [{ type: 'Radar', name: 'AN/APG-81' }]
        };
        this.jsonEditor.value = JSON.stringify(mock, null, 4);
    }

    private save() {
        try {
            const data = JSON.parse(this.jsonEditor.value);
            console.log('Saving profile...', data);
            alert('Profile saved successfully (Mock)');
        } catch (e) {
            alert('Invalid JSON format!');
        }
    }
}
