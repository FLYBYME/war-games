import { Vector3 } from '../core/Types.js';
import { TerrainOracle } from '../environment/TerrainOracle.js';
import { GeoProjection } from './GeoProjection.js';

export interface PathNode {
    pos: Vector3;
    g: number;
    h: number;
    f: number;
    parent?: PathNode;
}

/**
 * Pathfinder: Implements A* for tactical navigation.
 */
export class Pathfinder {
    constructor(
        private terrain: TerrainOracle,
        private projection: GeoProjection
    ) {}

    /**
     * findPath: Finds a path between two points using A* search.
     * @param start Starting position (meters)
     * @param end Target position (meters)
     * @param minAltitude Minimum altitude above terrain (negative for depth)
     */
    public async findPath(start: Vector3, end: Vector3, minAltitude: number = 100): Promise<Vector3[]> {
        const stepSize = 5000; 
        const maxNodes = 200;
        
        const openList: PathNode[] = [];
        const closedList = new Set<string>();

        const startNode: PathNode = {
            pos: { ...start },
            g: 0,
            h: this.distance(start, end),
            f: 0
        };
        startNode.f = startNode.h;
        openList.push(startNode);

        let bestNode = startNode;

        while (openList.length > 0 && closedList.size < maxNodes) {
            // 1. Get node with lowest f
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift()!;
            
            const key = this.posKey(current.pos);
            if (closedList.has(key)) continue;
            closedList.add(key);

            // 2. Check if we reached target
            if (this.distance(current.pos, end) < stepSize * 1.5) {
                bestNode = current;
                break;
            }

            if (current.f < bestNode.f) bestNode = current;

            // 3. Generate neighbors
            const neighbors = await this.getNeighbors(current, end, stepSize, minAltitude);
            for (const neighbor of neighbors) {
                const neighborKey = this.posKey(neighbor.pos);
                if (closedList.has(neighborKey)) continue;
                
                openList.push(neighbor);
            }
        }

        // 4. Reconstruct path
        const path: Vector3[] = [];
        let curr: PathNode | undefined = bestNode;
        while (curr) {
            path.unshift(curr.pos);
            curr = curr.parent;
        }

        if (path.length > 0) {
            path[0] = { ...start };
            path.push({ ...end });
        }

        return path;
    }

    private posKey(p: Vector3): string {
        const grid = 2500; 
        return `${Math.round(p.x/grid)},${Math.round(p.y/grid)},${Math.round(p.z/grid)}`;
    }

    private async getNeighbors(parent: PathNode, target: Vector3, step: number, minAlt: number): Promise<PathNode[]> {
        const neighbors: PathNode[] = [];
        const angles = [0, 45, -45, 90, -90, 135, -135, 180];
        
        const dirToTarget = this.normalize(this.subtract(target, parent.pos));
        const baseAngle = Math.atan2(dirToTarget.y, dirToTarget.x);

        for (const angle of angles) {
            const rad = baseAngle + angle * (Math.PI / 180);
            const candidate: Vector3 = {
                x: parent.pos.x + Math.cos(rad) * step,
                y: parent.pos.y + Math.sin(rad) * step,
                z: parent.pos.z
            };

            const geo = this.projection.project(candidate);
            const elevation = await this.terrain.getElevation(geo.lat, geo.lon);
            const isBlocked = minAlt > 0 ? (candidate.z < elevation + minAlt) : (elevation > 0);
            
            if (!isBlocked) {
                const g = parent.g + step;
                const h = this.distance(candidate, target);
                neighbors.push({
                    pos: candidate,
                    g,
                    h,
                    f: g + h,
                    parent
                });
            }
        }
        return neighbors;
    }

    private distance(a: Vector3, b: Vector3): number {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    }

    private subtract(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    private add(a: Vector3, b: Vector3): Vector3 {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    }

    private multiply(a: Vector3, s: number): Vector3 {
        return { x: a.x * s, y: a.y * s, z: a.z * s };
    }

    private normalize(a: Vector3): Vector3 {
        const d = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        return d === 0 ? a : this.multiply(a, 1 / d);
    }
}
