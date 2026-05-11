import { Container, Graphics, Rectangle } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { MapViewState, MapTrack } from '../MapState';

/**
 * TracksLayer — Entity trajectory trail overlay.
 *
 * Renders historical position tracks for entities, showing where they've been.
 * Uses color fading to indicate age of track points.
 */
export class TracksLayer implements MapLayer {
    readonly id = 'tracks';
    readonly container = new Container();

    /** Maximum number of track points per entity trail */
    public maxTrackPoints = 100;

    update(state: MapViewState, viewScale: number, _visibleWorldBounds?: Rectangle) {
        this.container.removeChildren();

        if (!state.tracks || state.tracks.length === 0) return;

        for (const track of state.tracks) {
            if (track.points.length < 2) continue;

            this.renderTrack(track, viewScale, state);
        }
    }

    private renderTrack(track: MapTrack, viewScale: number, state: MapViewState) {
        const points = track.points.slice(-this.maxTrackPoints);
        if (points.length < 2) return;

        // Find the entity to determine its side color
        const entity = state.units.find(u => u.id === track.entityId);
        const baseColor = entity?.side === 'Blue' ? 0x00bcd4 : 0xff9800;

        const line = new Graphics();

        // Draw trail from oldest to newest with fading alpha
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];

            // Alpha fades for older points
            const age = i / points.length;
            const alpha = 0.1 + (age * 0.5);

            line.moveTo(prev.x, -prev.y);
            line.lineTo(curr.x, -curr.y);
            line.stroke({ width: 1.5 / viewScale, color: baseColor, alpha });
        }

        this.container.addChild(line);

        // Track dots at intervals
        const dotInterval = Math.max(1, Math.floor(points.length / 10));
        for (let i = 0; i < points.length; i += dotInterval) {
            const point = points[i];
            const age = i / points.length;
            const alpha = 0.2 + (age * 0.6);

            const dot = new Graphics();
            dot.circle(point.x, -point.y, 2 / viewScale);
            dot.fill({ color: baseColor, alpha });
            this.container.addChild(dot);
        }
    }

    destroy() {
        this.container.removeChildren();
    }
}
