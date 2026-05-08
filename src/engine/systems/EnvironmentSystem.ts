import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateEnvironmentCommand } from '../core/Command.js';
import { TransformComponent } from '../components/Physics.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { TerrainOracle } from '../environment/TerrainOracle.js';
import { GeoProjection } from '../math/GeoProjection.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * EnvironmentSystem: Updates local physical conditions for each entity.
 * Implements standard atmosphere (ISA) and oceanography (SSP) models.
 */
export class EnvironmentSystem implements ISystem {
    readonly name = 'EnvironmentSystem';
    readonly phase = SystemPhase.Environment;
    readonly dependencies: string[] = [];

    public globalWeather = {
        precipitationRateMMhr: 0,
        cloudCover: 0.3,
        seaState: 3,
        windSpeedKts: 15,
        windDirDeg: 220,
        visibilityNM: 20,
        temperatureC: 15
    };

    constructor(
        private terrain: TerrainOracle,
        private projection: GeoProjection
    ) { }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const transform = entity.getComponent(TransformComponent);
            const env = entity.getComponent(EnvironmentComponent);

            if (transform && env) {
                // 1. Geospatial Mapping
                const geo = this.projection.project(transform.position);

                // 2. Terrain Height
                const terrainHeight = await this.terrain.getElevation(geo.lat, geo.lon);

                // 3. Atmosphere (ISA)
                const { airDensity } = this.calculateISA(transform.position.z);

                // 4. Oceanography (SSP)
                const isSubmerged = transform.position.z < 0;
                let waterTemp = env.waterTemperatureC;
                let soundSpeed = env.soundSpeedMPS;
                const layerDepth = env.layerDepthM || Physics.SURFACE_LAYER_DEPTH_M;

                if (isSubmerged) {
                    const ocean = this.calculateOceanSSP(-transform.position.z); // Depth is -altitude
                    waterTemp = ocean.temperature;
                    soundSpeed = ocean.soundSpeed;
                }

                // 5. State Checks
                const isGrounded = transform.position.z <= terrainHeight;

                commands.push(new UpdateEnvironmentCommand(
                    entity.id,
                    terrainHeight,
                    airDensity,
                    1.0, // Default pressure ratio for now
                    isGrounded,
                    waterTemp,
                    soundSpeed,
                    layerDepth,
                    isSubmerged,
                    env.precipitationRateMMhr,
                    env.cloudCover,
                    env.seaState
                ));
            }
        }

        return commands;
    }

    /**
     * calculateISA: Approximates the International Standard Atmosphere.
     */
    private calculateISA(h: number): { airDensity: number, temperature: number } {
        const T0 = 288.15;
        const P0 = 101325;
        const L = 0.0065;
        const R = 287.05;
        const g = 9.80665;

        const altitude = h; // Z is altitude (positive up)
        if (altitude < 0) return { airDensity: 1.225, temperature: 15 };

        if (altitude <= 11000) {
            const T = T0 - L * altitude;
            const P = P0 * Math.pow(1 - (L * altitude) / T0, (g / (R * L)));
            const rho = P / (R * T);
            return { airDensity: rho, temperature: T - 273.15 };
        }

        return { airDensity: 0.36, temperature: -56.5 };
    }

    /**
     * calculateOceanSSP: Simple Piecewise Sound Speed Profile Model.
     * @param depth Depth in meters (positive down)
     */
    private calculateOceanSSP(depth: number): { soundSpeed: number, temperature: number } {
        const S = 35; // Default salinity
        let T = 15;

        // 1. Mixed Layer (0 to 100m)
        if (depth <= 100) {
            T = 15; // Isothermal
        }
        // 2. Thermocline (100 to 1000m)
        else if (depth <= 1000) {
            T = 15 - (depth - 100) * (11 / 900); // Drops to 4C
        }
        // 3. Deep Isothermal (1000m+)
        else {
            T = 4;
        }

        // Simplified Mackenzie Equation
        const soundSpeed = 1448.96 + (4.591 * T) - (0.05304 * T * T) + (1.34 * (S - 35)) + (0.0163 * depth);

        return { soundSpeed, temperature: T };
    }

    public getProjection(): GeoProjection {
        return this.projection;
    }

    public setOrigin(lat: number, lon: number): void {
        this.projection.setOrigin(lat, lon);
    }
}
