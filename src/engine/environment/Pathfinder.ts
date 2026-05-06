import { Vector3, Side } from '../core/Types.js';
import { TerrainOracle } from './TerrainOracle.js';
import { GeoProjection } from '../math/GeoProjection.js';
import { ThreatMapSystem } from '../systems/ThreatMapSystem.js';

export interface PathNode {
    pos: Vector3;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent?: PathNode;
}

/**
 * AStarPathfinder: Calculates optimal paths across terrain and threat zones.
 */
export class AStarPathfinder {
    constructor(
        private terrain: TerrainOracle,
        private projection: GeoProjection,
        private threatMap?: ThreatMapSystem
    ) {}

    public async findPath(start: Vector3, end: Vector3, constraints: { side: Side, avoidsThreats: boolean }): Promise<Vector3[]> {
        // Simplified grid-based A* for simulation scale
        const step = 2000; // 2km resolution
        const openSet: PathNode[] = [];
        const closedSet = new Set<string>();

        const startNode: PathNode = { pos: start, g: 0, h: this.heuristic(start, end), f: 0 };
        startNode.f = startNode.h;
        openSet.push(startNode);

        let iterations = 0;
        const maxIterations = 500;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;
            
            const key = `${Math.round(current.pos.x / step)},${Math.round(current.pos.y / step)}`;
            if (closedSet.has(key)) continue;
            closedSet.add(key);

            if (this.distance(current.pos, end) < step * 1.5) {
                return this.reconstructPath(current, end);
            }

            const neighbors = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 }
            ];

            for (const n of neighbors) {
                const nx = current.pos.x + n.dx * step;
                const ny = current.pos.y + n.dy * step;
                const nz = current.pos.z;

                const neighborPos = { x: nx, y: ny, z: nz };
                
                // Terrain Check
                const geo = this.projection.project(neighborPos);
                const terrainHeight = await this.terrain.getElevation(geo.lat, geo.lon);
                if (nz < terrainHeight + 100) continue; // Terrain collision


                // Threat Penalty
                let threatCost = 0;
                if (constraints.avoidsThreats && this.threatMap) {
                    const threatIntensity = this.threatMap.getThreatAt(neighborPos, constraints.side);
                    threatCost = threatIntensity * step * 10; 
                }

                const gScore = current.g + step * (n.dx !== 0 && n.dy !== 0 ? 1.414 : 1) + threatCost;
                const hScore = this.heuristic(neighborPos, end);
                
                const neighborNode: PathNode = {
                    pos: neighborPos,
                    g: gScore,
                    h: hScore,
                    f: gScore + hScore,
                    parent: current
                };

                openSet.push(neighborNode);
            }
        }

        return [start, end];
    }

    private heuristic(a: Vector3, b: Vector3): number {
        return this.distance(a, b);
    }

    private distance(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private reconstructPath(node: PathNode, end: Vector3): Vector3[] {
        const path = [end];
        let curr: PathNode | undefined = node;
        while (curr) {
            path.unshift(curr.pos);
            curr = curr.parent;
        }
        return path;
    }
}
