import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { commandDispatcher } from '../../framework/CommandDispatcher';

/**
 * WeatherWindow: Environment control dials for localized weather.
 * Ported to V2 WindowManager architecture.
 */
export class WeatherWindow extends Component {
    constructor() { super('div', 'weather-inject'); }

    protected styles() {
        return `
        .weather-inject { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-3); font-size: var(--text-sm); color: var(--text-main); }
        .wi-control { display: flex; flex-direction: column; gap: var(--sp-1); background: var(--bg-base); padding: var(--sp-2); border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .wi-label { font-size: var(--text-xs); color: var(--text-muted); display: flex; justify-content: space-between; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
        .wi-value { font-family: var(--font-mono); color: var(--color-friendly); }
        .wi-slider { width: 100%; accent-color: var(--accent-warning); background: var(--bg-hover); height: 4px; border-radius: 2px; appearance: none; margin-top: var(--sp-1); }
        .wi-slider::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-warning); cursor: pointer; }
        `;
    }

    protected render() {
        const vs = UIStore.viewState.get();
        const weather = vs?.weather || {
            precipitationRateMMhr: 0,
            cloudCover: 0,
            seaState: 0,
            windSpeedKts: 0,
            windDirDeg: 0,
            visibilityNM: 10,
            temperatureC: 15
        };

        const controls = [
            { label: 'Precipitation', unit: 'mm/hr', min: 0, max: 100, value: weather.precipitationRateMMhr ?? weather.precipitation ?? 0, key: 'precipitationRateMMhr' },
            { label: 'Cloud Cover', unit: '%', min: 0, max: 100, value: weather.cloudCover, key: 'cloudCover' },
            { label: 'Sea State', unit: '', min: 0, max: 9, value: weather.seaState, key: 'seaState' },
            { label: 'Wind Speed', unit: 'kts', min: 0, max: 100, value: weather.windSpeedKts, key: 'windSpeedKts' },
            { label: 'Wind Direction', unit: '°', min: 0, max: 360, value: weather.windDirDeg, key: 'windDirDeg' },
            { label: 'Visibility', unit: 'nm', min: 0, max: 50, value: weather.visibilityNM, key: 'visibilityNM' },
            { label: 'Temperature', unit: '°C', min: -40, max: 50, value: weather.temperatureC, key: 'temperatureC' },
        ];

        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'wi-title', 'WEATHER & ENVIRONMENT'));

        for (const c of controls) {
            const group = this.el('div', 'wi-control');
            const label = this.el('div', 'wi-label');
            label.appendChild(this.el('span', undefined, c.label));
            const valueEl = this.el('span', 'wi-value', `${Math.round(c.value)} ${c.unit}`);
            label.appendChild(valueEl);
            group.appendChild(label);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'wi-slider';
            slider.min = String(c.min); 
            slider.max = String(c.max); 
            slider.value = String(c.value);
            
            slider.addEventListener('input', () => {
                valueEl.textContent = `${slider.value} ${c.unit}`;
                if (UIStore.client) {
                    UIStore.client.dispatch({ 
                        type: 'SetEnvironment', 
                        key: c.key, 
                        value: Number(slider.value) 
                    } as any);
                }
            });
            group.appendChild(slider);
            this.element.appendChild(group);
        }
    }

    protected onMount() {
        this.render();
        this.subscribe(UIStore.viewState, () => this.render());
    }
}
