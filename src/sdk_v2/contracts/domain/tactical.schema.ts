import { z } from 'zod';
import { EntityIdSchema, Vector3Schema } from './primitives.schema.js';
import { SensorTypeSchema, EMBandSchema } from './sensor.schema.js';

// ─── Doctrine & ROE ──────────────────────────────────────────────────────────

/**
 * ROE: Rules of Engagement governing weapons release authority.
 */
export enum ROE {
    FREE = 'Free',
    TIGHT = 'Tight',
    HOLD = 'Hold'
}
export const ROESchema = z.nativeEnum(ROE).describe("Rules of Engagement governing weapons release authority");

/**
 * WRARule: A single Weapon Release Authority constraint.
 */
export const WRARuleSchema = z.object({
    targetType: z.string().describe("Target category, e.g. 'Fighter', 'SmallBoat'"),
    weaponType: z.string().describe("Weapon profile ID to use"),
    quantity: z.number().describe("Number of munitions per engagement"),
    maxRangePct: z.number().optional().describe("Launch at this percentage of max range"),
    minRangeM: z.number().optional().describe("Minimum engagement range in meters")
}).describe("A single Weapon Release Authority constraint");
export type WRARule = z.infer<typeof WRARuleSchema>;

// ─── Group & Formation ───────────────────────────────────────────────────────

/**
 * GroupFormation: The tactical formation type for a group of entities.
 */
export enum GroupFormation {
    None = 'None',
    LineAbreast = 'LineAbreast',
    Column = 'Column',
    Wedge = 'Wedge',
    Diamond = 'Diamond'
}
export const GroupFormationSchema = z.nativeEnum(GroupFormation).describe("Tactical formation type");

// ─── Logistics & Turnaround ──────────────────────────────────────────────────

/**
 * TurnaroundState: The turnaround/readiness phase of a platform at a facility.
 */
export enum TurnaroundState {
    None = 'None',
    Landing = 'Landing',
    Taxiing = 'Taxiing',
    Rearming = 'Rearming',
    Refueling = 'Refueling',
    Boarding = 'Boarding',
    PreFlight = 'PreFlight',
    Ready = 'Ready',
    InFlight = 'InFlight'
}
export const TurnaroundStateSchema = z.nativeEnum(TurnaroundState).describe("Platform turnaround/readiness phase");

// ─── Track & Classification ──────────────────────────────────────────────────

/**
 * TrackStatus: The lifecycle state of a sensor track.
 */
export enum TrackStatus {
    Active = 'Active',
    Coasting = 'Coasting',
    Dropped = 'Dropped'
}
export const TrackStatusSchema = z.nativeEnum(TrackStatus).describe("Lifecycle state of a sensor track");

/**
 * IdentificationStatus: The IFF classification of a track.
 */
export enum IdentificationStatus {
    UNKNOWN = 'Unknown',
    PENDING = 'Pending',
    ASSUMED_FRIENDLY = 'AssumedFriendly',
    FRIENDLY = 'Friendly',
    NEUTRAL = 'Neutral',
    SUSPECT = 'Suspect',
    HOSTILE = 'Hostile'
}
export const IdentificationStatusSchema = z.nativeEnum(IdentificationStatus).describe("IFF classification status");

/**
 * ESMBearing: A single Electronic Support Measure bearing observation.
 */
export const ESMBearingSchema = z.object({
    observerId: z.string().describe("Entity ID of the observing platform"),
    observerPos: Vector3Schema.optional().describe("Observer's position at time of observation"),
    bearingDeg: z.number().describe("Bearing to emitter in degrees"),
    confidencePct: z.number().describe("Confidence in bearing accuracy (0-100)"),
    targetId: z.string().optional().describe("If resolved, the ID of the emitting entity")
}).describe("A single ESM bearing observation");
export type ESMBearing = z.infer<typeof ESMBearingSchema>;

/**
 * Track: A fused sensor track representing a detected contact.
 */
