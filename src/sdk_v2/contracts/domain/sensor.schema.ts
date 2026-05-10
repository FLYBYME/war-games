import { z } from 'zod';

// ─── Sensor Enumerations ─────────────────────────────────────────────────────

/**
 * SensorType: The physical detection modality of a sensor.
 */
export enum SensorType {
    Radar = 'Radar',
    Sonar = 'Sonar',
    Visual = 'Visual',
    ESM = 'ESM',
    IRST = 'IRST',
    EO = 'EO'
}
export const SensorTypeSchema = z.nativeEnum(SensorType).describe("Physical detection modality of a sensor");

/**
 * EMBand: Electromagnetic frequency band for radar systems.
 */
export enum EMBand {
    L = 'L',    // 1-2 GHz (Early Warning)
    S = 'S',    // 2-4 GHz (Surveillance)
    C = 'C',    // 4-8 GHz (Weather/Multi-Function)
    X = 'X',    // 8-12 GHz (Fire Control)
    Ku = 'Ku'   // 12-18 GHz (High Resolution)
}
export const EMBandSchema = z.nativeEnum(EMBand).describe("Electromagnetic frequency band");

/**
 * SensorMode: Operational mode of a sensor.
 */
export enum SensorMode {
    Search = 'Search',
    Track = 'Track',
    Illumination = 'Illumination'   // Continuous Wave for Semi-Active Radar Homing
}
export const SensorModeSchema = z.nativeEnum(SensorMode).describe("Operational mode of a sensor");

/**
 * MountingType: How a sensor is physically installed on a platform.
 */
export enum MountingType {
    Fixed = 'Fixed',
    Turret = 'Turret',
    Hull = 'Hull',
    TowedArray = 'TowedArray',
    Sonobuoy = 'Sonobuoy',
    Dipping = 'Dipping'
}
export const MountingTypeSchema = z.nativeEnum(MountingType).describe("Physical sensor installation type");

/**
 * EMCONState: Emission Control operational level.
 */
export enum EMCONState {
    Alpha = 'Alpha',       // Fully Active
    Bravo = 'Bravo',       // Restricted
    Charlie = 'Charlie',   // Silent
    Silent = 'Silent'
}
export const EMCONStateSchema = z.nativeEnum(EMCONState).describe("Emission Control operational level");
