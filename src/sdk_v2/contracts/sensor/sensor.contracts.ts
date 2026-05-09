import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { SensorTypeSchema, EMBandSchema, SensorModeSchema, EMCONStateSchema } from '../domain/sensor.schema.js';

// ─── Shared Sensor State ─────────────────────────────────────────────────────

export const SensorStateSchema = z.object({
    index: z.number().describe("Sensor index on the platform"),
    name: z.string().describe("Sensor designation"),
    type: SensorTypeSchema.describe("Sensor modality"),
    band: EMBandSchema.optional().describe("Operating frequency band"),
    mode: SensorModeSchema.describe("Current operational mode"),
    isActive: z.boolean().describe("Whether the sensor is radiating/active"),
    maxRangeM: z.number().describe("Maximum detection range in meters"),
    currentAzimuth: z.number().describe("Current scan azimuth in degrees"),
    halfArcDeg: z.number().describe("Scan sector half-arc in degrees"),
    txPowerKw: z.number().optional().describe("Transmit power in kilowatts"),
    detectionCount: z.number().describe("Number of active detections")
}).describe("Sensor system runtime state");

// ─── sensor_list ─────────────────────────────────────────────────────────────

export const SensorListInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const SensorListOutputSchema = z.object({
    sensors: z.array(SensorStateSchema).describe("All onboard sensors"),
    emconState: z.string().describe("Current EMCON level")
});

export const sensorListContract = defineContract({
    domain: 'sensor',
    action: 'list',
    description: 'List all onboard sensors and their settings.',
    inputSchema: SensorListInputSchema,
    outputSchema: SensorListOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/sensors' }
});

// ─── sensor_update ───────────────────────────────────────────────────────────

export const SensorUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    index: z.number().describe("Sensor index"),
    isActive: z.boolean().optional().describe("Toggle sensor on/off"),
    mode: SensorModeSchema.optional().describe("Set operational mode")
});

export const sensorUpdateContract = defineContract({
    domain: 'sensor',
    action: 'update',
    description: 'Modify sensor properties like mode or power state.',
    inputSchema: SensorUpdateInputSchema,
    outputSchema: SensorStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/sensors/:index' }
});

// ─── sensor_set_emcon ────────────────────────────────────────────────────────

export const SensorSetEmconInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    state: EMCONStateSchema.describe("Desired EMCON level")
});

export const SensorSetEmconOutputSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    emconState: z.string().describe("Applied EMCON state")
});

export const sensorSetEmconContract = defineContract({
    domain: 'sensor',
    action: 'set_emcon',
    description: 'Set Emission Control level for the platform.',
    inputSchema: SensorSetEmconInputSchema,
    outputSchema: SensorSetEmconOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/sensors/emcon' }
});
