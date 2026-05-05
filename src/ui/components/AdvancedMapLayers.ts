import { Container, Graphics } from 'pixi.js';
import { MapLayer } from './MapLayer';
import { ViewState } from '../framework/UIStore';

const SCALE = 0.01;

/** Line-of-Sight shading — terrain occlusion overlay */
export class LOSShadingLayer implements MapLayer {
    readonly id = 'losShading';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const u of state.units) {
            if (u.losPolygon && u.losPolygon.length > 0) {
                g.moveTo(u.losPolygon[0].x * SCALE, -u.losPolygon[0].y * SCALE);
                for (let i = 1; i < u.losPolygon.length; i++) {
                    g.lineTo(u.losPolygon[i].x * SCALE, -u.losPolygon[i].y * SCALE);
                }
                g.closePath();
            }
        }
        g.fill({ color: 0x000000, alpha: 0.15 });
        this.container.addChild(g);
    }
}

/** EW Jammer strobes — bearing lines from sensors to jammer sources */
export class EWStrobesLayer implements MapLayer {
    readonly id = 'ewStrobes';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        // Bearing-only detection lines from friendly units toward hostile tracks
        for (const u of state.units) {
            for (const t of state.tracks) {
                if (t.classification?.toLowerCase() === 'hostile') {
                    const ux = u.pos.x * SCALE, uy = -u.pos.y * SCALE;
                    const tx = t.pos.x * SCALE, ty = -t.pos.y * SCALE;
                    const dx = tx - ux, dy = ty - uy;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 0.01) continue;
                    // Strobe extends beyond target
                    const ext = 1.5;
                    g.moveTo(ux, uy);
                    g.lineTo(ux + dx * ext, uy + dy * ext);
                }
            }
        }
        g.stroke({ width: 1 / viewScale, color: 0xbf5af2, alpha: 0.4 });
        this.container.addChild(g);
    }
}

/** Reference Points — user-placed markers and zones */
export class ReferencePointsLayer implements MapLayer {
    readonly id = 'referencePoints';
    readonly container = new Container();
    private points: { x: number; y: number; label: string }[] = [];

    addPoint(x: number, y: number, label: string) {
        this.points.push({ x, y, label });
    }

    clearPoints() { this.points = []; }

    update(_state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const rp of this.points) {
            const px = rp.x * SCALE, py = -rp.y * SCALE;
            g.circle(px, py, 4 / viewScale);
        }
        g.fill({ color: 0xffd60a, alpha: 0.6 });

        // Draw polygon if 3+ points
        if (this.points.length >= 3) {
            const pg = new Graphics();
            pg.moveTo(this.points[0].x * SCALE, -this.points[0].y * SCALE);
            for (let i = 1; i < this.points.length; i++) {
                pg.lineTo(this.points[i].x * SCALE, -this.points[i].y * SCALE);
            }
            pg.closePath();
            pg.fill({ color: 0xffd60a, alpha: 0.05 });
            pg.stroke({ width: 1 / viewScale, color: 0xffd60a, alpha: 0.3 });
            this.container.addChild(pg);
        }
        this.container.addChild(g);
    }
}

/** Sonobuoy patterns — circles and barriers for ASW */
export class SonobuoyPatternLayer implements MapLayer {
    readonly id = 'sonobuoyPattern';
    readonly container = new Container();
    private buoys: { x: number; y: number; type: 'passive' | 'active' }[] = [];

    addBuoy(x: number, y: number, type: 'passive' | 'active') {
        this.buoys.push({ x, y, type });
    }

