import { sdkClient } from './Client';
import { ViewUnitPayload, ViewTrackPayload, Vector3 } from '../../sdk/schemas';

export type CommandType = 
    | 'SetCourse' 
    | 'AddWaypoint' 
    | 'ClearWaypoints' 
    | 'FireWeapon' 
    | 'SetROE' 
    | 'SetEMCON' 
    | 'SetSpeed' 
    | 'SetAltitude' 
    | 'SetHeading';

export interface CommandIntent {
    type: CommandType;
    entityId: string;
    payload: unknown;
}

/**
 * CommandDispatcher: High-level UI command orchestrator.
 * Handles selection-aware command routing and multi-unit coordination.
 */
class CommandDispatcher {
    async execute(intent: CommandIntent): Promise<void> {
        try {
            switch (intent.type) {
                case 'SetCourse': {
                    const p = intent.payload as { position: Vector3, speedKts: number };
                    await sdkClient.nav.setCourse(intent.entityId, p.position, p.speedKts);
                    break;
                }
                case 'FireWeapon': {
                    const p = intent.payload as { mountIndex: number, targetId: string };
                    await sdkClient.combat.fireWeapon(intent.entityId, p.mountIndex, p.targetId);
                    break;
                }
                case 'SetSpeed': {
                    const p = intent.payload as { speedKts: number };
                    await sdkClient.nav.setSpeed(intent.entityId, p.speedKts);
                    break;
                }
                case 'SetAltitude': {
                    const p = intent.payload as { altitudeM: number };
                    await sdkClient.nav.setAltitude(intent.entityId, p.altitudeM);
                    break;
                }
                case 'SetHeading': {
                    const p = intent.payload as { heading: number };
                    await sdkClient.nav.setHeading(intent.entityId, p.heading);
                    break;
                }
            }
        } catch (e) {
            console.error(`Command execution failed: ${intent.type}`, e);
            throw e;
        }
    }

    /**
     * getValidCommands: Returns list of available commands for a specific selection.
     */
    getValidCommands(selection: ViewUnitPayload | ViewTrackPayload | null): CommandType[] {
        if (!selection) return [];
        
        // Tracks only support engagement
        if ('trueId' in selection) {
            return ['FireWeapon'];
        }

        // Units support everything
        return ['SetCourse', 'AddWaypoint', 'ClearWaypoints', 'FireWeapon', 'SetROE', 'SetEMCON', 'SetSpeed', 'SetAltitude', 'SetHeading'];
    }
}

export const commandDispatcher = new CommandDispatcher();
