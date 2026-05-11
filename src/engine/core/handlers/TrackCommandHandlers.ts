import { CommandHandler } from '../CommandDispatcher.js';
import { CreateTrackCommand, UpdateTrackCommand, DropTrackCommand, SyncTracksCommand, SyncESMBearingsCommand } from '../Command.js';
import { World } from '../World.js';
import { TrackComponent } from '../../components/Track.js';
import { DetectionComponent } from '../../components/Sensors.js';
import type { ESMBearing } from '../Types.js';

export class CreateTrackHandler implements CommandHandler<CreateTrackCommand> {
    execute(cmd: CreateTrackCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const tracks = entity?.getComponent(TrackComponent);
        if (tracks) {
            tracks.tracks.set(cmd.track.id, cmd.track);
            
            world.recordEvent({
                type: 'GenericEvent',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: { type: 'TrackCreated', trackId: cmd.track.id }
            });
        }
    }
}

export class UpdateTrackHandler implements CommandHandler<UpdateTrackCommand> {
    execute(cmd: UpdateTrackCommand, _world: World): void {
        const entity = _world.getEntity(cmd.entityId);
        const tracks = entity?.getComponent(TrackComponent);
        if (tracks) {
            const track = tracks.tracks.get(cmd.trackId);
            if (track) {
                Object.assign(track, cmd.updates);
            }
        }
    }
}

export class DropTrackHandler implements CommandHandler<DropTrackCommand> {
    execute(cmd: DropTrackCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const tracks = entity?.getComponent(TrackComponent);
        if (tracks) {
            tracks.tracks.delete(cmd.trackId);

            world.recordEvent({
                type: 'GenericEvent',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: { type: 'TrackDropped', trackId: cmd.trackId }
            });
        }
    }
}

export class SyncTracksHandler implements CommandHandler<SyncTracksCommand> {
    execute(cmd: SyncTracksCommand, _world: World): void {
        const entity = _world.getEntity(cmd.entityId);
        const trackComp = entity?.getComponent(TrackComponent);
        if (trackComp) {
            // Bulk update or replace
            trackComp.tracks.clear();
            for (const t of cmd.tracks) {
                trackComp.tracks.set(t.id, t);
            }
        }
    }
}

export class SyncESMBearingsHandler implements CommandHandler<SyncESMBearingsCommand> {
    execute(cmd: SyncESMBearingsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.esmBearings = cmd.bearings as ESMBearing[];
        }
    }
}
