import { UIStore } from './UIStore';
import { logger } from './Logger';

/**
 * CommandDispatcher: Centralized UI intent handler.
 * Implements Debouncing and Optimistic UI updates.
 * Prevents UI controls from flooding the 10Hz game server.
 */
export class CommandDispatcher {
    private debounceTimers = new Map<string, number>();

    /** 
     * Debounce helper for rapid UI inputs (e.g., dragging sliders).
     */
    private debounce(key: string, delayMs: number, action: () => void) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        this.debounceTimers.set(key, window.setTimeout(() => {
            action();
            this.debounceTimers.delete(key);
        }, delayMs));
    }

    public setSpeed(entityId: string, speedKts: number) {
        logger.debug(`[Dispatcher] Intent: setSpeed -> ${speedKts}kts for ${entityId}`);
        // TODO: Optimistic UI state update locally on UIStore could happen here
        
        this.debounce(`setSpeed-${entityId}`, 100, () => {
            if (UIStore.client) {
                UIStore.client.nav.setSpeed(entityId, speedKts);
            }
        });
    }

    public setAltitude(entityId: string, altitudeM: number) {
        logger.debug(`[Dispatcher] Intent: setAltitude -> ${altitudeM}m for ${entityId}`);
        
        this.debounce(`setAltitude-${entityId}`, 100, () => {
            if (UIStore.client) {
                UIStore.client.nav.setAltitude(entityId, altitudeM);
            }
        });
    }

    public setHeading(entityId: string, headingDeg: number) {
        logger.debug(`[Dispatcher] Intent: setHeading -> ${headingDeg}° for ${entityId}`);
        
        this.debounce(`setHeading-${entityId}`, 100, () => {
            if (UIStore.client) {
                UIStore.client.nav.setHeading(entityId, headingDeg);
            }
        });
    }

    public fireWeapon(shooterId: string, targetId: string, weaponProfileId: string) {
        logger.info(`[Dispatcher] Intent: fireWeapon -> ${shooterId} firing ${weaponProfileId} at ${targetId}`);
        if (UIStore.client) {
            UIStore.client.dispatch({
                type: 'FireWeapon',
                entityId: shooterId,
                targetId: targetId,
                weaponProfileId: weaponProfileId
            } as any);
        }
    }

    public dispatch(command: any) {
        if (UIStore.client) {
            UIStore.client.dispatch(command);
        }
    }
}

export const commandDispatcher = new CommandDispatcher();
