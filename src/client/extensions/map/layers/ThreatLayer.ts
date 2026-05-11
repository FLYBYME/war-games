import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState } from '../MapState';

/**
 * ThreatLayer — Threat assessment overlay.
 *
 * Visualizes:
 * - Detection contacts (faded/uncertain positions)
 * - Threat corridors (approach vectors)
 * - Kill zones (overlapping WEZ areas)
 */
export class ThreatLayer implements MapLayer {
    readonly id = 'threats';
    readonly container = new Container();

    /** Active threat contacts from the detection subsystem */
    public contacts: ThreatContact[] = [];

    update(_state: MapViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.container.removeChildren();

        for (const contact of this.contacts) {
            this.renderContact(contact, viewScale);
        }
    }

    private renderContact(contact: ThreatContact, viewScale: number) {
        // Uncertainty ellipse
        const ellipse = new Graphics();
        const uncertaintyRadius = contact.uncertainty / viewScale * 1000;

        ellipse.ellipse(contact.pos.x, -contact.pos.y, uncertaintyRadius, uncertaintyRadius * 0.7);
        ellipse.fill({ color: 0xff5252, alpha: 0.06 });
        ellipse.stroke({ width: 1 / viewScale, color: 0xff5252, alpha: 0.25 });
        this.container.addChild(ellipse);

        // Contact dot
        const dot = new Graphics();
        const dotSize = 4 / viewScale;
        dot.rect(
            contact.pos.x - dotSize / 2,
            -contact.pos.y - dotSize / 2,
            dotSize,
            dotSize
        );
        dot.rotation = Math.PI / 4; // Diamond shape

        const color = contact.classification === 'hostile' ? 0xff5252
            : contact.classification === 'unknown' ? 0xffd740
            : 0x69f0ae;

        dot.fill({ color, alpha: 0.8 });
        this.container.addChild(dot);

        // Bearing line (predicted course)
        if (contact.heading !== undefined) {
            const lineLength = 50000; // 50km prediction line
            const headingRad = (contact.heading - 90) * (Math.PI / 180);
            const line = new Graphics();
            line.moveTo(contact.pos.x, -contact.pos.y);
            line.lineTo(
                contact.pos.x + Math.cos(headingRad) * lineLength,
                -contact.pos.y + Math.sin(headingRad) * lineLength
            );
            // Dashed effect
            line.stroke({ width: 1 / viewScale, color, alpha: 0.3 });
            this.container.addChild(line);
        }
    }

    destroy() {
        this.container.removeChildren();
    }
}

export interface ThreatContact {
    id: string;
    pos: { x: number; y: number; z: number };
    heading?: number;
    speed?: number;
    classification: 'hostile' | 'unknown' | 'friendly';
    /** Uncertainty radius in km — larger means less certain position */
    uncertainty: number;
    detectedBy: string[];
    lastDetectedTick: number;
}
