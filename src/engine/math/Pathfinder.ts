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
 * PriorityQueue: Simple binary heap for A* nodes.
 */
class PriorityQueue<T> {
    private heap: { priority: number, item: T }[] = [];
    push(item: T, priority: number) {
        this.heap.push({ priority, item });
        this.bubbleUp();
    }
    pop(): T | undefined {
        if (this.size() === 0) return undefined;
        const top = this.heap[0].item;
        const bottom = this.heap.pop()!;
        if (this.size() > 0) {
            this.heap[0] = bottom;
            this.bubbleDown();
        }
        return top;
    }
    size() { return this.heap.length; }
    private bubbleUp() {
        let index = this.heap.length - 1;
        while (index > 0) {
            let parentIndex = (index - 1) >> 1;
            if (this.heap[index].priority >= this.heap[parentIndex].priority) break;
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }
    private bubbleDown() {
        let index = 0;
        while (true) {
            let left = (index << 1) + 1;
            let right = (index << 1) + 2;
            let smallest = index;
            if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
            if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
            if (smallest === index) break;
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}

/**
 * Pathfinder: Implements A* for tactical navigation.
 */
export class Pathfinder {
    constructor(
        private terrain: TerrainOracle,
        private projection: GeoProjection
    ) {}

    public async findPath(start: Vector3, end: Vector3, minAltitude: number = 100): Promise<Vector3[]> {
        const stepSize = 5000; 
        const maxNodes = 500;
        
        const openList = new PriorityQueue<PathNode>();
        const closedList = new Map<string, number>();

        const startNode: PathNode = {
            pos: { ...start },
            g: 0,
            h: this.distance(start, end),
            f: 0
        };
        startNode.f = startNode.h;
        openList.push(startNode, startNode.f);

        let bestNode = startNode;

        while (openList.size() > 0 && closedList.size < maxNodes) {
            const current = openList.pop()!;
            
            const key = this.posKey(current.pos);
            if (closedList.has(key) && closedList.get(key)! <= current.g) continue;
            closedList.set(key, current.g);

            if (this.distance(current.pos, end) < stepSize * 1.5) {
                bestNode = current;
                break;
            }

            if (current.f < bestNode.f) bestNode = current;

            // Generate neighbors
            const neighbors = await this.getNeighbors(current, end, stepSize, minAltitude);
            for (const neighbor of neighbors) {
                const neighborKey = this.posKey(neighbor.pos);
                if (closedList.has(neighborKey) && closedList.get(neighborKey)! <= neighbor.g) continue;
                
                openList.push(neighbor, neighbor.f);
            }
        }

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
        
        const vToTarget = this.subtract(target, parent.pos);
        const baseAngle = Math.atan2(vToTarget.y, vToTarget.x);

        for (const angle of angles) {
            const rad = baseAngle + angle * (Math.PI / 180);
            const candidate: Vector3 = {
                x: parent.pos.x + Math.cos(rad) * step,
                y: parent.pos.y + Math.sin(rad) * step,
                z: parent.pos.z
            };

            const geo = this.projection.project(candidate);
            // V3 Optimized: Use getElevation (which now handles caching internally)
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
