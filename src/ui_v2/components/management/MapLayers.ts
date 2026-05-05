import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * MapLayers: UI control for toggling tactical map layers.
 * Dynamically populated from UIStore.availableLayers.
 */
export class MapLayers extends Component {
    constructor() {
        super('div', 'map-layers', 'map-layers');
    }

    protected styles(): string {
        return `
            .map-layers {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                height: 100%;
                background: #1e1e1e;
                overflow-y: auto;
                color: #ccc;
                font-family: var(--font-mono, monospace);
                font-size: 11px;
                user-select: none;
            }

            .layer-group { margin-bottom: 10px; }

            .layer-group-title {
                font-size: 9px;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 8px;
                margin-bottom: 4px;
                border-bottom: 1px solid #333;
                padding-bottom: 2px;
            }

            .layer-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 8px;
                cursor: pointer;
                border-radius: 2px;
                transition: background 0.1s;
            }
            .layer-item:hover { background: #2a2a2a; }

            .layer-checkbox {
                width: 12px;
                height: 12px;
                border: 1px solid #00d1ff;
                border-radius: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .layer-checkbox.checked { background: #00d1ff; border-color: #00d1ff; }
            .layer-checkbox.checked::after { content: '✓'; color: black; font-size: 9px; font-weight: bold; }

            .layer-label { flex: 1; }
        `;
    }

    protected render(): void {
        this.subscribe(UIStore.availableLayers, (metas) => {
            this.element.innerHTML = '';
            
            const groups = new Map<string, typeof metas>();
            metas.forEach(m => {
                if (!groups.has(m.group)) groups.set(m.group, []);
                groups.get(m.group)!.push(m);
            });

            for (const [groupName, layers] of groups) {
                const groupEl = this.el('div', 'layer-group');
                groupEl.appendChild(this.el('div', 'layer-group-title', groupName));

                layers.forEach(meta => {
                    const item = this.el('div', 'layer-item', '', `layer-toggle-${meta.id}`);
                    const label = this.el('span', 'layer-label', meta.label);
                    const checkbox = this.el('div', 'layer-checkbox');

                    const sig = UIStore.getLayerSignal(meta.id);
                    this.subscribe(sig, (visible) => {
                        checkbox.classList.toggle('checked', visible);
                    });

                    this.listen(item, 'click', () => {
                        UIStore.toggleLayer(meta.id);
                    });

                    item.appendChild(label);
                    item.appendChild(checkbox);
                    groupEl.appendChild(item);
                });

                this.element.appendChild(groupEl);
            }
        });
    }
}
