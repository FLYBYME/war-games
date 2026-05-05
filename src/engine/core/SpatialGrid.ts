import { EntityId, Vector3 } from './Types.js';

/**
 * SpatialGrid: Efficient 3D spatial partitioning for global proximity queries.
 * Optimized for Earth-Centered Earth-Fixed (ECEF) or large-scale local coordinates.
 */
export class SpatialGrid {
    private readonly cells = new Map<string, Set<EntityId>>();
    private readonly entityPositions = new Map<EntityId, string>();

    constructor(private readonly cellSize: number = 10000) {} // Default 10km cells

    public updateEntity(id: EntityId, pos: Vector3): void {
        const cellKey = this.getCellKey(pos);
        const oldKey = this.entityPositions.get(id);

        if (cellKey === oldKey) return;

        if (oldKey) {
            this.cells.get(oldKey)?.delete(id);
        }

        if (!this.cells.has(cellKey)) {
            this.cells.set(cellKey, new Set());
        }

        this.cells.get(cellKey)!.add(id);
        this.entityPositions.set(id, cellKey);
    }

    public removeEntity(id: EntityId): void {
        const key = this.entityPositions.get(id);
        if (key) {
            this.cells.get(key)?.delete(id);
            this.entityPositions.delete(id);
        }
    }

    public getNearbyEntities(pos: Vector3, radiusMeters: number): EntityId[] {
        const nearby: EntityId[] = [];
        const startX = Math.floor((pos.x - radiusMeters) / this.cellSize);
        const endX = Math.floor((pos.x + radiusMeters) / this.cellSize);
        const startY = Math.floor((pos.y - radiusMeters) / this.cellSize);
        const endY = Math.floor((pos.y + radiusMeters) / this.cellSize);
        const startZ = Math.floor((pos.z - radiusMeters) / this.cellSize);
        const endZ = Math.floor((pos.z + radiusMeters) / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                for (let z = startZ; z <= endZ; z++) {
                    const key = `${x},${y},${z}`;
                    const cell = this.cells.get(key);
                    if (cell) {
                        nearby.push(...cell);
                    }
                }
            }
        }

        return nearby;
    }

    private getCellKey(pos: Vector3): string {
        const cx = Math.floor(pos.x / this.cellSize);
        const cy = Math.floor(pos.y / this.cellSize);
        const cz = Math.floor(pos.z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }
}
