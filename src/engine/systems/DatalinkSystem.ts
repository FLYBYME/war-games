import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SyncTracksCommand } from '../core/Command.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { TrackComponent } from '../components/Track.js';
import { DetectionComponent, ESMBearing } from '../components/Sensors.js';
import { Track } from '../core/Types.js';
import { Entity } from '../core/Entity.js';

/**
 * DatalinkSystem: Facilitates track sharing across networks.
 * Implements a Common Tactical Picture (CTP) for each network and synchronizes it 
 * to all participating members.
 */
export class DatalinkSystem implements ISystem {
    readonly name = 'DatalinkSystem';
    readonly phase = SystemPhase.Perception;
    readonly dependencies = ['TMSSystem'];

    private graph: { nodes: string[], edges: { a: string, b: string, latencyMs: number }[] } = { nodes: [], edges: [] };

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        
        // 1. Identify networks and members
        const nodes = new Set<string>();
        const edges: { a: string, b: string, latencyMs: number }[] = [];
        const networks = new Map<string, Entity[]>();
        for (const entity of world.getEntities()) {
            const dl = entity.getComponent(DatalinkComponent);
            if (dl) {
                if (!networks.has(dl.networkId)) {
                    networks.set(dl.networkId, []);
                }
                networks.get(dl.networkId)!.push(entity);
                nodes.add(entity.id);
            }
        }

        // 2. For each network, build the Common Tactical Picture (CTP)
        for (const [, members] of networks.entries()) {
            const ctp = new Map<string, Track>(); 
            const jointBearings: ESMBearing[] = [];

            for (const member of members) {
                const dl = member.getComponent(DatalinkComponent);
                if (!dl?.canTransmit || !dl.isActive) continue;

                const localTracks = member.getComponent(TrackComponent);
                if (localTracks) {
                    for (const track of localTracks.tracks.values()) {
                        if (track.status === 'Dropped') continue;
                        const existing = ctp.get(track.trueEntityId);
                        if (!existing || track.cepM < existing.cepM) {
                            ctp.set(track.trueEntityId, { ...track });
                        }
                    }
                }

                const detections = member.getComponent(DetectionComponent);
                if (detections) {
                    jointBearings.push(...detections.esmBearings);
                }
            }

            // 3. Queue the fused picture for all members capable of receiving
            const sharedTracks = Array.from(ctp.values());
            if (sharedTracks.length === 0 && jointBearings.length === 0) continue;

            for (const member of members) {
                const dl = member.getComponent(DatalinkComponent);
                if (dl && dl.canReceive && dl.isActive) {
                    // Update periodically to avoid flooding
                    if (world.currentTick % 5 === 0) {
                        dl.incomingQueue.push({
                            arrivalTick: world.currentTick + dl.latencyTicks,
                            tracks: JSON.parse(JSON.stringify(sharedTracks)),
                            bearings: JSON.parse(JSON.stringify(jointBearings))
                        });
                    }
                }
            }

            // Build graph edges
            for (let i = 0; i < members.length; i++) {
                for (let j = i + 1; j < members.length; j++) {
                    const dlA = members[i].getComponent(DatalinkComponent)!;
                    const dlB = members[j].getComponent(DatalinkComponent)!;
                    if (dlA.isActive && dlB.isActive) {
                        edges.push({
                            a: members[i].id,
                            b: members[j].id,
                            latencyMs: (dlA.latencyTicks + dlB.latencyTicks) * 100 
                        });
                    }
                }
            }
        }

        this.graph = { nodes: Array.from(nodes), edges };

        // 4. Process arrived messages for all entities
        for (const entity of world.getEntities()) {
            const dl = entity.getComponent(DatalinkComponent);
            if (dl && dl.incomingQueue.length > 0) {
                const arrivedIndices = dl.incomingQueue
                    .map((m, i) => m.arrivalTick <= world.currentTick ? i : -1)
                    .filter(i => i !== -1);
                
                if (arrivedIndices.length > 0) {
                    const latestIdx = arrivedIndices[arrivedIndices.length - 1];
                    const msg = dl.incomingQueue[latestIdx];
                    
                    commands.push(new SyncTracksCommand(entity.id, msg.tracks));
                    
                    // Also merge bearings into local DetectionComponent for triangulation
                    const det = entity.getComponent(DetectionComponent);
                    if (det && msg.bearings) {
                        // Avoid duplicates from self
                        const externalBearings = msg.bearings.filter(b => b.observerId !== entity.id);
                        // Simple policy: replace previous external bearings with new ones
                        det.esmBearings = det.esmBearings.filter(b => b.observerId === entity.id);
                        det.esmBearings.push(...externalBearings);
                    }
                    
                    dl.incomingQueue = dl.incomingQueue.filter((_, i) => i > latestIdx);
                }
            }
        }

        return commands;
    }

    public getGraph() {
        return this.graph;
    }
}
