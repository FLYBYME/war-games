import { Graphics } from 'pixi.js';

export type Affiliation = 'Friendly' | 'Hostile' | 'Neutral' | 'Unknown';
export type Domain = 'Air' | 'Surface' | 'Subsurface' | 'Weapon' | 'Space';

export interface SymbolConfig {
    affiliation: Affiliation;
    domain: Domain;
    type?: string; // e.g., 'Fighter', 'Destroyer', 'Carrier'
    size: number;
    viewScale: number;
    isSelected: boolean;
}

/**
 * SymbologyService: Generates MIL-STD-2525D tactical icons using PixiJS Graphics.
 */
export class SymbologyService {

    static drawSymbol(g: Graphics, config: SymbolConfig) {
        const { affiliation, domain, type, size, viewScale, isSelected } = config;
        const color = this.getAffiliationColor(affiliation);
        const strokeWidth = 1.5 / viewScale;
        const fillAlpha = isSelected ? 0.9 : 0.65;

        g.clear();

        // 1. Draw Frame
        this.drawFrame(g, affiliation, domain, size);
        g.fill({ color, alpha: fillAlpha });
        g.stroke({ width: strokeWidth, color: 0xffffff, alpha: 0.8 });

        // 2. Draw Domain-Specific Modifier
        this.drawDomainModifier(g, domain, size, strokeWidth);

        // 3. Draw Type-Specific Modifier (Center Icon)
        if (type) {
            this.drawTypeModifier(g, type, size, strokeWidth);
        }
    }

    private static drawFrame(g: Graphics, affiliation: Affiliation, domain: Domain, size: number) {
        switch (affiliation) {
            case 'Friendly':
                // Friendly: Square/Rectangle
                g.rect(-size, -size, size * 2, size * 2);
                break;
            case 'Hostile':
                // Hostile: Diamond
                g.moveTo(0, -size * 1.3).lineTo(size * 1.3, 0).lineTo(0, size * 1.3).lineTo(-size * 1.3, 0).closePath();
                break;
            case 'Neutral':
                // Neutral: Square
                g.rect(-size, -size, size * 2, size * 2);
                break;
            case 'Unknown':
                // Unknown: Clover/Cloud
                this.drawCloudFrame(g, size);
                break;
        }
    }

    private static drawTypeModifier(g: Graphics, type: string, size: number, strokeWidth: number) {
        const color = 0xffffff;
        const alpha = 0.8;
        const s = size * 0.4;

        switch (type.toLowerCase()) {
            case 'fighter':
                // Fighter: Small dot or arrow
                g.moveTo(-s, s).lineTo(0, -s).lineTo(s, s);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
            case 'destroyer':
                // Destroyer: Vertical line
                g.moveTo(0, -s).lineTo(0, s);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
            case 'carrier':
                // Carrier: 'U' shape inside
                g.moveTo(-s, -s).lineTo(-s, s).lineTo(s, s).lineTo(s, -s);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
            case 'tanker':
                // Tanker: Horizontal line
                g.moveTo(-s, 0).lineTo(s, 0);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
        }
    }

    private static drawCloudFrame(g: Graphics, size: number) {
        const s = size * 1.1;
        g.moveTo(-s, -s * 0.5);
        g.bezierCurveTo(-s, -s, -s * 0.5, -s, 0, -s);
        g.bezierCurveTo(s * 0.5, -s, s, -s, s, -s * 0.5);
        g.bezierCurveTo(s, 0, s, s * 0.5, s, s * 0.5);
        g.bezierCurveTo(s, s, s * 0.5, s, 0, s);
        g.bezierCurveTo(-s * 0.5, s, -s, s, -s, s * 0.5);
        g.closePath();
    }

    private static drawDomainModifier(g: Graphics, domain: Domain, size: number, strokeWidth: number) {
        const color = 0xffffff;
        const alpha = 0.8;

        switch (domain) {
            case 'Air':
                // Air: Upside-down 'V' or Chevron at the top
                g.moveTo(-size * 0.6, -size * 0.3);
                g.lineTo(0, -size * 0.8);
                g.lineTo(size * 0.6, -size * 0.3);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
            case 'Subsurface':
                // Subsurface: Semi-circle or 'U' at bottom
                g.moveTo(-size * 0.6, size * 0.3);
                g.bezierCurveTo(-size * 0.6, size * 0.9, size * 0.6, size * 0.9, size * 0.6, size * 0.3);
                g.stroke({ width: strokeWidth, color, alpha });
                break;
            case 'Weapon':
                // Weapon: Chevron (Vampire)
                g.moveTo(0, -size).lineTo(size * 0.8, size).lineTo(0, size * 0.5).lineTo(-size * 0.8, size).closePath();
                g.fill({ color: 0xff3300, alpha: 0.9 });
                break;
        }
    }

    static getAffiliationColor(affiliation: Affiliation): number {
        switch (affiliation) {
            case 'Friendly': return 0x00d4ff; // Cyan
            case 'Hostile': return 0xff2d55;  // Red
            case 'Neutral': return 0x30d158;  // Green
            case 'Unknown': return 0xffd60a;  // Yellow
            default: return 0xffd60a;
        }
    }
}
