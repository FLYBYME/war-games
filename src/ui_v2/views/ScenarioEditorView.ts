import { Component } from '../framework/Component';
import { UIStore } from '../framework/UIStore';
import { TacticalMap } from '../components/TacticalMap';

/**
 * ScenarioEditorView: Drag-and-drop tool for match creation.
 */
export class ScenarioEditorView extends Component {
    private currentSide: string = 'Blue';

    constructor() {
        super('div', 'scenario-editor', 'scenario-editor');
    }

    protected styles(): string {
        return `
            .scenario-editor {
                width: 100%;
                height: 100%;
                display: flex;
                background: var(--bg-base);
            }

            .editor-toolbar {
                width: 60px;
                background: var(--bg-panel);
                border-right: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: var(--sp-2) 0;
                gap: var(--sp-3);
            }

            .tool-btn {
                width: 40px;
                height: 40px;
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--text-dim);
                transition: all var(--transition-fast);
            }
            .tool-btn:hover { background: var(--bg-hover); color: var(--text-main); }
            .tool-btn.active { border-color: var(--color-friendly); color: var(--color-friendly); background: rgba(0, 212, 255, 0.05); }

            .editor-sidebar {
                width: 300px;
                background: var(--bg-panel);
                border-left: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
            }

            .sidebar-header {
                padding: var(--sp-3);
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
                font-weight: 700;
                font-size: var(--text-xs);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .library-list {
                flex: 1;
                overflow-y: auto;
                padding: var(--sp-2);
                display: flex;
                flex-direction: column;
                gap: var(--sp-1);
            }

            .library-item {
                padding: var(--sp-2) var(--sp-3);
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                cursor: grab;
                font-size: var(--text-sm);
                transition: all var(--transition-fast);
            }
            .library-item:hover { border-color: var(--border-light); background: var(--bg-hover); }

            .editor-main { flex: 1; position: relative; }
        `;
    }

    protected render(): void {
        const toolbar = this.el('div', 'editor-toolbar');
        toolbar.appendChild(this.createTool('cursor', 'Selection', true));
        toolbar.appendChild(this.createTool('plus-circle', 'Place Unit'));
        
        const sideToggle = this.el('div', 'side-toggle');
        sideToggle.style.cssText = 'margin: 10px 0; display: flex; flex-direction: column; gap: 4px;';
        
        const blueSide = this.el('div', 'tool-btn active', 'B', 'side-blue');
        blueSide.style.cssText = 'color: var(--color-friendly); font-weight: bold; width: 30px; height: 30px;';
        
        const redSide = this.el('div', 'tool-btn', 'R', 'side-red');
        redSide.style.cssText = 'color: var(--color-hostile); font-weight: bold; width: 30px; height: 30px;';
        
        blueSide.onclick = () => {
            this.currentSide = 'Blue';
            blueSide.classList.add('active');
            redSide.classList.remove('active');
        };
        redSide.onclick = () => {
            this.currentSide = 'Red';
            redSide.classList.add('active');
            blueSide.classList.remove('active');
        };
        sideToggle.append(blueSide, redSide);
        toolbar.appendChild(sideToggle);

        toolbar.appendChild(this.createTool('path', 'Draw Border'));
        toolbar.appendChild(this.createTool('eraser', 'Erase'));

        const main = this.el('div', 'editor-main');
        const map = new TacticalMap();
        this.addChild(map, main);

        const sidebar = this.el('div', 'editor-sidebar');
        sidebar.appendChild(this.el('div', 'sidebar-header', 'UNIT LIBRARY'));
        const library = this.el('div', 'library-list');
        
        const units = [
            { id: 'F-35A', name: 'F-35A Lightning II' },
            { id: 'F-18E', name: 'F/A-18E Super Hornet' },
            { id: 'DDG-51', name: 'DDG-51 Arleigh Burke' },
            { id: 'Type-052D', name: 'Type 052D Destroyer' },
            { id: 'Tu-160', name: 'Tu-160 Blackjack' },
            { id: 'Su-57', name: 'Su-57 Felon' }
        ];

        units.forEach(u => {
            const item = this.el('div', 'library-item', u.name);
            item.draggable = true;
            item.ondragstart = (e) => {
                e.dataTransfer?.setData('text/plain', u.id);
            };
            library.appendChild(item);
        });
        sidebar.appendChild(library);

        this.element.appendChild(toolbar);
        this.element.appendChild(main);
        this.element.appendChild(sidebar);

        // Setup drop handling
        this.listen(main, 'dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        });

        this.listen(main, 'drop', (e: DragEvent) => {
            e.preventDefault();
            const profileId = e.dataTransfer?.getData('text/plain');
            if (!profileId) return;

            const rect = main.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Access the map's renderer to convert screen to world
            const mapRenderer = (map as any).renderer;
            if (mapRenderer) {
                const worldPos = mapRenderer.screenToWorld(x, y);
                this.spawnUnit(profileId, worldPos);
            }
        });
    }

    private spawnUnit(profileId: string, pos: { x: number, y: number }) {
        const id = `${profileId}-${Math.floor(Math.random() * 1000)}`;
        
        UIStore.client.dispatch({
            type: 'SpawnEntity',
            id,
            profileId,
            side: this.currentSide as any,
            position: { x: pos.x, y: -pos.y, z: 5000 },
            heading: 0,
            speedKts: 350
        });

        console.log(`[Editor] Spawned ${profileId} on side ${this.currentSide} at ${pos.x}, ${pos.y}`);
    }

    private createTool(icon: string, label: string, active = false): HTMLElement {
        const btn = this.el('div', `tool-btn ${active ? 'active' : ''}`);
        btn.title = label;
        btn.innerHTML = `<i class="icon-${icon}"></i>`;
        return btn;
    }
}
