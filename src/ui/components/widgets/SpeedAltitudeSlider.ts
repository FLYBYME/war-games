import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { DatabaseService } from '../../framework/DatabaseService';

/**
 * SpeedAltitudeSlider: Granular speed and altitude control with presets.
 * Overrides NavigationComponent for the selected entity.
 */
export class SpeedAltitudeSlider extends Component {
    private speedSlider!: HTMLInputElement;
    private altSlider!: HTMLInputElement;
    private speedLabel!: HTMLElement;
    private altLabel!: HTMLElement;

    private applyBtn!: HTMLButtonElement;

    private pendingSpeed: number | null = null;
    private pendingAlt: number | null = null;

    constructor() { super('div', 'speed-alt-widget'); }

    protected onMount() {
        this.render(); // Build initial structure
        
        // Subscribe to viewState to update telemetry in real-time
        this.subscribe(UIStore.viewState, () => {
            this.updateTelemetry();
        });
    }

    protected styles() {
        return `
        .speed-alt-widget { padding:var(--sp-3); }
        .saw-group { margin-bottom:var(--sp-4); position: relative; }
        .saw-label { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between; }
        .saw-value { font-family:var(--font-mono); color:var(--color-friendly); }
        .saw-value.unsaved { color: #ff9800; font-weight: bold; text-shadow: 0 0 8px rgba(255,152,0,0.3); }
        .saw-slider { width:100%; accent-color:var(--color-friendly); background:var(--bg-surface); height:4px; border-radius:2px; appearance:none; transition: accent-color 0.2s; }
        .saw-slider.unsaved { accent-color: #ff9800; }
        .saw-slider::-webkit-slider-thumb { appearance:none; width:12px; height:12px; border-radius:50%; background:var(--color-friendly); cursor:pointer; }
        .saw-slider.unsaved::-webkit-slider-thumb { background: #ff9800; }
        .saw-presets { display:flex; gap:4px; margin-top:8px; flex-wrap:wrap; }
        .saw-controls { display: flex; gap: var(--sp-2); margin-top: var(--sp-3); border-top: 1px solid var(--border-color); padding-top: var(--sp-2); justify-content: flex-end; }
        .saw-btn { font-size: 10px; padding: 4px 8px; }
        `;
    }

    protected render() {
        const entityId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === entityId);
        if (!unit) return;

        const profile = unit.profileId ? DatabaseService.getProfile(unit.profileId) : undefined;
        const type = profile?.type || 'Aircraft';
        const maxSpeed = profile?.kinematics?.maxSpeedKts || (type === 'Ship' ? 40 : 1500);

        // --- Speed Group ---
        const speedGroup = this.el('div', 'saw-group');
        const speedHeader = this.el('div', 'saw-label');
        speedHeader.appendChild(this.el('span', undefined, 'Speed'));
        this.speedLabel = this.el('span', 'saw-value');
        speedHeader.appendChild(this.speedLabel);

        this.speedSlider = document.createElement('input');
        this.speedSlider.type = 'range'; 
        this.speedSlider.min = '0'; 
        this.speedSlider.max = String(maxSpeed);
        this.speedSlider.className = 'saw-slider';
        this.speedSlider.addEventListener('input', () => {
            this.pendingSpeed = Number(this.speedSlider.value);
            this.updateTelemetry();
        });

        const sPresets = type === 'Ship' 
            ? [['Stop', 0], ['1/3', 10], ['2/3', 20], ['Full', 30], ['Flank', maxSpeed]]
            : [['Loiter', 150], ['Cruise', 350], ['Mil', 600], ['AB', maxSpeed]];
        
        const speedPresets = this.el('div', 'saw-presets');
        for (const [label, val] of sPresets as [string, number][]) {
            const btn = document.createElement('button');
            btn.className = 'btn btn--ghost btn--sm saw-btn';
            btn.textContent = label;
            btn.addEventListener('click', () => { this.pendingSpeed = val; this.updateTelemetry(); });
            speedPresets.appendChild(btn);
        }
        speedGroup.append(speedHeader, this.speedSlider, speedPresets);

        // --- Altitude Group ---
        let minAlt = 0, maxAlt = 20000;
        if (type === 'Ship') { minAlt = 0; maxAlt = 0; }
        else if (type === 'Submarine') { minAlt = -600; maxAlt = 0; }
        else { minAlt = 10; maxAlt = profile?.kinematics?.maxAltitudeM || 20000; }

        const altGroup = this.el('div', 'saw-group');
        const altHeader = this.el('div', 'saw-label');
        altHeader.appendChild(this.el('span', undefined, type === 'Submarine' ? 'Depth' : 'Altitude'));
        this.altLabel = this.el('span', 'saw-value');
        altHeader.appendChild(this.altLabel);