export const TrackSchema = z.object({
    id: z.string().describe("Unique track identifier"),
    trueEntityId: z.string().describe("Ground truth entity ID (hidden from adversary)"),
    position: Vector3Schema.describe("Estimated position"),
    velocity: Vector3Schema.describe("Estimated velocity vector"),
    firstSeenTick: z.number().describe("Simulation tick when first detected"),
    lastSeenTick: z.number().describe("Simulation tick when last updated"),
    cepM: z.number().describe("Circular Error Probable in meters"),
    status: TrackStatusSchema.describe("Track lifecycle state"),
    classification: z.string().describe("e.g. 'Air-Commercial', 'Surface-Combatant'"),
    identification: IdentificationStatusSchema.describe("IFF classification"),
    confidence: z.number().min(0).max(1).describe("Classification confidence (0.0-1.0)"),
    bearings: z.array(ESMBearingSchema).optional().describe("Supporting ESM bearings for triangulation")
}).describe("Fused sensor track representing a detected contact");
export type Track = z.infer<typeof TrackSchema>;

// ─── Mission ─────────────────────────────────────────────────────────────────

/**
 * MissionType: The tactical objective type assigned to a unit.
 */
export enum MissionType {
    Patrol = 'Patrol',
    Strike = 'Strike',
    ASW = 'ASW',
    Escort = 'Escort',
    Idle = 'Idle',
    VBSS = 'VBSS',
    Minelaying = 'Minelaying',
    MCM = 'MCM',
    Intercept = 'Intercept'
}
export const MissionTypeSchema = z.nativeEnum(MissionType).describe("The tactical objective type (e.g., Patrol, Strike, ASW, Escort, Intercept, Idle)");

/**
 * MissionStatus: The execution state of a mission.
 */
export enum MissionStatus {
    Pending = 'Pending',
    Active = 'Active',
    Completed = 'Completed',
    Aborted = 'Aborted',
    Failed = 'Failed',
    Suspended = 'Suspended'
}
export const MissionStatusSchema = z.nativeEnum(MissionStatus).describe("Mission execution state");

/**
 * MissionParams: Parameters that control mission behavior.
 */
export const MissionParamsSchema = z.object({
    center: Vector3Schema.optional().describe("Center of patrol or mission area"),
    radiusM: z.number().optional().describe("Radius of mission area in meters"),
    targetId: EntityIdSchema.optional().describe("Primary target for Strike/Escort/Intercept missions"),
    searchPattern: z.string().optional().describe("Pattern type for searches"),
    area: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        points: z.array(Vector3Schema)
    }).optional().describe("Geographic constraint area"),
    allowedArea: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        points: z.array(Vector3Schema)
    }).optional().describe("VBSS/Boarding allowed area"),
    speedKts: z.number().optional().describe("Desired speed in knots for the mission"),
    boardingDurationTicks: z.number().optional().describe("Duration in ticks for VBSS boarding"),
    method: z.string().optional().describe("MCM clearing method")
}).describe("Parameters controlling mission behavior");
export type MissionParams = z.infer<typeof MissionParamsSchema>;

/**
 * Mission: A high-level tactical assignment with status and parameters.
 */
export const MissionSchema = z.object({
    type: MissionTypeSchema.describe("The tactical objective type"),
    status: MissionStatusSchema.describe("Execution status"),
    params: MissionParamsSchema.optional().describe("Mission-specific parameters")
}).describe("A high-level tactical assignment");
export type Mission = z.infer<typeof MissionSchema>;

// ─── Weapon & Guidance ───────────────────────────────────────────────────────

/**
 * GuidanceType: The terminal guidance method of a weapon.
 */
export enum GuidanceType {
    Active = 'Active',           // Fire and forget (Radar)
    SemiActive = 'SemiActive',   // Requires illumination (SARH)
    Command = 'Command',         // Remote guidance from launcher
    Passive = 'Passive',         // IR/Home-on-jam
    Ballistic = 'Ballistic'      // Unguided
}
export const GuidanceTypeSchema = z.nativeEnum(GuidanceType).describe("Terminal guidance method");

