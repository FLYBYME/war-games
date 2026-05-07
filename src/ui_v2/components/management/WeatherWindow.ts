import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * WeatherWindow: Sim-wide environmental controls.
 */
export class WeatherWindow extends Component {
    constructor() {
        super('div', 'weather-window', 'weather-window');
    }

    protected styles(): string {
        return `
            .weather-window { padding: 15px; background: #111; color: #ddd; }
            .weather-header { font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #888; }
            .weather-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .stat-box { display: flex; flex-direction: column; }
            .stat-label { font-size: 10px; color: #555; text-transform: uppercase; }
            .stat-value { font-size: 14px; color: #ccc; margin-top: 2px; }
            input[type=range] { width: 100%; margin-top: 5px; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="weather-header">ENVIRONMENTAL CONDITIONS</div>
            <div class="weather-grid">
                <div class="stat-box">
                    <span class="stat-label">Sea State</span>
                    <span class="stat-value" id="val-sea">3</span>
                    <input type="range" id="input-sea" min="0" max="9" value="3">
                </div>
                <div class="stat-box">
                    <span class="stat-label">Cloud Cover</span>
                    <span class="stat-value" id="val-clouds">0.4</span>
                    <input type="range" id="input-clouds" min="0" max="1" step="0.1" value="0.4">
                </div>
            </div>
            <div style="margin-top: 15px; font-size: 11px; color: #444;">
                Adjusting these values affects sensor ranges and flight physics.
            </div>
        `;

        const seaInput = this.element.querySelector('#input-sea') as HTMLInputElement;
        const seaVal = this.element.querySelector('#val-sea') as HTMLElement;
        const cloudsInput = this.element.querySelector('#input-clouds') as HTMLInputElement;
        const cloudsVal = this.element.querySelector('#val-clouds') as HTMLElement;

        this.listen(seaInput, 'input', () => {
            seaVal.textContent = seaInput.value;
            void this.updateWeather('seaState', parseInt(seaInput.value));
        });

        this.listen(cloudsInput, 'input', () => {
            cloudsVal.textContent = cloudsInput.value;
            void this.updateWeather('cloudCover', parseFloat(cloudsInput.value));
        });
    }

    private async updateWeather(key: string, value: number) {
        try {
            await UIStore.issueCommand({
                type: 'SetEnvironment',
                key,
                value
            });
        } catch (e) {
            console.error('Failed to update weather', e);
        }
    }
}