        this.altSlider = document.createElement('input');
        this.altSlider.type = 'range'; 
        this.altSlider.min = String(minAlt); 
        this.altSlider.max = String(maxAlt);
        this.altSlider.className = 'saw-slider';
        if (type === 'Ship') this.altSlider.disabled = true;
        this.altSlider.addEventListener('input', () => {
            this.pendingAlt = Number(this.altSlider.value);
            this.updateTelemetry();
        });

        let aPresets: [string, number][] = [];
        if (type === 'Submarine') {
            aPresets = [['Surface', 0], ['Periscope', -15], ['Shallow', -50], ['Deep', -300], ['Test Depth', minAlt]];
        } else if (type === 'Aircraft') {
            aPresets = [['Low', 200], ['Mid', 5000], ['High', 10000], ['Ceiling', maxAlt]];
        }

        const altPresets = this.el('div', 'saw-presets');
        for (const [label, val] of aPresets) {
            const btn = document.createElement('button');
            btn.className = 'btn btn--ghost btn--sm saw-btn';
            btn.textContent = label;
            btn.addEventListener('click', () => { this.pendingAlt = val; this.updateTelemetry(); });
            altPresets.appendChild(btn);
        }
        altGroup.append(altHeader, this.altSlider, altPresets);

        // --- Controls ---
        const controls = this.el('div', 'saw-controls');
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn btn--ghost btn--sm saw-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => {
            this.pendingSpeed = null;
            this.pendingAlt = null;
            this.updateTelemetry();
        });

        this.applyBtn = document.createElement('button') as HTMLButtonElement;
        this.applyBtn.className = 'btn btn--primary btn--sm saw-btn';
        this.applyBtn.textContent = 'Apply Changes';
        this.applyBtn.addEventListener('click', () => this.applyChanges());

        controls.append(resetBtn, this.applyBtn);

        this.element.innerHTML = '';
        this.element.append(speedGroup, altGroup, controls);
        this.updateTelemetry(); // Sync values immediately
    }

    private updateTelemetry() {
        const entityId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === entityId);
        if (!unit || !this.speedSlider) return;

        // Speed Update
        const v = unit.vel || {x:0, y:0, z:0};
        const actualSpeed = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2) * 1.94384;
        const serverDesiredSpeed = (unit.desiredSpeedKts !== undefined && unit.desiredSpeedKts !== null) 
            ? unit.desiredSpeedKts 
            : actualSpeed;
        const displaySpeed = this.pendingSpeed !== null ? this.pendingSpeed : serverDesiredSpeed;

        this.speedLabel.classList.toggle('unsaved', this.pendingSpeed !== null);
        this.speedSlider.classList.toggle('unsaved', this.pendingSpeed !== null);
        this.speedLabel.innerHTML = Math.abs(actualSpeed - displaySpeed) > 1 
            ? `${Math.round(actualSpeed)} → ${Math.round(displaySpeed)} kts`
            : `${Math.round(actualSpeed)} kts`;

        // Only snap slider if user isn't touching it or if it's not "unsaved"
        if (this.pendingSpeed === null) {
            this.speedSlider.value = String(Math.round(displaySpeed));
        }

        // Altitude Update
        const actualAlt = unit.lla?.alt ?? unit.pos.z ?? 0;
        const serverDesiredAlt = (unit.desiredAltitudeM !== undefined && unit.desiredAltitudeM !== null)
            ? unit.desiredAltitudeM
            : actualAlt;
        const displayAlt = this.pendingAlt !== null ? this.pendingAlt : serverDesiredAlt;

        this.altLabel.classList.toggle('unsaved', this.pendingAlt !== null);
        this.altSlider.classList.toggle('unsaved', this.pendingAlt !== null);
        this.altLabel.innerHTML = Math.abs(actualAlt - displayAlt) > 5
            ? `${Math.round(actualAlt)} → ${Math.round(displayAlt)} m`
            : `${Math.round(actualAlt)} m`;

        if (this.pendingAlt === null) {
            this.altSlider.value = String(Math.round(displayAlt));
        }

        // Apply Button state
        this.applyBtn.disabled = this.pendingSpeed === null && this.pendingAlt === null;
    }

    private applyChanges() {
        const id = UIStore.selectedEntityId.get();
        if (!id) return;

        if (this.pendingSpeed !== null) {
            sdkClient.dispatch({ type: 'SetSpeed', entityId: id, speedKts: this.pendingSpeed });
            this.pendingSpeed = null;
        }
        if (this.pendingAlt !== null) {
            sdkClient.dispatch({ type: 'SetAltitude', entityId: id, altitudeM: this.pendingAlt });
            this.pendingAlt = null;
        }
        this.updateTelemetry();
    }
}
