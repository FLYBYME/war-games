import { EntityProfile } from '../../sdk/schemas/index.js';

/**
 * SanityValidator: Catches LLM hallucinations by verifying physical plausibility.
 */
export class SanityValidator {
    public static validate(profile: EntityProfile): string[] {
        const errors: string[] = [];

        if (!profile.kinematics) return errors;

        // 1. Weight Checks
        if (profile.kinematics.massEmptyKg && profile.kinematics.massMaxTakeoffKg) {
            if (profile.kinematics.massEmptyKg > profile.kinematics.massMaxTakeoffKg) {
                errors.push('Empty mass cannot be greater than Max Takeoff Mass.');
            }
        }

        // 2. Aircraft Specific Checks
        if (profile.type === 'Aircraft') {
            if (!profile.aero) errors.push('Aircraft must have an Aero profile.');
            if (!profile.propulsion) errors.push('Aircraft must have a Propulsion profile.');
            
            if (profile.propulsion && profile.kinematics) {
                // Thrust-to-Weight Ratio check (TWR)
                // TWR = Thrust(N) / (Mass(kg) * 9.81)
                const thrust = (profile.propulsion.maxThrustAbN || profile.propulsion.maxThrustDryN);
                const mass = (profile.kinematics.massMaxTakeoffKg || profile.kinematics.massEmptyKg || profile.kinematics.massKg);

                if (thrust && mass) {
                    const twr = thrust / (mass * 9.81);
                    
                    if (twr > 2.5) {
                        errors.push(`Suspiciously high Thrust-to-Weight ratio: ${twr.toFixed(2)}. Check units (N vs lbf).`);
                    } else if (twr < 0.05 && mass > 1000) {
                        errors.push(`Suspiciously low Thrust-to-Weight ratio: ${twr.toFixed(2)}. Aircraft might be unable to fly.`);
                    }
                }
            }

            if (profile.kinematics.maxSpeedKts && profile.kinematics.maxSpeedKts > 2500) {
                errors.push(`Speed is suspiciously high for an aircraft: ${profile.kinematics.maxSpeedKts} kts`);
            }
        }

        // 3. Sensor Checks
        if (profile.sensors) {
            for (const sensor of profile.sensors) {
                if (sensor.maxRangeM > 2000000) { // > 2000km
                    errors.push(`Sensor range suspiciously high for ${sensor.name}: ${sensor.maxRangeM}m`);
                }
            }
        }

        return errors;
    }
}
