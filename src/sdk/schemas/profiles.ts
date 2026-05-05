import { z } from 'zod';
import { SensorTypeSchema, EMBandSchema } from './domain.js';

// 1. Expanded Kinematics & Aero
export const AeroProfileSchema = z.object({
    wingspanM: z.number().optional(),
    wingAreaS: z.number().optional(),
    dragCoeffCd: z.number().optional(),
    liftCoeffCl: z.number().optional(),
    inducedDragFactor: z.number().optional(),
    maxG: z.number().optional(),
});

export const PropulsionProfileSchema = z.object({
    maxThrustDryN: z.number().optional(),
    maxThrustAbN: z.number().optional(),
    sfcDry: z.number().optional(),
    sfcAb: z.number().optional(),
    spoolRate: z.number().optional(),
    abThreshold: z.number().optional(),
    fuelCapacityKg: z.number().optional(),
});

export const FuelProfileSchema = z.object({
    maxKg: z.number(),
    burnRateIdleKgHr: z.number().optional(),
});

export const AviationProfileSchema = z.object({
    hangarCapacity: z.number().optional(),
    aviationFuelKg: z.number().optional(),
});

export const KinematicsProfileSchema = z.object({
    massEmptyKg: z.number().optional().describe('Empty weight of the platform in Kilograms.'),
    massKg: z.number().optional().describe('Legacy compatibility.'),
    massMaxTakeoffKg: z.number().optional().describe('Maximum takeoff weight in Kilograms.'),
    maxSpeedKts: z.number().optional().describe('Maximum speed in Knots.'),
    cruiseSpeedKts: z.number().optional().describe('Cruise speed in Knots.'),
    maxAltitudeM: z.number().optional().describe('Maximum operational altitude in Meters.'),
    dragCoeff: z.number().optional().describe('Legacy compatibility.')
});

// 2. Expanded Signatures
export const SignatureProfileSchema = z.object({
    baseRCS: z.number().optional().describe('Radar Cross Section in square meters. Stealth is < 0.1, Fighters ~5, Ships > 1000.'),
    acousticSL: z.number().optional().describe('Acoustic Source Level in dB. Null for aircraft.')
});

// 3. Expanded Sensors & EW
export const SensorProfileSchema = z.object({
    name: z.string().optional().describe('Historical name of the sensor, e.g., AN/APG-68'),
    type: SensorTypeSchema.describe('Type of sensor.'),
    band: EMBandSchema.optional(),
    maxRangeM: z.number().describe('Maximum detection range in Meters.'),
    txPowerKw: z.number().optional().describe('Transmit power in Kilowatts. Null for passive sensors.'),
    frequencyMhz: z.number().optional().describe('Operating frequency in Megahertz.'),
    processingGainDb: z.number().optional().describe('Signal processing gain in Decibels.')
});

// 4. Combat & Weapons
export const MagazineProfileSchema = z.object({
    name: z.string().optional().describe('Descriptive name of the magazine, e.g., VLS Cell 1-8'),
    capacity: z.number().describe('Total rounds or units in this magazine.'),
    weaponProfileId: z.string().describe('ID of the weapon profile this magazine holds.')
});

export const MountProfileSchema = z.object({
    name: z.string().optional(),
    arcs: z.array(z.number()).length(2).describe('Firing arcs in degrees [min, max], e.g., [-90, 90].'),
    slewRate: z.number().describe('Degrees per second the mount can rotate.'),
    reloadTicks: z.number().describe('Ticks required to reload from magazine.'),
    magazineIndices: z.array(z.number()).describe('Indices of magazines this mount can draw from.'),
    alignmentThresholdDeg: z.number().optional().describe('Alignment tolerance in degrees required to fire.')
});

export const CombatProfileSchema = z.object({
    mounts: z.array(MountProfileSchema).optional(),
    magazines: z.array(MagazineProfileSchema).optional()
});

export const WeaponStageSchema = z.object({
    name: z.string(),
    durationTicks: z.number(),
    thrustN: z.number(),
    burnTimeS: z.number().optional(),
    guidanceMode: z.string().optional(),
    separateOnComplete: z.boolean().default(false)
});

// 5. Health & Damage
export const SubsystemProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    maxHp: z.number()
});

export const HealthProfileSchema = z.object({
    maxHp: z.number(),
    subsystems: z.array(SubsystemProfileSchema).optional()
});

