import { ComponentRegistry } from './ComponentRegistry.js';
import { CollisionComponent } from '../components/Collision.js';
import { GuidanceComponent } from '../components/Guidance.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { CombatComponent } from '../components/Combat.js';
import { HealthComponent } from '../components/Health.js';
import { PropulsionComponent, FuelComponent } from '../components/Propulsion.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { TrackComponent } from '../components/Track.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { NavigationComponent, FormationComponent } from '../components/Navigation.js';
import { GroupComponent } from '../components/Group.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { FacilityComponent, LogisticsComponent } from '../components/Logistics.js';
import { TelemetryComponent } from '../components/Telemetry.js';
import { JammerComponent, SIGINTComponent } from '../components/ElectronicWarfare.js';
import { RCSComponent } from '../components/Signatures.js';
import { AcousticSignatureComponent } from '../components/Subsurface.js';

/**
 * bootstrapComponents: Registers all engine components for serialization.
 */
export function bootstrapComponents() {
    ComponentRegistry.register(TransformComponent);
    ComponentRegistry.register(KinematicsComponent);
    ComponentRegistry.register(SensorComponent);
    ComponentRegistry.register(DetectionComponent);
    ComponentRegistry.register(CombatComponent);
    ComponentRegistry.register(HealthComponent);
    ComponentRegistry.register(PropulsionComponent);
    ComponentRegistry.register(FuelComponent);
    ComponentRegistry.register(WeaponStageComponent);
    ComponentRegistry.register(EnvironmentComponent);
    ComponentRegistry.register(TrackComponent);
    ComponentRegistry.register(DatalinkComponent);
    ComponentRegistry.register(DoctrineComponent);
    ComponentRegistry.register(NavigationComponent);
    ComponentRegistry.register(FormationComponent);
    ComponentRegistry.register(GroupComponent);
    ComponentRegistry.register(TaskGraphComponent);
    ComponentRegistry.register(FacilityComponent);
    ComponentRegistry.register(LogisticsComponent);
    ComponentRegistry.register(TelemetryComponent);
    ComponentRegistry.register(JammerComponent);
    ComponentRegistry.register(SIGINTComponent);
    ComponentRegistry.register(RCSComponent);
    ComponentRegistry.register(AcousticSignatureComponent);
    ComponentRegistry.register(GuidanceComponent);
    ComponentRegistry.register(CollisionComponent);
}
