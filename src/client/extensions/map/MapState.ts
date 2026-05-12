import { Signal } from '../../core/Signal';
import { z } from 'zod';
import { EntitySummarySchema } from '@sdk/contracts/entity/entity.contracts';
import { Vector3Schema, SideSchema } from '@sdk/contracts/domain/primitives.schema';

// ─── Type-Safe Unit ──────────────────────────────────────────────────────────

/**
 * MapUnit: The subset of entity data needed for rendering on the tactical map.
 * Projected from EntitySummary to avoid coupling the renderer to the full ECS.
 */
export const MapUnitSchema = z.object({
    id: z.string(),
    side: SideSchema,
    profileId: z.string().optional(),
    category: z.string().optional(),
    pos: Vector3Schema.describe("World-space position"),
    heading: z.number(),
    speedKts: z.number(),
    hp: z.number(),
    isDestroyed: z.boolean(),
    fuelPct: z.number(),
});

export type MapUnit = z.infer<typeof MapUnitSchema>;

/**
 * Convert an EntitySummary (from the SDK) to a MapUnit (for the renderer).
 */
export function entitySummaryToMapUnit(entity: z.infer<typeof EntitySummarySchema>): MapUnit {
    return {
        id: entity.id,
        side: entity.side,
        profileId: entity.profileId,
        category: entity.category,
        pos: entity.position,
        heading: entity.heading,
        speedKts: entity.speedKts,
        hp: entity.hp,
        isDestroyed: entity.isDestroyed,
        fuelPct: entity.fuelPct,
    };
}

// ─── Track ───────────────────────────────────────────────────────────────────

export interface MapTrack {
    entityId: string;
    points: { x: number; y: number; z: number; tick: number }[];
}

// ─── View State ──────────────────────────────────────────────────────────────

/**
 * MapViewState: The complete, type-safe view model for the tactical map.
 */
export interface MapViewState {
    origin: { lat: number; lon: number } | null;
    units: MapUnit[];
    tracks: MapTrack[];
    currentTick: number;
    timestamp: number;
}

// ─── MapState ────────────────────────────────────────────────────────────────

/**
 * MapState: Localized reactive state for the Map Extension.
 * All fields are type-safe and Zod-inferred where possible.
 */
export class MapState {
    public viewState = new Signal<MapViewState>({
        origin: { lat: 0, lon: 0 },
        units: [],
        tracks: [],
        currentTick: 0,
        timestamp: 0,
    });

    public selectedEntityId = new Signal<string | null>(null);
    public hoveredEntityId = new Signal<string | null>(null);

    // Telemetry Signals
    public pointerLatLon = new Signal<{ lat: number; lon: number } | null>(null);
    public pointerElevation = new Signal<number | null>(null);
    public mapScale = new Signal<number>(1);
    public viewportBounds = new Signal<{ x: number; y: number; width: number; height: number } | null>(null);

    private layerVisibility = new Map<string, Signal<boolean>>();

    public getLayerVisibility(layerId: string, defaultVisible = true): Signal<boolean> {
        let sig = this.layerVisibility.get(layerId);
        if (!sig) {
            sig = new Signal<boolean>(defaultVisible);
            this.layerVisibility.set(layerId, sig);
        }
        return sig;
    }

    public setLayerVisibility(layerId: string, visible: boolean): void {
        this.getLayerVisibility(layerId).set(visible);
    }
}