export enum GuidanceType {
    Active = 'Active',           // Fire and forget (Radar)
    SemiActive = 'SemiActive',   // Requires illumination (SARH)
    Command = 'Command',         // Remote guidance from launcher
    Passive = 'Passive',         // IR/Home-on-jam
    Ballistic = 'Ballistic'      // Unguided
}
export const GuidanceTypeSchema = z.nativeEnum(GuidanceType);

export enum WarheadType {
    BlastFragmentation = 'BlastFrag',
    Kinetic = 'Kinetic',
    ContinuousRod = 'ContinuousRod',
    ArmorPiercing = 'AP',
    Nuclear = 'Nuclear'
}
export const WarheadTypeSchema = z.nativeEnum(WarheadType);

export const WeaponProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['Missile', 'Torpedo', 'Gun', 'Bomb']),

    // Performance
    maxRangeM: z.number(),
    minRangeM: z.number().optional().default(0),
    maxSpeedKts: z.number(),
    cruiseSpeedKts: z.number(),

    // Guidance
    guidance: GuidanceTypeSchema.optional().default(GuidanceType.Ballistic),
    requiresIllumination: z.boolean().optional().default(false),

    // Lethality
    pk: z.number().min(0).max(1.0).optional().default(0.8),
    warheadYieldKg: z.number().optional(),
    warheadType: WarheadTypeSchema.optional().default(WarheadType.BlastFragmentation),

    // Aerodynamic Modifiers (Simple placeholder for envelopes)
    altitudeRmaxBonus: z.number().optional().default(0).describe('Additional meters of range per meter of altitude.'),

    // Engine Integration
    entityProfileId: z.string().optional().describe('Link to EntityProfile if this weapon spawns a physical entity.'),
    burst: z.object({
        muzzleVelocity: z.object({ x: z.number(), y: z.number(), z: z.number() }),
        roundsPerSecond: z.number(),
        dispersionDeg: z.number(),
        caliberMm: z.number().optional()
    }).optional()
});

export const BurstProfileSchema = z.object({
    muzzleVelocity: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    roundsPerSecond: z.number(),
    dispersionDeg: z.number(),
    caliberMm: z.number().optional()
});

// 6. The Master Profile
export const EntityProfileSchema = z.object({
    platformClass: z.string().optional().describe('The general class, e.g., F-16 Fighting Falcon'),
    variantName: z.string().optional().describe('The specific variant, e.g., F-16C Block 50'),
    type: z.enum(['Aircraft', 'Helicopter', 'Ship', 'Submarine', 'Facility', 'Weapon', 'Mine']).optional(),
    kinematics: KinematicsProfileSchema.optional(),
    aero: AeroProfileSchema.optional(),
    propulsion: PropulsionProfileSchema.optional(),
    fuel: FuelProfileSchema.optional(),
    signatures: SignatureProfileSchema.optional(),
    sensors: z.array(SensorProfileSchema).optional(),
    health: HealthProfileSchema.optional(),
    combat: CombatProfileSchema.optional(),
    aviation: AviationProfileSchema.optional(),
    burst: BurstProfileSchema.optional(),
    stages: z.array(WeaponStageSchema).optional(),
    entityProfileId: z.string().optional().describe('Link to another EntityProfile if this entity spawns or transforms into another.')
});

export type EntityProfile = z.infer<typeof EntityProfileSchema>;
export type SensorProfile = z.infer<typeof SensorProfileSchema>;
export type MountProfile = z.infer<typeof MountProfileSchema>;
export type WeaponProfile = z.infer<typeof WeaponProfileSchema>;
export type HealthProfile = z.infer<typeof HealthProfileSchema>;
export type CombatProfile = z.infer<typeof CombatProfileSchema>;
export type AeroProfile = z.infer<typeof AeroProfileSchema>;
export type PropulsionProfile = z.infer<typeof PropulsionProfileSchema>;
export type FuelProfile = z.infer<typeof FuelProfileSchema>;
export type SignatureProfile = z.infer<typeof SignatureProfileSchema>;
export type KinematicsProfile = z.infer<typeof KinematicsProfileSchema>;
export type AviationProfile = z.infer<typeof AviationProfileSchema>;
export type BurstProfile = z.infer<typeof BurstProfileSchema>;
export type WeaponStage = z.infer<typeof WeaponStageSchema>;
export type MagazineProfile = z.infer<typeof MagazineProfileSchema>;
