import { EntityId, Vector3 } from './Types.js';

interface OctreeNode {
    bounds: { min: Vector3, max: Vector3 };
    entities: EntityId[];
    children: OctreeNode[] | null;
}

/**
 * Octree: Professional-grade 3D spatial partitioning for global scales.
 * Optimized for Earth-Centered Earth-Fixed (ECEF) coordinates.
 * This replaces the SpatialGrid to handle entities across the entire planet efficiently.
 */
export class Octree {
    private root: OctreeNode;
    private entityMap = new Map<EntityId, Vector3>();
    private readonly MAX_ENTITIES = 10;
    private readonly MAX_DEPTH = 8;

    constructor(size: number = 20000000) { // Large enough to cover Earth (20,000km)
        this.root = this.createNode(
            { x: -size / 2, y: -size / 2, z: -size / 2 },
            { x: size / 2, y: size / 2, z: size / 2 }
        );
    }

    private createNode(min: Vector3, max: Vector3): OctreeNode {
        return { bounds: { min, max }, entities: [], children: null };
    }

    public updateEntity(id: EntityId, pos: Vector3): void {
        this.removeEntity(id);
        const posCopy = { x: pos.x, y: pos.y, z: pos.z };
        this.entityMap.set(id, posCopy);
        this.insert(this.root, id, posCopy, 0);
    }

    public removeEntity(id: EntityId): void {
        const pos = this.entityMap.get(id);
        if (pos) {
            this.remove(this.root, id, pos);
        }
        // Always delete from map, even if tree removal fails (it will be cleaned up on next subdivision)
        this.entityMap.delete(id);
    }

    private insert(node: OctreeNode, id: EntityId, pos: Vector3, depth: number): void {
        if (node.children) {
            const index = this.getOctantIndex(node.bounds, pos);
            this.insert(node.children[index], id, pos, depth + 1);
            return;
        }

        node.entities.push(id);

        if (node.entities.length > this.MAX_ENTITIES && depth < this.MAX_DEPTH) {
            this.subdivide(node);
            const entities = [...node.entities];
            node.entities = [];
            for (const eid of entities) {
                const epos = this.entityMap.get(eid);
                if (!epos || typeof epos.x !== 'number') {
                    // This was a "zombie" entity that was in the tree but missing from the map.
                    // By not re-inserting it, we effectively clean it up.
                    continue; 
                }
                const index = this.getOctantIndex(node.bounds, epos);
                this.insert(node.children![index], eid, epos, depth + 1);
            }
        }
    }

    private remove(node: OctreeNode, id: EntityId, pos: Vector3): void {
        if (node.children) {
            const index = this.getOctantIndex(node.bounds, pos);
            this.remove(node.children[index], id, pos);
            return;
        }
        const index = node.entities.indexOf(id);
        if (index !== -1) {
            node.entities.splice(index, 1);
        }
    }

    public getNearbyEntities(pos: Vector3, radius: number): EntityId[] {
        const result: EntityId[] = [];
        this.query(this.root, pos, radius, result);
        return result;
    }

    private query(node: OctreeNode, pos: Vector3, radius: number, result: EntityId[]): void {
        if (!this.intersects(node.bounds, pos, radius)) return;

        if (node.children) {
            for (const child of node.children) {
                this.query(child, pos, radius, result);
            }
            return;
        }

        for (const eid of node.entities) {
            const epos = this.entityMap.get(eid);
            if (epos) {
                const dx = epos.x - pos.x;
                const dy = epos.y - pos.y;
                const dz = epos.z - pos.z;
                if (dx * dx + dy * dy + dz * dz <= radius * radius) {
                    result.push(eid);
                }
            }
        }
    }

    private getOctantIndex(bounds: { min: Vector3, max: Vector3 }, pos: Vector3): number {
        if (!pos || typeof pos.x !== 'number') {
            // Safety fallback: if pos is malformed, return first octant
            return 0;
        }
        const midX = (bounds.min.x + bounds.max.x) / 2;
        const midY = (bounds.min.y + bounds.max.y) / 2;
        const midZ = (bounds.min.z + bounds.max.z) / 2;

        let index = 0;
        if (pos.x >= midX) index |= 1;
        if (pos.y >= midY) index |= 2;
        if (pos.z >= midZ) index |= 4;
        return index;
    }

    private subdivide(node: OctreeNode): void {
        const midX = (node.bounds.min.x + node.bounds.max.x) / 2;
        const midY = (node.bounds.min.y + node.bounds.max.y) / 2;
        const midZ = (node.bounds.min.z + node.bounds.max.z) / 2;

        node.children = [];
        for (let i = 0; i < 8; i++) {
            const min = {
                x: (i & 1) ? midX : node.bounds.min.x,
                y: (i & 2) ? midY : node.bounds.min.y,
                z: (i & 4) ? midZ : node.bounds.min.z
            };
            const max = {
                x: (i & 1) ? node.bounds.max.x : midX,
                y: (i & 2) ? node.bounds.max.y : midY,
                z: (i & 4) ? node.bounds.max.z : midZ
            };
            node.children.push(this.createNode(min, max));
        }
    }

    private intersects(bounds: { min: Vector3, max: Vector3 }, pos: Vector3, radius: number): boolean {
        const x = Math.max(bounds.min.x, Math.min(pos.x, bounds.max.x));
        const y = Math.max(bounds.min.y, Math.min(pos.y, bounds.max.y));
        const z = Math.max(bounds.min.z, Math.min(pos.z, bounds.max.z));
        const distSq = (x - pos.x) ** 2 + (y - pos.y) ** 2 + (z - pos.z) ** 2;
        return distSq <= radius * radius;
    }
}
