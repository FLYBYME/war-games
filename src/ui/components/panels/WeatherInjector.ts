import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';

/**
 * WeatherInjector: Environment control dials for localized weather.
 */
export class WeatherInjector extends Component {
    constructor() { super('div', 'weather-inject'); }

    protected styles() {
        return `
        .weather-inject { padding:var(--sp-3); }
        .wi-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .wi-control { margin-bottom:var(--sp-3); }
        .wi-label { font-size:var(--text-xs); color:var(--text-muted); display:flex; justify-content:space-between; margin-bottom:4px; }
        .wi-value { font-family:var(--font-mono); color:var(--color-friendly); }
        .wi-slider { width:100%; accent-color:var(--accent-warning); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'wi-title', 'ENVIRONMENT INJECTOR'));

        const controls: { label: string; unit: string; min: number; max: number; value: number; key: string }[] = [
            { label: 'Precipitation', unit: 'mm/hr', min: 0, max: 100, value: 0, key: 'precipitationRateMMhr' },
            { label: 'Cloud Cover', unit: '%', min: 0, max: 100, value: 30, key: 'cloudCover' },
            { label: 'Sea State', unit: '', min: 0, max: 9, value: 3, key: 'seaState' },
            { label: 'Wind Speed', unit: 'kts', min: 0, max: 100, value: 15, key: 'windSpeedKts' },
            { label: 'Wind Direction', unit: '°', min: 0, max: 360, value: 220, key: 'windDirDeg' },
            { label: 'Visibility', unit: 'nm', min: 0, max: 50, value: 20, key: 'visibilityNM' },
            { label: 'Temperature', unit: '°C', min: -40, max: 50, value: 15, key: 'temperatureC' },
        ];

        for (const c of controls) {
            const group = this.el('div', 'wi-control');
            const label = this.el('div', 'wi-label');
            label.appendChild(this.el('span', undefined, c.label));
            const valueEl = this.el('span', 'wi-value', `${c.value} ${c.unit}`);
            label.appendChild(valueEl);
            group.appendChild(label);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'wi-slider';
            slider.min = String(c.min); slider.max = String(c.max); slider.value = String(c.value);
            slider.addEventListener('input', () => {
                valueEl.textContent = `${slider.value} ${c.unit}`;
                sdkClient.dispatch({ type: 'SetEnvironment', key: c.key, value: Number(slider.value) });
            });
            group.appendChild(slider);
            this.element.appendChild(group);
        }
    }
}