    generateBarrier(startX: number, startY: number, endX: number, endY: number, count: number) {
        this.buoys = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            this.buoys.push({
                x: startX + (endX - startX) * t,
                y: startY + (endY - startY) * t,
                type: i % 2 === 0 ? 'passive' : 'active'
            });
        }
    }

    generateCircle(cx: number, cy: number, radiusM: number, count: number) {
        this.buoys = [];
        for (let i = 0; i < count; i++) {
            const angle = (2 * Math.PI * i) / count;
            this.buoys.push({
                x: cx + Math.cos(angle) * radiusM,
                y: cy + Math.sin(angle) * radiusM,
                type: 'passive'
            });
        }
    }

    update(_state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const b of this.buoys) {
            const px = b.x * SCALE, py = -b.y * SCALE;
            const r = 3 / viewScale;
            if (b.type === 'active') {
                g.circle(px, py, r);
                g.fill({ color: 0x22c55e, alpha: 0.7 });
                // Detection ring
                g.circle(px, py, 5000 * SCALE);
                g.stroke({ width: 0.5 / viewScale, color: 0x22c55e, alpha: 0.2 });
            } else {
                g.rect(px - r, py - r, r * 2, r * 2);
                g.fill({ color: 0x06b6d4, alpha: 0.7 });
            }
        }
        this.container.addChild(g);
    }
}

/** Depth contours / bathymetry lines */
export class DepthContoursLayer implements MapLayer {
    readonly id = 'depthContours';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        const bathy = state.mapData?.bathymetry;
        if (!bathy || !bathy.features) return;

        for (const feature of bathy.features) {
            if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates;
                // Simple projection: [lon, lat] -> [x, y]
                // Match the engine's GeoProjection roughly for demo
                const lon0 = 121, lat0 = 20; // Example center
                const mPerDeg = 111319.9;
                
                g.moveTo((coords[0][0] - lon0) * mPerDeg * SCALE, -(coords[0][1] - lat0) * mPerDeg * SCALE);
                for (let i = 1; i < coords.length; i++) {
                    g.lineTo((coords[i][0] - lon0) * mPerDeg * SCALE, -(coords[i][1] - lat0) * mPerDeg * SCALE);
                }
                g.stroke({ width: 0.5 / viewScale, color: 0x06b6d4, alpha: 0.25 });
            }
        }
        this.container.addChild(g);
    }
}

/** Weapon engagement zone (expanded with per-mount ranges) */
export class ThreatEnvelopeLayer implements MapLayer {
    readonly id = 'threatEnvelope';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const t of state.tracks) {
            if (t.classification?.toLowerCase() !== 'hostile') continue;
            const ox = t.pos.x * SCALE, oy = -t.pos.y * SCALE;
            // Threat MEZ and MAZ rings (placeholder radii)
            g.circle(ox, oy, 100000 * SCALE); // SAM envelope
            g.stroke({ width: 0.5 / viewScale, color: 0xff2d55, alpha: 0.2 });
            g.circle(ox, oy, 40000 * SCALE); // Point defense
            g.fill({ color: 0xff2d55, alpha: 0.03 });
        }
        this.container.addChild(g);
    }
}

/** Weapon tracks — lines from weapon to target */
export class WeaponTracksLayer implements MapLayer {
    readonly id = 'weaponTracks';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        if (!state.weaponBindings || state.weaponBindings.length === 0) return;
        const g = new Graphics();
        for (const binding of state.weaponBindings) {
            // Find the shooter and target (target can be track or unit)
            const shooter = state.units.find(u => u.id === binding.shooterId);
            const target = state.tracks.find(t => t.id === binding.targetId) || state.units.find(u => u.id === binding.targetId);
            if (shooter && target) {
                g.moveTo(shooter.pos.x * SCALE, -shooter.pos.y * SCALE);
                g.lineTo(target.pos.x * SCALE, -target.pos.y * SCALE);
            }
        }
        g.stroke({ width: 1.5 / viewScale, color: 0xff2d55, alpha: 0.6 });
        this.container.addChild(g);
    }
}

/** Sensor arcs — field-of-view cones for directional sensors */
export class SensorArcsLayer implements MapLayer {
    readonly id = 'sensorArcs';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const u of state.units) {
            const ox = u.pos.x * SCALE, oy = -u.pos.y * SCALE;
            const headRad = (-u.rot * Math.PI) / 180 + Math.PI / 2;
            const range = 120000 * SCALE;
            const halfArc = Math.PI / 3; // 60 deg half-arc
            g.moveTo(ox, oy);
            g.arc(ox, oy, range, headRad - halfArc, headRad + halfArc);
            g.closePath();
        }
        g.fill({ color: 0x00d4ff, alpha: 0.03 });
        g.stroke({ width: 0.5 / viewScale, color: 0x00d4ff, alpha: 0.15 });
        this.container.addChild(g);
    }
}

