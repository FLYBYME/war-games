import { Vector3 } from '../core/Types.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * VectorMath: Common 3D vector operations for Engine V3.
 */
export class VectorMath {
    public static add(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }

    public static subtract(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    public static multiplyScalar(v: Vector3, s: number): Vector3 {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    }

    public static distance(v1: Vector3, v2: Vector3): number {
        return Math.sqrt(this.distanceSq(v1, v2));
    }

    public static distanceSq(v1: Vector3, v2: Vector3): number {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = v1.z - v2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    public static magnitude(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    public static normalize(v: Vector3): Vector3 {
        const mag = this.magnitude(v);
        if (mag === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
    }

    public static dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    public static closestPointOnSegment(p: Vector3, a: Vector3, b: Vector3): Vector3 {
        const ab = this.subtract(b, a);
        const t = this.dot(this.subtract(p, a), ab) / this.dot(ab, ab);
        const clampedT = Math.max(0, Math.min(1, t));
        return this.add(a, this.multiplyScalar(ab, clampedT));
    }

    public static cross(v1: Vector3, v2: Vector3): Vector3 {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    /**
     * rotateEuler: Rotates a vector using Tait-Bryan angles (Yaw -> Pitch -> Roll).
     * Angles in degrees.
     */
    public static rotateEuler(v: Vector3, yaw: number, pitch: number, roll: number): Vector3 {
        const d2r = Physics.DEG_TO_RAD;
        const cy = Math.cos(yaw * d2r);
        const sy = Math.sin(yaw * d2r);
        const cp = Math.cos(pitch * d2r);
        const sp = Math.sin(pitch * d2r);
        const cr = Math.cos(roll * d2r);
        const sr = Math.sin(roll * d2r);

        // Rotation matrix elements (Z-Y-X sequence)
        const r11 = cy * cp;
        const r12 = cy * sp * sr - sy * cr;
        const r13 = cy * sp * cr + sy * sr;
        const r21 = sy * cp;
        const r22 = sy * sp * sr + cy * cr;
        const r23 = sy * sp * cr - cy * sr;
        const r31 = -sp;
        const r32 = cp * sr;
        const r33 = cp * cr;

        return {
            x: r11 * v.x + r12 * v.y + r13 * v.z,
            y: r21 * v.x + r22 * v.y + r23 * v.z,
            z: r31 * v.x + r32 * v.y + r33 * v.z
        };
    }

    /**
     * rotateEulerInverse: The inverse rotation (World to Body).
     */
    public static rotateEulerInverse(v: Vector3, yaw: number, pitch: number, roll: number): Vector3 {
        const d2r = Physics.DEG_TO_RAD;
        const cy = Math.cos(yaw * d2r);
        const sy = Math.sin(yaw * d2r);
        const cp = Math.cos(pitch * d2r);
        const sp = Math.sin(pitch * d2r);
        const cr = Math.cos(roll * d2r);
        const sr = Math.sin(roll * d2r);

        // Transpose of the Z-Y-X rotation matrix
        const r11 = cy * cp;
        const r21 = cy * sp * sr - sy * cr;
        const r31 = cy * sp * cr + sy * sr;
        const r12 = sy * cp;
        const r22 = sy * sp * sr + cy * cr;
        const r32 = sy * sp * cr - cy * sr;
        const r13 = -sp;
        const r23 = cp * sr;
        const r33 = cp * cr;

        return {
            x: r11 * v.x + r12 * v.y + r13 * v.z,
            y: r21 * v.x + r22 * v.y + r23 * v.z,
            z: r31 * v.x + r32 * v.y + r33 * v.z
        };
    }

    /**
     * isPointInPolygon: 2D point-in-polygon check (using X and Y coordinates).
     */
    public static isPointInPolygon(p: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean {
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > p.y) !== (yj > p.y)) &&
                (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) isInside = !isInside;
        }
        return isInside;
    }
}