/**
 * WarheadType: The damage mechanism of a weapon's warhead.
 */
export enum WarheadType {
    BlastFragmentation = 'BlastFrag',
    Kinetic = 'Kinetic',
    ContinuousRod = 'ContinuousRod',
    ArmorPiercing = 'AP',
    Nuclear = 'Nuclear'
}
export const WarheadTypeSchema = z.nativeEnum(WarheadType).describe("Warhead damage mechanism");

// ─── Engine Component Interface ──────────────────────────────────────────────

/**
 * IComponent: The base interface that all ECS components implement.
 */
export interface IComponent {
    readonly type: string;
}

/**
 * ComponentConstructor: Generic constructor type for ECS components.
 */
export type ComponentConstructor<T extends IComponent> = new (...args: never[]) => T;

// ─── Profile Schemas ─────────────────────────────────────────────────────────

/**
 * AeroProfile: Aerodynamic characteristics for flight-capable platforms.
 */
export const AeroProfileSchema = z.object({
    wingspanM: z.number().optional().describe("Wingspan in meters"),
    wingAreaS: z.number().optional().describe("Wing reference area in square meters"),
    dragCoeffCd: z.number().optional().describe("Parasitic drag coefficient"),
    liftCoeffCl: z.number().optional().describe("Lift coefficient at cruise AoA"),
    inducedDragFactor: z.number().optional().describe("Induced drag factor (K)"),
    maxG: z.number().optional().describe("Maximum structural G-load")
}).describe("Aerodynamic profile");
export type AeroProfile = z.infer<typeof AeroProfileSchema>;

/**
 * PropulsionProfile: Engine performance characteristics.
 */
export const PropulsionProfileSchema = z.object({
    maxThrustDryN: z.number().optional().describe("Maximum dry thrust at sea level (Newtons)"),
    maxThrustAbN: z.number().optional().describe("Maximum afterburner thrust (Newtons)"),
    sfcDry: z.number().optional().describe("Specific fuel consumption in dry mode (kg/N·hr)"),
    sfcAb: z.number().optional().describe("Specific fuel consumption in afterburner (kg/N·hr)"),
    spoolRate: z.number().optional().describe("Engine spool rate (% change per second)"),
    abThreshold: z.number().optional().describe("Throttle threshold to engage afterburner (0-1)"),
    fuelCapacityKg: z.number().optional().describe("Total fuel capacity in kilograms")
}).describe("Engine performance profile");
export type PropulsionProfile = z.infer<typeof PropulsionProfileSchema>;

/**
 * FuelProfile: Fuel capacity and consumption baseline.
 */
export const FuelProfileSchema = z.object({
    maxKg: z.number().describe("Maximum fuel capacity in kilograms"),
    burnRateIdleKgHr: z.number().optional().describe("Idle burn rate in kg/hr")
}).describe("Fuel capacity profile");
export type FuelProfile = z.infer<typeof FuelProfileSchema>;

/**
 * AviationProfile: Host facility aviation characteristics.
 */
export const AviationProfileSchema = z.object({
    hangarCapacity: z.number().optional().describe("Number of aircraft the facility can host"),
    aviationFuelKg: z.number().optional().describe("Total aviation fuel available in kilograms")
}).describe("Aviation facility profile");
export type AviationProfile = z.infer<typeof AviationProfileSchema>;

/**
 * KinematicsProfile: Basic performance envelope.
 */
export const KinematicsProfileSchema = z.object({
    massEmptyKg: z.number().optional().describe("Empty weight in kilograms"),
    massKg: z.number().optional().describe("Operating weight in kilograms"),
    massMaxTakeoffKg: z.number().optional().describe("Maximum takeoff weight in kilograms"),
    maxSpeedKts: z.number().optional().describe("Maximum speed in knots"),
    cruiseSpeedKts: z.number().optional().describe("Cruise speed in knots"),
    maxAltitudeM: z.number().optional().describe("Maximum operational altitude in meters"),
    dragCoeff: z.number().optional().describe("Simplified drag coefficient"),
    turnRateDegS: z.number().optional().describe("Maximum turn rate in degrees per second")
}).describe("Basic performance envelope");
export type KinematicsProfile = z.infer<typeof KinematicsProfileSchema>;