/** COP tracks — shared tactical picture contacts */
export class COPTracksLayer implements MapLayer {
    readonly id = 'copTracks';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        // Draw COP uncertainty ellipses around tracks
        for (const t of state.tracks) {
            const px = t.pos.x * SCALE, py = -t.pos.y * SCALE;
            const cepPx = Math.max(t.cep * SCALE, 3 / viewScale);
            g.ellipse(px, py, cepPx, cepPx * 0.7);
        }
        g.stroke({ width: 0.8 / viewScale, color: 0xffd60a, alpha: 0.3 });
        this.container.addChild(g);
    }
}

/** Sonar convergence zones */
export class SonarCZLayer implements MapLayer {
    readonly id = 'sonarCZ';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const u of state.units) {
            const ox = u.pos.x * SCALE, oy = -u.pos.y * SCALE;
            // CZ rings at ~30nm intervals
            for (let cz = 1; cz <= 3; cz++) {
                const r = cz * 55560 * SCALE; // ~30nm per CZ
                g.circle(ox, oy, r);
            }
        }
        g.stroke({ width: 0.6 / viewScale, color: 0x7c3aed, alpha: 0.2 });
        this.container.addChild(g);
    }
}

/** Detection CEP circles */
export class DetectionCEPLayer implements MapLayer {
    readonly id = 'detectionCEP';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        for (const t of state.tracks) {
            const px = t.pos.x * SCALE, py = -t.pos.y * SCALE;
            const cepPx = t.cep * SCALE;
            if (cepPx > 0.5 / viewScale) {
                g.circle(px, py, cepPx);
            }
        }
        g.fill({ color: 0xffd60a, alpha: 0.05 });
        g.stroke({ width: 0.5 / viewScale, color: 0xffd60a, alpha: 0.25 });
        this.container.addChild(g);
    }
}

/** ESM bearing lines from passive detection */
export class ESMBearingsLayer implements MapLayer {
    readonly id = 'esmBearings';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        if (!state.esmBearings || state.esmBearings.length === 0) return;
        const g = new Graphics();
        for (const b of state.esmBearings) {
            const obs = state.units.find((u: any) => u.id === b.observerId);
            if (obs) {
                const ox = obs.pos.x * SCALE;
                const oy = -obs.pos.y * SCALE;
                const len = 400000 * SCALE; // 400km strobe
                const rad = b.bearingDeg * (Math.PI / 180);
                g.moveTo(ox, oy);
                g.lineTo(ox + Math.cos(rad) * len, oy - Math.sin(rad) * len);
            }
        }
        g.stroke({ width: 0.5 / viewScale, color: 0xf59e0b, alpha: 0.4 });
        this.container.addChild(g);
    }
}

/** Borders / EEZ zones */
export class BordersLayer implements MapLayer {
    readonly id = 'borders';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        const borders = state.mapData?.borders;
        if (!borders || !borders.features) return;

        for (const feature of borders.features) {
            if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates;
                const lon0 = 121, lat0 = 20;
                const mPerDeg = 111319.9;

                g.moveTo((coords[0][0] - lon0) * mPerDeg * SCALE, -(coords[0][1] - lat0) * mPerDeg * SCALE);
                for (let i = 1; i < coords.length; i++) {
                    g.lineTo((coords[i][0] - lon0) * mPerDeg * SCALE, -(coords[i][1] - lat0) * mPerDeg * SCALE);
                }
                g.stroke({ width: 1 / viewScale, color: 0x64748b, alpha: 0.3 });
            }
        }
        this.container.addChild(g);
    }
}

/** Weather overlay — precipitation/cloud zones */
export class WeatherOverlayLayer implements MapLayer {
    readonly id = 'weather';
    readonly container = new Container();

    update(_state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        // Placeholder storm cells
        g.circle(100000 * SCALE, -50000 * SCALE, 80000 * SCALE);
        g.fill({ color: 0x475569, alpha: 0.1 });
        g.stroke({ width: 0.5 / viewScale, color: 0x94a3b8, alpha: 0.2 });
        g.circle(-200000 * SCALE, 100000 * SCALE, 50000 * SCALE);
        g.fill({ color: 0x475569, alpha: 0.15 });
        this.container.addChild(g);
    }
}

