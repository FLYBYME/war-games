import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { 
    CreateTrackCommand, 
    UpdateTrackCommand, 
    DropTrackCommand, 
    SyncTracksCommand, 
    SyncESMBearingsCommand,
    AddDetectionCommand, 
    RemoveDetectionCommand 
} from '../Command.js';
import { TrackComponent } from '../../components/Track.js';
import { DetectionComponent } from '../../components/Sensors.js';
import { Track, IdentificationStatus, TrackStatus } from '../Types.js';

export class AddDetectionHandler implements CommandHandler<AddDetectionCommand> {
    execute(cmd: AddDetectionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.detectedEntityIds.add(cmd.targetId);
        }
    }
}

export class RemoveDetectionHandler implements CommandHandler<RemoveDetectionCommand> {
    execute(cmd: RemoveDetectionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.detectedEntityIds.delete(cmd.targetId);
        }
    }
}

export class CreateTrackHandler implements CommandHandler<CreateTrackCommand> {
    execute(cmd: CreateTrackCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const tracks = entity?.getComponent(TrackComponent);
        const raw = cmd.track as any;
        if (tracks) {
            tracks.tracks.set(cmd.track.id, {
                ...cmd.track,
                position: raw.position || raw.pos || { x: 0, y: 0, z: 0 },
                velocity: raw.velocity || raw.vel || { x: 0, y: 0, z: 0 },
                status: raw.status || TrackStatus.Active,
                cepM: raw.cepM ?? 10,
                lastSeenTick: raw.lastSeenTick ?? world.currentTick,
                identification: raw.identification || IdentificationStatus.UNKNOWN,
                confidence: raw.confidence || 0.5
            });
        }
    }
}

export class UpdateTrackHandler implements CommandHandler<UpdateTrackCommand> {
    execute(cmd: UpdateTrackCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
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
        }
    }
}

export class SyncTracksHandler implements CommandHandler<SyncTracksCommand> {
    execute(cmd: SyncTracksCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const tracks = entity?.getComponent(TrackComponent);
        if (tracks) {
            for (const netTrack of cmd.tracks) {
                let localTrack: Track | undefined;
                for (const t of tracks.tracks.values()) {
                    if (t.trueEntityId === netTrack.trueEntityId) {
                        localTrack = t;
                        break;
                    }
                }

                if (localTrack) {
                    if (netTrack.cepM < localTrack.cepM - 10 || netTrack.lastSeenTick > localTrack.lastSeenTick) {
                        Object.assign(localTrack, netTrack);
                    }
                } else {
                    tracks.tracks.set(netTrack.id, { ...netTrack });
                }
            }
        }
    }
}

export class SyncESMBearingsHandler implements CommandHandler<SyncESMBearingsCommand> {
    execute(cmd: SyncESMBearingsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.esmBearings = cmd.bearings;
        }
    }
}
