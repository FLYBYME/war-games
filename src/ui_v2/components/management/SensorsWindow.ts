import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * SensorsWindowContent: Displays and controls the sensors of the selected unit.
 */
export class SensorsWindowContent extends Component {
    constructor() {
        super('div', 'sensors-window');
    }

    protected styles(): string {
        return `
            .sensors-window {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                color: #eee;
                font-family: 'Inter', sans-serif;
            }

            .sensor-card {
                background: #2a2a2a;
                border-radius: 4px;
                padding: 10px;
                border-left: 3px solid #333;
            }

            .sensor-card.active { border-left-color: #00ff00; }
            .sensor-card.passive { border-left-color: #ffcc00; }

            .sensor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .sensor-name {
                font-weight: bold;
                font-size: 13px;
            }

            .sensor-status {
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                padding: 2px 6px;
                border-radius: 10px;
            }

            .active .sensor-status { background: rgba(0,255,0,0.2); color: #00ff00; }
            .passive .sensor-status { background: rgba(255,204,0,0.2); color: #ffcc00; }

            .sensor-details {
                font-size: 11px;
                color: #888;
                margin-bottom: 8px;
            }

            .toggle-btn {
                width: 100%;
                background: #444;
                color: white;
                border: none;
                padding: 6px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                text-transform: uppercase;
                transition: background 0.2s;
            }

            .active .toggle-btn { background: #333; }
            .toggle-btn:hover { background: #555; }
        `;
    }

    private sensorMap = new Map<string, HTMLElement>();

    protected render(): void {
        this.subscribe(UIStore.viewState, () => this.refresh());
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
    }

    private refresh() {
        const vs = UIStore.viewState.get();
        const selectedId = UIStore.selectedEntityId.get();
        const unit = vs?.units.find(u => u.id === selectedId);

        if (!unit || !unit.sensors || unit.sensors.length === 0) {
            this.element.innerHTML = `<div class="no-selection">${!unit ? 'No unit selected' : 'No sensors found'}</div>`;
            this.sensorMap.clear();
            return;
        }

        if (this.element.querySelector('.no-selection')) {
            this.element.innerHTML = '';
        }

        const activeSensorNames = new Set<string>();

        unit.sensors.forEach(s => {
            activeSensorNames.add(s.name);
            let card = this.sensorMap.get(s.name);
            
            if (!card) {
                card = this.el('div', 'sensor-card', '', `sensor-card-${s.name}`);
                card.innerHTML = `
                    <div class="sensor-header">
                        <span class="sensor-name"></span>
                        <span class="sensor-status"></span>
                    </div>
                    <div class="sensor-details"></div>
                    <button class="toggle-btn"></button>
                `;
                this.element.appendChild(card);
                this.sensorMap.set(s.name, card);

                const toggleBtn = card.querySelector('.toggle-btn') as HTMLButtonElement;
                toggleBtn.onclick = () => {
                    UIStore.client.dispatch({ type: 'SetSensorState', entityId: unit.id, sensor: s.name, active: !s.active });
                };
            }

            // Update state
            card.className = `sensor-card ${s.active ? 'active' : 'passive'}`;
            card.querySelector('.sensor-name')!.textContent = s.name;
            card.querySelector('.sensor-status')!.textContent = s.active ? 'Active' : 'Passive';
            card.querySelector('.sensor-details')!.textContent = `${(s.rangeM / 1000).toFixed(0)}km Range | ${s.halfArcDeg * 2}° Arc`;
            
            const toggleBtn = card.querySelector('.toggle-btn') as HTMLButtonElement;
            toggleBtn.textContent = s.active ? 'Silence (Passive)' : 'Radiate (Active)';
            
            const toggleId = `sensor-toggle-${s.name.replace(/\s+/g, '-').toLowerCase()}`;
            toggleBtn.setAttribute('data-testid', toggleId);
        });

        // Cleanup
        for (const [name, card] of this.sensorMap.entries()) {
            if (!activeSensorNames.has(name)) {
                card.remove();
                this.sensorMap.delete(name);
            }
        }
    }
}