/**
 * SignatureProfile: Observable signatures of a platform.
 */
export const SignatureProfileSchema = z.object({
    baseRCS: z.number().optional().describe("Radar Cross Section in square meters"),
    acousticSL: z.number().optional().describe("Acoustic Source Level in dB")
}).describe("Platform observable signatures");
export type SignatureProfile = z.infer<typeof SignatureProfileSchema>;

/**
 * SensorProfile: A single sensor system definition.
 */
export const SensorProfileSchema = z.object({
    name: z.string().optional().describe("Historical designation, e.g. AN/APG-68"),
    type: SensorTypeSchema.describe("Sensor modality"),
    band: EMBandSchema.optional().describe("Operating frequency band (for radar)"),
    maxRangeM: z.number().describe("Maximum detection range in meters"),
    txPowerKw: z.number().optional().describe("Transmit power in kilowatts (null for passive)"),
    frequencyMhz: z.number().optional().describe("Operating frequency in megahertz"),
    processingGainDb: z.number().optional().describe("Signal processing gain in decibels")
}).describe("Sensor system definition");
export type SensorProfile = z.infer<typeof SensorProfileSchema>;

/**
 * MagazineProfile: An ammunition storage container.
 */
export const MagazineProfileSchema = z.object({
    name: z.string().optional().describe("Magazine designation, e.g. 'VLS Cell 1-8'"),
    capacity: z.number().describe("Total rounds or units in this magazine"),
    weaponProfileId: z.string().describe("ID of the weapon profile this magazine holds")
}).describe("Ammunition storage container");
export type MagazineProfile = z.infer<typeof MagazineProfileSchema>;

/**
 * MountProfile: A weapon mount/launcher definition.
 */
export const MountProfileSchema = z.object({
    name: z.string().optional().describe("Mount designation"),
    arcs: z.array(z.number()).length(2).describe("Firing arcs in degrees [min, max]"),
    slewRate: z.number().describe("Mount rotation rate in degrees per second"),
    reloadTicks: z.number().describe("Ticks required to reload from magazine"),
    magazineIndices: z.array(z.number()).describe("Indices of magazines this mount can draw from"),
    alignmentThresholdDeg: z.number().optional().describe("Alignment tolerance in degrees required to fire")
}).describe("Weapon mount/launcher definition");
export type MountProfile = z.infer<typeof MountProfileSchema>;

/**
 * CombatProfile: Weapons and magazines configuration.
 */
export const CombatProfileSchema = z.object({
    mounts: z.array(MountProfileSchema).optional().describe("Weapon mounts"),
    magazines: z.array(MagazineProfileSchema).optional().describe("Ammunition magazines")
}).describe("Combat configuration");
export type CombatProfile = z.infer<typeof CombatProfileSchema>;

/**
 * WeaponStage: A single stage in a multi-stage weapon.
 */
export const WeaponStageSchema = z.object({
    name: z.string().describe("Stage name, e.g. 'Booster', 'Sustainer'"),
    durationTicks: z.number().describe("Duration of this stage in simulation ticks"),
    thrustN: z.number().describe("Thrust force in Newtons during this stage"),
    burnTimeS: z.number().optional().describe("Burn time in seconds"),
    guidanceMode: z.string().optional().describe("Active guidance mode during this stage"),
    separateOnComplete: z.boolean().default(false).describe("Whether the stage separates when complete")
}).describe("A single stage in a multi-stage weapon");
export type WeaponStage = z.infer<typeof WeaponStageSchema>;

/**
 * SubsystemProfile: A damageable subsystem within a platform.
 */
