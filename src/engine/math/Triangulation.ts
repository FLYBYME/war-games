import { Vector3 } from '../core/Types.js';
import { VectorMath } from './VectorMath.js';
import { Physics } from '../PhysicsConstants.js';

export interface TriangulationResult {
    position: Vector3;
    cepM: number;
}

/**
 * Triangulation: Math utility for intersecting Lines of Bearing (LOB).
 */
export class Triangulation {
    /**
     * resolvePosition: Takes multiple bearings and resolves an estimated 2D position.
     * Uses a least-squares approach for N >= 2 bearings.
     */
    public static resolvePosition(bearings: { pos: Vector3, bearingDeg: number }[]): TriangulationResult | undefined {
        if (bearings.length < 2) return undefined;

        // For V3, we'll use a simplified 2D intersection.
        // If N=2, simple intersection.
        // If N > 2, we should ideally use a weighted least squares, 
        // but for now we'll average the pairwise intersections to keep it robust.

        const intersections: Vector3[] = [];

        for (let i = 0; i < bearings.length; i++) {
            for (let j = i + 1; j < bearings.length; j++) {
                const intersect = this.intersectLines(bearings[i], bearings[j]);
                if (intersect) intersections.push(intersect);
            }
        }

        if (intersections.length === 0) return undefined;

        // Average intersections
        const avgPos: Vector3 = { x: 0, y: 0, z: 0 };
        for (const p of intersections) {
            avgPos.x += p.x;
            avgPos.y += p.y;
            avgPos.z += p.z;
        }
        avgPos.x /= intersections.length;
        avgPos.y /= intersections.length;
        avgPos.z /= intersections.length;

        // Calculate CEP based on spread of intersections
        let maxDistSq = 0;
        for (const p of intersections) {
            const dSq = VectorMath.distanceSq(p, avgPos);
            if (dSq > maxDistSq) maxDistSq = dSq;
        }

        // Base CEP is the spread, plus a minimum floor
        const cepM = Math.max(500, Math.sqrt(maxDistSq));

        return { position: avgPos, cepM };
    }

    /**
     * intersectLines: 2D Line-Line intersection.
     */
    private static intersectLines(
        a: { pos: Vector3, bearingDeg: number },
        b: { pos: Vector3, bearingDeg: number }
    ): Vector3 | undefined {
        const radA = a.bearingDeg * Physics.DEG_TO_RAD;
        const radB = b.bearingDeg * Physics.DEG_TO_RAD;

        const dirA = { x: Math.sin(radA), y: Math.cos(radA) };
        const dirB = { x: Math.sin(radB), y: Math.cos(radB) };

        // 2D line intersection: P1 + t*D1 = P2 + u*D2
        // t*D1x - u*D2x = P2x - P1x
        // t*D1y - u*D2y = P2y - P1y

        const det = (-dirA.x * dirB.y) + (dirA.y * dirB.x);
        if (Math.abs(det) < 0.001) return undefined; // Parallel

        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;

        const t = ((-dx * dirB.y) + (dy * dirB.x)) / det;
        
        if (t < 0) return undefined; // Behind observer A

        return {
            x: a.pos.x + t * dirA.x,
            y: a.pos.y + t * dirA.y,
            z: (a.pos.z + b.pos.z) / 2 // Average altitude for now
        };
    }
}
