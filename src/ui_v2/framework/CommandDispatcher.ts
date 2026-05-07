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
                    await sdkClient.dispatch({ type: 'SetCourse', entityId: intent.entityId, position: p.position, speedKts: p.speedKts });
                    break;
                }
                case 'FireWeapon': {
                    const p = intent.payload as { mountIndex: number, targetId: string };
                    await sdkClient.dispatch({ type: 'FireWeapon', entityId: intent.entityId, mountIndex: p.mountIndex, targetId: p.targetId });
                    break;
                }
                case 'SetSpeed': {
                    const p = intent.payload as { speedKts: number };
                    await sdkClient.dispatch({ type: 'SetSpeed', entityId: intent.entityId, speedKts: p.speedKts });
                    break;
                }
                case 'SetAltitude': {
                    const p = intent.payload as { altitudeM: number };
                    await sdkClient.dispatch({ type: 'SetAltitude', entityId: intent.entityId, altitudeM: p.altitudeM });
                    break;
                }
                case 'SetHeading': {
                    const p = intent.payload as { heading: number };
                    await sdkClient.dispatch({ type: 'SetHeading', entityId: intent.entityId, heading: p.heading });
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