export const SubsystemProfileSchema = z.object({
    id: z.string().describe("Unique subsystem identifier"),
    name: z.string().describe("Human-readable subsystem name"),
    type: z.string().describe("Subsystem category, e.g. 'Radar', 'Engine'"),
    maxHp: z.number().describe("Maximum hit points for this subsystem")
}).describe("Damageable subsystem definition");

/**
 * HealthProfile: Platform durability and subsystems.
 */
export const HealthProfileSchema = z.object({
    maxHp: z.number().describe("Maximum hit points"),
    subsystems: z.array(SubsystemProfileSchema).optional().describe("Damageable subsystems")
}).describe("Platform durability profile");
export type HealthProfile = z.infer<typeof HealthProfileSchema>;

/**
 * BurstProfile: Gun burst fire characteristics.
 */
export const BurstProfileSchema = z.object({
    muzzleVelocity: Vector3Schema.describe("Muzzle velocity vector (m/s)"),
    roundsPerSecond: z.number().describe("Rate of fire"),
    dispersionDeg: z.number().describe("Dispersion cone half-angle in degrees"),
    caliberMm: z.number().optional().describe("Projectile caliber in millimeters")
}).describe("Gun burst fire characteristics");
export type BurstProfile = z.infer<typeof BurstProfileSchema>;

/**
 * WeaponProfile: A complete weapon system definition.
 */
export const WeaponProfileSchema = z.object({
    id: z.string().describe("Unique weapon profile identifier"),
    name: z.string().describe("Weapon designation, e.g. 'AIM-120C AMRAAM'"),
    type: z.enum(['Missile', 'Torpedo', 'Gun', 'Bomb']).describe("Weapon category"),

    // Performance
    maxRangeM: z.number().describe("Maximum effective range in meters"),
    minRangeM: z.number().optional().default(0).describe("Minimum engagement range in meters"),
    maxSpeedKts: z.number().describe("Maximum speed in knots"),
    cruiseSpeedKts: z.number().describe("Cruise speed in knots"),

    // Guidance
    guidance: GuidanceTypeSchema.optional().default(GuidanceType.Ballistic).describe("Terminal guidance type"),
    requiresIllumination: z.boolean().optional().default(false).describe("Whether SARH illumination is required"),

    // Lethality
    pk: z.number().min(0).max(1.0).optional().default(0.8).describe("Probability of kill on hit (0.0-1.0)"),
    warheadYieldKg: z.number().optional().describe("Warhead explosive yield in kilograms"),
    warheadType: WarheadTypeSchema.optional().default(WarheadType.BlastFragmentation).describe("Warhead type"),

    // Altitude Bonus
    altitudeRmaxBonus: z.number().optional().default(0).describe("Additional meters of range per meter of altitude"),

    // Entity Integration
    entityProfileId: z.string().optional().describe("Link to EntityProfile if weapon spawns a physical entity"),
    burst: BurstProfileSchema.optional().describe("Gun burst fire parameters")
}).describe("Complete weapon system definition");
export type WeaponProfile = z.infer<typeof WeaponProfileSchema>;

/**
 * PlatformType: The broad domain classification of a platform entity.
 */
export const PlatformTypeSchema = z.enum([
    'Aircraft', 'Helicopter', 'Ship', 'Submarine', 'Facility', 'Weapon', 'Mine'
]).describe("Platform domain classification");
export type PlatformType = z.infer<typeof PlatformTypeSchema>;

/**
 * EntityProfile: The master profile combining all subsystem specifications.
 */
export const EntityProfileSchema = z.object({
    platformClass: z.string().optional().describe("General class, e.g. 'F-16 Fighting Falcon'"),
    variantName: z.string().optional().describe("Specific variant, e.g. 'F-16C Block 50'"),
    type: PlatformTypeSchema.optional().describe("Platform domain classification"),
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
    entityProfileId: z.string().optional().describe("Link to another EntityProfile")
}).describe("Master platform profile");
export type EntityProfile = z.infer<typeof EntityProfileSchema>;
