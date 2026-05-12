import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface MapHUDProps {
    lat: number | null;
    lon: number | null;
    elevation: number | null;
    scaleKm: number;
}

export class MapHUD extends BaseComponent<MapHUDProps> {
    constructor(props: MapHUDProps) {
        super('div', props);
    }

    public render(): void {
        this.applyStyles({
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            pointerEvents: 'none',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            background: 'rgba(0,0,0,0.6)',
            padding: '8px',
            borderLeft: '2px solid #00ff00',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            zIndex: '100',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            borderRadius: '0 4px 4px 0'
        });

        const { lat, lon, elevation, scaleKm } = this.props;

        this.element.innerHTML = `
            <div style="margin-bottom: 2px;">LAT: ${lat?.toFixed(4) ?? '---'}</div>
            <div style="margin-bottom: 2px;">LON: ${lon?.toFixed(4) ?? '---'}</div>
            <div style="margin-bottom: 6px;">ALT: ${elevation !== null ? elevation.toFixed(0) + 'm' : '---'}</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="font-size: 9px; opacity: 0.8; color: #00ff00;">SCALE: ${scaleKm.toFixed(2)} km</div>
                <div style="width: 100px; height: 4px; border: 1px solid #00ff00; border-top: none; position: relative;">
                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: #00ff00;"></div>
                    <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 1px; background: #00ff00;"></div>
                </div>
            </div>
        `;
    }
}
