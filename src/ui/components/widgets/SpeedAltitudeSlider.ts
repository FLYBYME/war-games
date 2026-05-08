import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { ViewUnitPayload } from '../../../sdk/schemas';

/**
 * SpeedAltitudeSlider: Touch-friendly sliders for quick kinematic control.
 */
export class SpeedAltitudeSlider extends Component {
    private speedSlider!: HTMLInputElement;
    private altSlider!: HTMLInputElement;
    private speedValueEl!: HTMLElement;
    private altValueEl!: HTMLElement;

    constructor() {
        super('div', 'kinematic-sliders', 'kinematic-sliders');
    }

    protected styles(): string {
        return `
            .kinematic-sliders { padding: 15px; background: #111; display: flex; flex-direction: column; gap: 20px; }
            .slider-group { display: flex; flex-direction: column; gap: 8px; }
            .slider-header { display: flex; justify-content: space-between; font-size: 11px; color: #888; text-transform: uppercase; }
            .current-val { color: #00d1ff; font-weight: bold; font-family: monospace; }
            input[type=range] { width: 100%; height: 6px; background: #333; border-radius: 3px; outline: none; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="slider-group">
                <div class="slider-header">
                    <span>Desired Speed</span>
                    <span class="current-val" id="speed-val">0 KTS</span>
                </div>
                <input type="range" id="speed-slider" min="0" max="1500" step="10">
            </div>
            <div class="slider-group">
                <div class="slider-header">
                    <span>Desired Altitude</span>
                    <span class="current-val" id="alt-val">0 M</span>
                </div>
                <input type="range" id="alt-slider" min="0" max="15000" step="100">
            </div>
        `;

        this.speedSlider = this.element.querySelector('#speed-slider') as HTMLInputElement;
        this.altSlider = this.element.querySelector('#alt-slider') as HTMLInputElement;
        this.speedValueEl = this.element.querySelector('#speed-val') as HTMLElement;
        this.altValueEl = this.element.querySelector('#alt-val') as HTMLElement;

        this.listen(this.speedSlider, 'change', () => this.handleSpeedChange());
        this.listen(this.altSlider, 'change', () => this.handleAltChange());

        this.subscribe(UIStore.viewState, () => this.sync());
    }

    private sync() {
        const entity = UIStore.getSelectedEntity();
        if (!entity || !('speedKts' in entity)) return;
        
        const unit = entity as ViewUnitPayload;
        this.speedValueEl.textContent = `${Math.round(unit.speedKts!)} KTS`;
        this.altValueEl.textContent = `${Math.round(unit.pos.z)} M`;
        
        this.speedSlider.value = String(unit.speedKts);
        this.altSlider.value = String(unit.pos.z);
    }

    private handleSpeedChange() {
        const id = UIStore.selectedEntityId.get();
        if (id) {
            void sdkClient.dispatch({ type: 'SetSpeed', entityId: id, speedKts: parseFloat(this.speedSlider.value) });
        }
    }

    private handleAltChange() {
        const id = UIStore.selectedEntityId.get();
        if (id) {
            void sdkClient.dispatch({ type: 'SetAltitude', entityId: id, altitudeM: parseFloat(this.altSlider.value) });
        }
    }
}
