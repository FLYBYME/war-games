import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * MissionPanel: Manages tactical mission assignments (CAP, Strike, etc.)
 */
export class MissionPanel extends Component {
    constructor() {
        super('div', 'mission-panel');
    }

    protected styles(): string {
        return `
            .mission-panel {
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 16px;
                color: #eee;
            }

            .mission-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .mission-card {
                background: #2a2a2a;
                border: 1px solid #3a3a3a;
                border-radius: 4px;
                padding: 12px;
                cursor: pointer;
            }

            .mission-card:hover {
                border-color: #00d1ff;
                background: #333;
            }

            .mission-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .mission-name {
                font-weight: bold;
                color: #00d1ff;
            }

            .mission-type {
                font-size: 10px;
                background: #444;
                padding: 2px 6px;
                border-radius: 2px;
                text-transform: uppercase;
            }

            .mission-units {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }

            .unit-tag {
                font-size: 10px;
                background: rgba(0,209,255,0.1);
                color: #00d1ff;
                border: 1px solid rgba(0,209,255,0.3);
                padding: 1px 4px;
                border-radius: 2px;
            }

            .create-mission-btn {
                background: #00d1ff;
                color: #000;
                border: none;
                padding: 10px;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
                text-transform: uppercase;
                font-size: 12px;
            }

            .empty-state {
                text-align: center;
                color: #666;
                padding: 30px 10px;
                border: 1px dashed #444;
                border-radius: 4px;
            }
        `;
    }

    protected render(): void {
        const createBtn = this.el('button', 'create-mission-btn', 'Create New Mission', 'create-mission-btn');
        const list = this.el('div', 'mission-list');
        list.innerHTML = `<div class="empty-state">No active missions. Assign units to create one.</div>`;

        this.element.appendChild(createBtn);
        this.element.appendChild(list);

        createBtn.onclick = () => {
            console.log('Opening Create Mission Dialog...');
            // Future implementation: Dialog to select type and units
        };
    }
}
