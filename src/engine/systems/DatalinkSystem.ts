import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SyncTracksCommand } from '../core/Command.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { TrackComponent } from '../components/TMS.js';
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
        
        // Reset graph for this tick
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
            // trueEntityId -> Best available track for that entity in this network
            const ctp = new Map<string, Track>(); 

            for (const member of members) {
                const dl = member.getComponent(DatalinkComponent);
                if (!dl?.canTransmit) continue;

                const localTracks = member.getComponent(TrackComponent);
                if (localTracks) {
                    for (const track of localTracks.tracks.values()) {
                        // Skip internal dropped tracks
                        if (track.status === 'Dropped') continue;

                        const existing = ctp.get(track.trueEntityId);
                        // Rule: Pick the track with the lowest uncertainty (smallest CEP)
                        if (!existing || track.cepM < existing.cepM) {
                            ctp.set(track.trueEntityId, { ...track });
                        }
                    }
                }
            }

            // 3. Queue the fused picture for all members capable of receiving
            const sharedTracks = Array.from(ctp.values());
            if (sharedTracks.length === 0) continue;

            for (const member of members) {
                const dl = member.getComponent(DatalinkComponent);
                if (dl && dl.canReceive && dl.isActive) {
                    // Only update periodically (e.g. every 5 ticks) to avoid flooding
                    if (world.currentTick % 5 === 0) {
                        dl.incomingQueue.push({
                            arrivalTick: world.currentTick + dl.latencyTicks,
                            tracks: JSON.parse(JSON.stringify(sharedTracks)) // Snapshot
                        });
                    }
                }
            }

            // Build edges for this network (clique model for now, or based on proximity/latency)
            for (let i = 0; i < members.length; i++) {
                for (let j = i + 1; j < members.length; j++) {
                    const dlA = members[i].getComponent(DatalinkComponent)!;
                    const dlB = members[j].getComponent(DatalinkComponent)!;
                    if (dlA.isActive && dlB.isActive) {
                        edges.push({
                            a: members[i].id,
                            b: members[j].id,
                            latencyMs: (dlA.latencyTicks + dlB.latencyTicks) * 100 // 10Hz tick
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
                // Find all messages that have arrived
                const arrivedIndices = dl.incomingQueue
                    .map((m, i) => m.arrivalTick <= world.currentTick ? i : -1)
                    .filter(i => i !== -1);
                
                if (arrivedIndices.length > 0) {
                    // Use the latest arrived message
                    const latestIdx = arrivedIndices[arrivedIndices.length - 1];
                    const msg = dl.incomingQueue[latestIdx];
                    
                    commands.push(new SyncTracksCommand(entity.id, msg.tracks));
                    
                    // Clear out processed and stale messages
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