/** Thermal layers visualization */
export class ThermalLayersOverlay implements MapLayer {
    readonly id = 'thermalLayers';
    readonly container = new Container();

    update(_state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        // Horizontal thermal layer bands (subsurface visualization hint)
        const layerDepths = [50, 150, 300, 600];
        const colors = [0x0ea5e9, 0x0284c7, 0x0369a1, 0x075985];
        for (let i = 0; i < layerDepths.length; i++) {
            const y = layerDepths[i] * SCALE * 100;
            g.moveTo(-2000000 * SCALE, y);
            g.lineTo(2000000 * SCALE, y);
            g.stroke({ width: 0.8 / viewScale, color: colors[i], alpha: 0.15 });
        }
        this.container.addChild(g);
    }
}

/** Mission Areas — geographic constraints for VBSS/Minelaying */
export class MissionAreaLayer implements MapLayer {
    readonly id = 'missionArea';
    readonly container = new Container();

    update(state: ViewState, viewScale: number) {
        this.container.removeChildren();
        const g = new Graphics();
        
        // Draw areas from units with active missions
        for (const u of state.units) {
            // Check for VBSS allowedArea
            if (u.mission?.params?.allowedArea) {
                const area = u.mission.params.allowedArea;
                if (area.points && area.points.length >= 3) {
                    g.moveTo(area.points[0].x * SCALE, -area.points[0].y * SCALE);
                    for (let i = 1; i < area.points.length; i++) {
                        g.lineTo(area.points[i].x * SCALE, -area.points[i].y * SCALE);
                    }
                    g.closePath();
                    g.fill({ color: 0x32d74b, alpha: 0.05 });
                    g.stroke({ width: 1 / viewScale, color: 0x32d74b, alpha: 0.3 });
                }
            }
            
            // Check for Minelaying/MCM area
            if (u.mission?.params?.area) {
                const area = u.mission.params.area;
                if (area.points && area.points.length >= 3) {
                    g.moveTo(area.points[0].x * SCALE, -area.points[0].y * SCALE);
                    for (let i = 1; i < area.points.length; i++) {
                        g.lineTo(area.points[i].x * SCALE, -area.points[i].y * SCALE);
                    }
                    g.closePath();
                    g.fill({ color: 0xffd60a, alpha: 0.05 });
                    g.stroke({ width: 1 / viewScale, color: 0xffd60a, alpha: 0.3 });
                }
            }
        }
        this.container.addChild(g);
    }
}

/** Raster terrain background layer */
export class TerrainLayer implements MapLayer {
    readonly id = 'terrain';
    readonly container = new Container();
    private sprite?: any;
    private lastOrigin = { lat: 0, lon: 0 };

    async update(state: ViewState, viewScale: number) {
        if (!state.origin) return;

        // Load terrain image if origin changed or not yet loaded
        if (!this.sprite || state.origin.lat !== this.lastOrigin.lat || state.origin.lon !== this.lastOrigin.lon) {
            this.lastOrigin = { lat: state.origin.lat, lon: state.origin.lon };
            await this.loadTerrain();
        }

        if (this.sprite) {
            // Background is static at origin [0,0] meters
            this.sprite.position.set(0, 0);
        }
    }

    private async loadTerrain() {
        this.container.removeChildren();
        const path = '/terrain-lowres.png';
        console.log(`Attempting to load terrain from: ${path}`);
        try {
            const PIXI = (window as any).PIXI || await import('pixi.js');
            const texture = await PIXI.Assets.load(path);
            if (!texture) throw new Error('Texture loaded as null');
            
            this.sprite = new PIXI.Sprite(texture);
            this.sprite.anchor.set(0.5);
            this.sprite.alpha = 0.8;
            
            this.sprite.scale.set(2.87); 
            this.container.addChild(this.sprite);
            console.log('Terrain successfully loaded and added to stage');
        } catch (err) {
            console.error(`Failed to load terrain image ${path}:`, err);
        }
    }
}
