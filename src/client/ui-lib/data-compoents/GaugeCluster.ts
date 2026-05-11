/**
 * GaugeCluster — Circular gauge display for speed/altitude/fuel.
 *
 * Renders an SVG arc gauge with a value, label, and optional unit.
 * Designed for the Entity Inspector to show kinematic telemetry.
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface GaugeClusterProps {
    gauges: GaugeConfig[];
    size?: 'sm' | 'md' | 'lg';
}

export interface GaugeConfig {
    label: string;
    value: number;
    max: number;
    unit?: string;
    color?: string;
    /** Warning threshold (0-1 fraction) — gauge turns amber above this */
    warnAt?: number;
    /** Critical threshold (0-1 fraction) — gauge turns red above this */
    critAt?: number;
}

export class GaugeCluster extends BaseComponent<GaugeClusterProps> {
    constructor(props: GaugeClusterProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { gauges, size = 'md' } = this.props;
        const sizeMap = { sm: 60, md: 80, lg: 100 };
        const gaugeSize = sizeMap[size];

        this.applyStyles({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
        });

        this.element.innerHTML = '';

        for (const gauge of gauges) {
            const wrapper = document.createElement('div');
            Object.assign(wrapper.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
            });

            const svg = this.buildGaugeSvg(gauge, gaugeSize);
            wrapper.appendChild(svg);

            // Label
            const label = document.createElement('span');
            Object.assign(label.style, {
                fontSize: '10px',
                color: Theme.colors.textMuted,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            });
            label.textContent = gauge.label;
            wrapper.appendChild(label);

            this.element.appendChild(wrapper);
        }
    }

    private buildGaugeSvg(gauge: GaugeConfig, size: number): SVGSVGElement {
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

        const cx = size / 2;
        const cy = size / 2;
        const radius = (size / 2) - 6;
        const strokeWidth = 4;
        const circumference = 2 * Math.PI * radius;
        const arcLength = circumference * 0.75; // 270-degree arc

        const fraction = Math.min(gauge.value / gauge.max, 1);

        // Determine color based on thresholds
        let color = gauge.color ?? 'var(--accent, #007acc)';
        if (gauge.critAt !== undefined && fraction >= gauge.critAt) {
            color = 'var(--status-crit, #f44336)';
        } else if (gauge.warnAt !== undefined && fraction >= gauge.warnAt) {
            color = 'var(--status-warn, #ff9800)';
        }

        // Background track
        const bgTrack = document.createElementNS(svgNs, 'circle');
        bgTrack.setAttribute('cx', String(cx));
        bgTrack.setAttribute('cy', String(cy));
        bgTrack.setAttribute('r', String(radius));
        bgTrack.setAttribute('fill', 'none');
        bgTrack.setAttribute('stroke', 'rgba(255,255,255,0.08)');
        bgTrack.setAttribute('stroke-width', String(strokeWidth));
        bgTrack.setAttribute('stroke-dasharray', `${arcLength} ${circumference}`);
        bgTrack.setAttribute('stroke-dashoffset', '0');
        bgTrack.setAttribute('stroke-linecap', 'round');
        bgTrack.setAttribute('transform', `rotate(135 ${cx} ${cy})`);
        svg.appendChild(bgTrack);

        // Value arc
        const valueArc = document.createElementNS(svgNs, 'circle');
        valueArc.setAttribute('cx', String(cx));
        valueArc.setAttribute('cy', String(cy));
        valueArc.setAttribute('r', String(radius));
        valueArc.setAttribute('fill', 'none');
        valueArc.setAttribute('stroke', color);
        valueArc.setAttribute('stroke-width', String(strokeWidth));
        valueArc.setAttribute('stroke-dasharray', `${arcLength * fraction} ${circumference}`);
        valueArc.setAttribute('stroke-dashoffset', '0');
        valueArc.setAttribute('stroke-linecap', 'round');
        valueArc.setAttribute('transform', `rotate(135 ${cx} ${cy})`);
        valueArc.style.transition = 'stroke-dasharray 0.5s ease';
        svg.appendChild(valueArc);

        // Center text — value
        const valueText = document.createElementNS(svgNs, 'text');
        valueText.setAttribute('x', String(cx));
        valueText.setAttribute('y', String(cy - 2));
        valueText.setAttribute('text-anchor', 'middle');
        valueText.setAttribute('dominant-baseline', 'middle');
        valueText.setAttribute('fill', Theme.colors.textMain);
        valueText.setAttribute('font-size', String(size * 0.2));
        valueText.setAttribute('font-family', 'var(--font-mono, monospace)');
        valueText.setAttribute('font-weight', '700');
        valueText.textContent = gauge.value >= 1000
            ? `${(gauge.value / 1000).toFixed(1)}k`
            : String(Math.round(gauge.value));
        svg.appendChild(valueText);

        // Unit text
        if (gauge.unit) {
            const unitText = document.createElementNS(svgNs, 'text');
            unitText.setAttribute('x', String(cx));
            unitText.setAttribute('y', String(cy + size * 0.15));
            unitText.setAttribute('text-anchor', 'middle');
            unitText.setAttribute('dominant-baseline', 'middle');
            unitText.setAttribute('fill', Theme.colors.textMuted);
            unitText.setAttribute('font-size', String(size * 0.12));
            unitText.textContent = gauge.unit;
            svg.appendChild(unitText);
        }

        return svg;
    }
}
