import { Vector3 } from '../core/Types.js';
import { VectorMath } from './VectorMath.js';
import { Physics } from '../PhysicsConstants.js';

export interface FireSolution {
    aimPoint: Vector3;
    tof: number;
    elevationDeg: number;
    azimuthDeg: number;
}

/**
 * FireControl: Utility for calculating predictive lead and ballistic solutions.
 */
export class FireControl {
    /**
     * calculateBallisticSolution: Solve for unguided shell trajectory.
     */
    public static calculateBallisticSolution(
        shooterPos: Vector3,
        shooterVel: Vector3,
        targetPos: Vector3,
        targetVel: Vector3,
        muzzleSpeedMps: number
    ): FireSolution | undefined {
        const D = VectorMath.subtract(targetPos, shooterPos);
        const Vr = VectorMath.subtract(targetVel, shooterVel);

        // Solve quadratic: (Vw^2 - |Vr|^2)t^2 - 2(D.Vr)t - |D|^2 = 0
        const a = muzzleSpeedMps * muzzleSpeedMps - VectorMath.dot(Vr, Vr);
        const b = -2 * VectorMath.dot(D, Vr);
        const c = -VectorMath.dot(D, D);

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return undefined;

        const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t = Math.max(t1, t2);

        if (t <= 0) return undefined;

        // Future Position
        const futurePos = VectorMath.add(targetPos, VectorMath.multiplyScalar(targetVel, t));
        
        // Gravity Compensation
        // Drop = 0.5 * g * t^2
        const drop = 0.5 * Physics.GRAVITY_G * t * t;
        const adjustedAimPoint = {
            x: futurePos.x,
            y: futurePos.y,
            z: futurePos.z + drop
        };

        const vToAim = VectorMath.subtract(adjustedAimPoint, shooterPos);
        const azimuth = (Math.atan2(vToAim.y, vToAim.x) * Physics.RAD_TO_DEG + 360) % 360;
        
        const horizontalDist = Math.sqrt(vToAim.x * vToAim.x + vToAim.y * vToAim.y);
        const elevation = Math.atan2(vToAim.z, horizontalDist) * Physics.RAD_TO_DEG;

        return {
            aimPoint: adjustedAimPoint,
            tof: t,
            elevationDeg: elevation,
            azimuthDeg: azimuth
        };
    }

    /**
     * calculateAdvancedBallisticSolution: Solve for unguided shell trajectory accounting for drag and wind.
     * Uses an iterative numerical solver.
     */
    public static calculateAdvancedBallisticSolution(
        shooterPos: Vector3,
        shooterVel: Vector3,
        targetPos: Vector3,
        targetVel: Vector3,
        muzzleSpeedMps: number,
        projectileMassKg: number,
        projectileDragCoeff: number,
        projectileCaliberMm: number,
        windVelocity: Vector3,
        airDensity: number = 1.225
    ): FireSolution | undefined {
        // 1. Initial Guess (Vacuum Solution)
        const initialSolution = this.calculateBallisticSolution(shooterPos, shooterVel, targetPos, targetVel, muzzleSpeedMps);
        if (!initialSolution) return undefined;

        const tof = initialSolution.tof;
        let aimPoint = initialSolution.aimPoint;
        let finalElevation = initialSolution.elevationDeg;
        let finalAzimuth = initialSolution.azimuthDeg;

        const area = Math.PI * Math.pow((projectileCaliberMm / 1000) / 2, 2);
        const dt = 0.1; // Simulation step

        // 2. Iterative Correction
        for (let iter = 0; iter < 5; iter++) {
            // Calculate initial world velocity from current aim guess
            const vToAim = VectorMath.subtract(aimPoint, shooterPos);
            const initialMuzzleDir = VectorMath.normalize(vToAim);
            let currentVel = VectorMath.add(shooterVel, VectorMath.multiplyScalar(initialMuzzleDir, muzzleSpeedMps));
            let currentPos = { ...shooterPos };

            // Simulate trajectory
            for (let t = 0; t < tof; t += dt) {
                const airspeed = VectorMath.subtract(currentVel, windVelocity);
                const speed = VectorMath.magnitude(airspeed);
                
                if (speed > 0.1) {
                    const dragMag = 0.5 * airDensity * speed * speed * projectileDragCoeff * area;
                    const dragAccel = VectorMath.multiplyScalar(VectorMath.normalize(airspeed), -dragMag / projectileMassKg);
                    const gravityAccel = { x: 0, y: 0, z: -Physics.GRAVITY_G };
                    const totalAccel = VectorMath.add(dragAccel, gravityAccel);
                    
                    currentVel = VectorMath.add(currentVel, VectorMath.multiplyScalar(totalAccel, dt));
                }
                currentPos = VectorMath.add(currentPos, VectorMath.multiplyScalar(currentVel, dt));
            }

            // 3. Compare with desired future position
            const desiredFuturePos = VectorMath.add(targetPos, VectorMath.multiplyScalar(targetVel, tof));
            const error = VectorMath.subtract(desiredFuturePos, currentPos);
            
            if (VectorMath.magnitude(error) < 1.0) break; // Close enough

            // Adjust aim point to compensate for error
            aimPoint = VectorMath.add(aimPoint, error);

            // Re-calculate elevation/azimuth from adjusted aim point
            const adjustedVToAim = VectorMath.subtract(aimPoint, shooterPos);
            finalAzimuth = (Math.atan2(adjustedVToAim.y, adjustedVToAim.x) * Physics.RAD_TO_DEG + 360) % 360;
            const horizontalDist = Math.sqrt(adjustedVToAim.x * adjustedVToAim.x + adjustedVToAim.y * adjustedVToAim.y);
            finalElevation = Math.atan2(adjustedVToAim.z, horizontalDist) * Physics.RAD_TO_DEG;
        }

        return {
            aimPoint,
            tof,
            elevationDeg: finalElevation,
            azimuthDeg: finalAzimuth
        };
    }
}
