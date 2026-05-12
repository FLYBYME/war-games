import { z } from 'zod';
import * as Contracts from '../contracts/index.js';

export class WarGamesClientV2 {
    constructor(private apiServerUrl: string, private terrainServerUrl: string = apiServerUrl) {}

    private getBaseUrl(domain: string, args: Record<string, unknown>): string {
        // Geodetic tools (no matchId in env/map) route to the Terrain Server
        const isGeodetic = (domain === 'env' || domain === 'map') && !args.matchId;
        return isGeodetic ? this.terrainServerUrl : this.apiServerUrl;
    }

    private async request<TOut>(domain: string, method: string, path: string, args: Record<string, unknown>): Promise<TOut> {
        let url = this.getBaseUrl(domain, args) + path;
        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
        if (method === 'GET') {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(args)) {
                if (value === undefined) continue;
                queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            }
            const qs = queryParams.toString();
            if (qs) url += '?' + qs;
        } else options.body = JSON.stringify(args);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Request failed: ${response.status} - ${await response.text()}`);
        return response.json() as Promise<TOut>;
    }

    private async *stream<TOut>(domain: string, method: string, path: string, args: Record<string, unknown>): AsyncIterable<TOut> {
        let url = this.getBaseUrl(domain, args) + path;
        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
        
        if (method === 'GET') {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(args)) {
                if (value === undefined) continue;
                queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            }
            const qs = queryParams.toString();
            if (qs) url += '?' + qs;
        } else options.body = JSON.stringify(args);

        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Stream failed: ${response.status}`);
        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim()) yield JSON.parse(line) as TOut;
            }
        }
    }

    public api = {
        agent: {
            create: async (args: z.infer<typeof Contracts.AgentCreateInputSchema>): Promise<z.infer<typeof Contracts.AgentSchema>> => this.request('agent', 'POST', `/agents`, args as Record<string, unknown>),
            list: async (args: z.infer<typeof Contracts.AgentListInputSchema>): Promise<z.infer<typeof Contracts.AgentListOutputSchema>> => this.request('agent', 'GET', `/agents`, args as Record<string, unknown>),
            delete: async (args: z.infer<typeof Contracts.AgentDeleteInputSchema>): Promise<z.infer<typeof Contracts.AgentDeleteOutputSchema>> => this.request('agent', 'DELETE', `/agents/${args.agentId}`, args as Record<string, unknown>),
            seed: async (args: z.infer<typeof Contracts.AgentSeedInputSchema>): Promise<z.infer<typeof Contracts.AgentSeedOutputSchema>> => this.request('agent', 'POST', `/agents/seed`, args as Record<string, unknown>),
            thread_create: async (args: z.infer<typeof Contracts.ThreadCreateInputSchema>): Promise<z.infer<typeof Contracts.ThreadSchema>> => this.request('agent', 'POST', `/agents/${args.agentId}/threads`, args as Record<string, unknown>),
            thread_history: async (args: z.infer<typeof Contracts.ThreadHistoryInputSchema>): Promise<z.infer<typeof Contracts.ThreadHistoryOutputSchema>> => this.request('agent', 'GET', `/threads/${args.threadId}/history`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.AgentUpdateInputSchema>): Promise<z.infer<typeof Contracts.AgentSchema>> => this.request('agent', 'PATCH', `/agents/${args.agentId}`, args as Record<string, unknown>),
            thread_list: async (args: z.infer<typeof Contracts.ThreadListInputSchema>): Promise<z.infer<typeof Contracts.ThreadListOutputSchema>> => this.request('agent', 'GET', `/threads`, args as Record<string, unknown>),
            thread_update: async (args: z.infer<typeof Contracts.ThreadUpdateInputSchema>): Promise<z.infer<typeof Contracts.ThreadSchema>> => this.request('agent', 'PATCH', `/threads/${args.threadId}`, args as Record<string, unknown>),
            thread_delete: async (args: z.infer<typeof Contracts.ThreadDeleteInputSchema>): Promise<z.infer<typeof Contracts.SuccessOutputSchema>> => this.request('agent', 'DELETE', `/threads/${args.threadId}`, args as Record<string, unknown>),
            message_update: async (args: z.infer<typeof Contracts.MessageUpdateInputSchema>): Promise<z.infer<typeof Contracts.MessageSchema>> => this.request('agent', 'PATCH', `/messages/${args.messageId}`, args as Record<string, unknown>),
            message_delete: async (args: z.infer<typeof Contracts.MessageDeleteInputSchema>): Promise<z.infer<typeof Contracts.SuccessOutputSchema>> => this.request('agent', 'DELETE', `/messages/${args.messageId}`, args as Record<string, unknown>),
            run_stream: (args: z.infer<typeof Contracts.AgentRunStreamInputSchema>): AsyncIterable<z.infer<typeof Contracts.AgentEventSchema>> => this.stream('agent', 'POST', `/threads/${args.threadId}/run`, args as Record<string, unknown>),
        },
        automation: {
            list_events: async (args: z.infer<typeof Contracts.AutomationListEventsInputSchema>): Promise<z.infer<typeof Contracts.AutomationListEventsOutputSchema>> => this.request('automation', 'GET', `/matches/${args.matchId}/automation/events`, args as Record<string, unknown>),
            trigger_event: async (args: z.infer<typeof Contracts.AutomationTriggerEventInputSchema>): Promise<z.infer<typeof Contracts.AutomationTriggerEventOutputSchema>> => this.request('automation', 'POST', `/matches/${args.matchId}/automation/events/${args.eventId}/trigger`, args as Record<string, unknown>),
            get_results: async (args: z.infer<typeof Contracts.AutomationGetResultsInputSchema>): Promise<z.infer<typeof Contracts.AutomationGetResultsOutputSchema>> => this.request('automation', 'GET', `/matches/${args.matchId}/automation/assertions`, args as Record<string, unknown>),
        },
        bug: {
            list: async (args: z.infer<typeof Contracts.BugListInputSchema>): Promise<z.infer<typeof Contracts.BugListOutputSchema>> => this.request('bug', 'GET', `/bugs`, args as Record<string, unknown>),
            create: async (args: z.infer<typeof Contracts.BugCreateInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('bug', 'POST', `/bugs`, args as Record<string, unknown>),
            get: async (args: z.infer<typeof Contracts.BugGetInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('bug', 'GET', `/bugs/${args.id}`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.BugUpdateInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('bug', 'PATCH', `/bugs/${args.id}`, args as Record<string, unknown>),
            add_comment: async (args: z.infer<typeof Contracts.BugAddCommentInputSchema>): Promise<z.infer<typeof Contracts.BugCommentSchema>> => this.request('bug', 'POST', `/bugs/${args.bugId}/comments`, args as Record<string, unknown>),
        },
        combat: {
            get: async (args: z.infer<typeof Contracts.CombatGetInputSchema>): Promise<z.infer<typeof Contracts.CombatStateSchema>> => this.request('combat', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/combat`, args as Record<string, unknown>),
            fire: async (args: z.infer<typeof Contracts.CombatFireInputSchema>): Promise<z.infer<typeof Contracts.CombatFireOutputSchema>> => this.request('combat', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/combat/fire`, args as Record<string, unknown>),
            fire_salvo: async (args: z.infer<typeof Contracts.CombatFireSalvoInputSchema>): Promise<z.infer<typeof Contracts.CombatFireSalvoOutputSchema>> => this.request('combat', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/combat/salvo`, args as Record<string, unknown>),
            list_mounts: async (args: z.infer<typeof Contracts.CombatListMountsInputSchema>): Promise<z.infer<typeof Contracts.CombatListMountsOutputSchema>> => this.request('combat', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/combat/mounts`, args as Record<string, unknown>),
            get_wra: async (args: z.infer<typeof Contracts.CombatGetWRAInputSchema>): Promise<z.infer<typeof Contracts.CombatGetWRAOutputSchema>> => this.request('combat', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/combat/wra`, args as Record<string, unknown>),
            update_wra: async (args: z.infer<typeof Contracts.CombatUpdateWRAInputSchema>): Promise<z.infer<typeof Contracts.CombatGetWRAOutputSchema>> => this.request('combat', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/combat/wra`, args as Record<string, unknown>),
            update_roe: async (args: z.infer<typeof Contracts.CombatUpdateROEInputSchema>): Promise<z.infer<typeof Contracts.CombatUpdateROEOutputSchema>> => this.request('combat', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/combat/roe`, args as Record<string, unknown>),
        },
        datalink: {
            get: async (args: z.infer<typeof Contracts.DatalinkGetInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('datalink', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/datalink`, args as Record<string, unknown>),
            update_network: async (args: z.infer<typeof Contracts.DatalinkUpdateNetworkInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('datalink', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/datalink/network`, args as Record<string, unknown>),
            set_emissions: async (args: z.infer<typeof Contracts.DatalinkSetEmissionsInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('datalink', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/datalink/emissions`, args as Record<string, unknown>),
        },
        db: {
            profile_list: async (args: z.infer<typeof Contracts.DBProfileListInputSchema>): Promise<z.infer<typeof Contracts.DBProfileListOutputSchema>> => this.request('db', 'GET', `/db/profiles`, args as Record<string, unknown>),
            profile_get: async (args: z.infer<typeof Contracts.DBProfileGetInputSchema>): Promise<z.infer<typeof Contracts.EntityProfileSchema>> => this.request('db', 'GET', `/db/profiles/${args.id}`, args as Record<string, unknown>),
            profile_create: async (args: z.infer<typeof Contracts.DBProfileCreateInputSchema>): Promise<z.infer<typeof Contracts.DBProfileCreateOutputSchema>> => this.request('db', 'POST', `/db/profiles`, args as Record<string, unknown>),
            weapon_list: async (args: z.infer<typeof Contracts.DBWeaponListInputSchema>): Promise<z.infer<typeof Contracts.DBWeaponListOutputSchema>> => this.request('db', 'GET', `/db/weapons`, args as Record<string, unknown>),
            weapon_get: async (args: z.infer<typeof Contracts.DBWeaponGetInputSchema>): Promise<z.infer<typeof Contracts.WeaponProfileSchema>> => this.request('db', 'GET', `/db/weapons/${args.id}`, args as Record<string, unknown>),
            scenario_list: async (args: z.infer<typeof Contracts.DBScenarioListInputSchema>): Promise<z.infer<typeof Contracts.DBScenarioListOutputSchema>> => this.request('db', 'GET', `/db/scenarios`, args as Record<string, unknown>),
            scenario_get: async (args: z.infer<typeof Contracts.DBScenarioGetInputSchema>): Promise<z.infer<typeof Contracts.ScenarioManifestSchema>> => this.request('db', 'GET', `/db/scenarios/${args.id}`, args as Record<string, unknown>),
            seed: async (args: z.infer<typeof Contracts.DBSeedInputSchema>): Promise<z.infer<typeof Contracts.DBSeedOutputSchema>> => this.request('db', 'POST', `/db/seed`, args as Record<string, unknown>),
        },
        entity: {
            list: async (args: z.infer<typeof Contracts.EntityListInputSchema>): Promise<z.infer<typeof Contracts.EntityListOutputSchema>> => this.request('entity', 'GET', `/matches/${args.matchId}/entities`, args as Record<string, unknown>),
            get: async (args: z.infer<typeof Contracts.EntityGetInputSchema>): Promise<z.infer<typeof Contracts.EntitySummarySchema>> => this.request('entity', 'GET', `/matches/${args.matchId}/entities/${args.entityId}`, args as Record<string, unknown>),
            create: async (args: z.infer<typeof Contracts.EntityCreateInputSchema>): Promise<z.infer<typeof Contracts.EntitySummarySchema>> => this.request('entity', 'POST', `/matches/${args.matchId}/entities`, args as Record<string, unknown>),
            delete: async (args: z.infer<typeof Contracts.EntityDeleteInputSchema>): Promise<z.infer<typeof Contracts.EntityDeleteOutputSchema>> => this.request('entity', 'DELETE', `/matches/${args.matchId}/entities/${args.entityId}`, args as Record<string, unknown>),
            get_status: async (args: z.infer<typeof Contracts.EntityStatusInputSchema>): Promise<z.infer<typeof Contracts.EntityStatusOutputSchema>> => this.request('entity', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/status`, args as Record<string, unknown>),
        },
        env: {
            get: async (args: z.infer<typeof Contracts.EnvGetInputSchema>): Promise<z.infer<typeof Contracts.EnvironmentStateSchema>> => this.request('env', 'GET', `/matches/${args.matchId}/environment`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.EnvUpdateInputSchema>): Promise<z.infer<typeof Contracts.EnvironmentStateSchema>> => this.request('env', 'PATCH', `/matches/${args.matchId}/environment`, args as Record<string, unknown>),
            sample_terrain: async (args: z.infer<typeof Contracts.EnvSampleTerrainInputSchema>): Promise<z.infer<typeof Contracts.EnvSampleTerrainOutputSchema>> => this.request('env', 'GET', `/matches/${args.matchId}/environment/terrain`, args as Record<string, unknown>),
            sample_ocean: async (args: z.infer<typeof Contracts.EnvSampleOceanInputSchema>): Promise<z.infer<typeof Contracts.EnvSampleOceanOutputSchema>> => this.request('env', 'GET', `/matches/${args.matchId}/environment/ocean`, args as Record<string, unknown>),
            get_borders: async (args: z.infer<typeof Contracts.EnvGetBordersInputSchema>): Promise<z.infer<typeof Contracts.EnvGetBordersOutputSchema>> => this.request('env', 'GET', `/matches/${args.matchId}/environment/borders`, args as Record<string, unknown>),
            set_time: async (args: z.infer<typeof Contracts.EnvSetTimeInputSchema>): Promise<z.infer<typeof Contracts.EnvSetTimeOutputSchema>> => this.request('env', 'PUT', `/matches/${args.matchId}/environment/time`, args as Record<string, unknown>),
            prefetch_terrain: async (args: z.infer<typeof Contracts.EnvPrefetchTerrainInputSchema>): Promise<z.infer<typeof Contracts.EnvPrefetchTerrainOutputSchema>> => this.request('env', 'POST', `/matches/${args.matchId}/environment/terrain/prefetch`, args as Record<string, unknown>),
            get_cache_stats: async (args: z.infer<typeof Contracts.EnvGetCacheStatsInputSchema>): Promise<z.infer<typeof Contracts.EnvGetCacheStatsOutputSchema>> => this.request('env', 'GET', `/env/terrain/cache`, args as Record<string, unknown>),
            get_terrain_tile: async (args: z.infer<typeof Contracts.EnvGetTerrainTileInputSchema>): Promise<z.infer<typeof Contracts.EnvGetTerrainTileOutputSchema>> => this.request('env', 'GET', `/env/terrain/tile`, args as Record<string, unknown>),
            sample_geodetic: async (args: z.infer<typeof Contracts.EnvSampleGeodeticInputSchema>): Promise<z.infer<typeof Contracts.EnvSampleGeodeticOutputSchema>> => this.request('env', 'GET', `/env/terrain/sample`, args as Record<string, unknown>),
        },
        ew: {
            get_jammer: async (args: z.infer<typeof Contracts.EWGetJammerInputSchema>): Promise<z.infer<typeof Contracts.JammerStateSchema>> => this.request('ew', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer`, args as Record<string, unknown>),
            set_jammer_state: async (args: z.infer<typeof Contracts.EWSetJammerStateInputSchema>): Promise<z.infer<typeof Contracts.JammerStateSchema>> => this.request('ew', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer/state`, args as Record<string, unknown>),
            assign_jammer_target: async (args: z.infer<typeof Contracts.EWAssignJammerTargetInputSchema>): Promise<z.infer<typeof Contracts.EWAssignJammerTargetOutputSchema>> => this.request('ew', 'PUT', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer/target`, args as Record<string, unknown>),
            get_sigint: async (args: z.infer<typeof Contracts.EWGetSIGINTInputSchema>): Promise<z.infer<typeof Contracts.SIGINTStateSchema>> => this.request('ew', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/ew/sigint`, args as Record<string, unknown>),
        },
        group: {
            list: async (args: z.infer<typeof Contracts.GroupListInputSchema>): Promise<z.infer<typeof Contracts.GroupListOutputSchema>> => this.request('group', 'GET', `/matches/${args.matchId}/groups`, args as Record<string, unknown>),
            get: async (args: z.infer<typeof Contracts.GroupGetInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('group', 'GET', `/matches/${args.matchId}/groups/${args.groupId}`, args as Record<string, unknown>),
            create: async (args: z.infer<typeof Contracts.GroupCreateInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('group', 'POST', `/matches/${args.matchId}/groups`, args as Record<string, unknown>),
            set_leader: async (args: z.infer<typeof Contracts.GroupSetLeaderInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('group', 'PUT', `/matches/${args.matchId}/groups/${args.groupId}/leader`, args as Record<string, unknown>),
            set_parameters: async (args: z.infer<typeof Contracts.GroupSetParametersInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('group', 'PATCH', `/matches/${args.matchId}/groups/${args.groupId}/parameters`, args as Record<string, unknown>),
        },
        guidance: {
            get: async (args: z.infer<typeof Contracts.GuidanceGetInputSchema>): Promise<z.infer<typeof Contracts.GuidanceStateSchema>> => this.request('guidance', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/guidance`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.GuidanceUpdateInputSchema>): Promise<z.infer<typeof Contracts.GuidanceStateSchema>> => this.request('guidance', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/guidance`, args as Record<string, unknown>),
            set_target: async (args: z.infer<typeof Contracts.GuidanceSetTargetInputSchema>): Promise<z.infer<typeof Contracts.GuidanceSetTargetOutputSchema>> => this.request('guidance', 'PUT', `/matches/${args.matchId}/entities/${args.entityId}/guidance/target`, args as Record<string, unknown>),
        },
        history: {
            list_telemetry: async (args: z.infer<typeof Contracts.HistoryListTelemetryInputSchema>): Promise<z.infer<typeof Contracts.HistoryListTelemetryOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/telemetry/${args.entityId}`, args as Record<string, unknown>),
            get_heatmap: async (args: z.infer<typeof Contracts.HistoryGetHeatmapInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetHeatmapOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/heatmap`, args as Record<string, unknown>),
            list_events: async (args: z.infer<typeof Contracts.HistoryListEventsInputSchema>): Promise<z.infer<typeof Contracts.HistoryListEventsOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/events`, args as Record<string, unknown>),
            get_losses: async (args: z.infer<typeof Contracts.HistoryGetLossesInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetLossesOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/losses`, args as Record<string, unknown>),
            aggregate_metrics: async (args: z.infer<typeof Contracts.HistoryAggregateMetricsInputSchema>): Promise<z.infer<typeof Contracts.HistoryAggregateMetricsOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/metrics`, args as Record<string, unknown>),
            get_entity_samples: async (args: z.infer<typeof Contracts.HistoryGetEntitySamplesInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetEntitySamplesOutputSchema>> => this.request('history', 'GET', `/history/${args.batchId}/telemetry/${args.entityId}/samples`, args as Record<string, unknown>),
        },
        kinematics: {
            get: async (args: z.infer<typeof Contracts.KinematicsGetInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('kinematics', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/kinematics`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.KinematicsUpdateInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('kinematics', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/kinematics`, args as Record<string, unknown>),
            set_position: async (args: z.infer<typeof Contracts.KinematicsSetPositionInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('kinematics', 'PUT', `/matches/${args.matchId}/entities/${args.entityId}/kinematics/position`, args as Record<string, unknown>),
            apply_force: async (args: z.infer<typeof Contracts.KinematicsApplyForceInputSchema>): Promise<z.infer<typeof Contracts.KinematicsApplyForceOutputSchema>> => this.request('kinematics', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/kinematics/force`, args as Record<string, unknown>),
        },
        logistics: {
            get: async (args: z.infer<typeof Contracts.LogisticsGetInputSchema>): Promise<z.infer<typeof Contracts.LogisticsStateSchema>> => this.request('logistics', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/logistics`, args as Record<string, unknown>),
            update_state: async (args: z.infer<typeof Contracts.LogisticsUpdateStateInputSchema>): Promise<z.infer<typeof Contracts.LogisticsStateSchema>> => this.request('logistics', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/logistics/state`, args as Record<string, unknown>),
            transfer: async (args: z.infer<typeof Contracts.LogisticsTransferInputSchema>): Promise<z.infer<typeof Contracts.LogisticsTransferOutputSchema>> => this.request('logistics', 'POST', `/matches/${args.matchId}/logistics/transfer`, args as Record<string, unknown>),
            apply_damage: async (args: z.infer<typeof Contracts.LogisticsApplyDamageInputSchema>): Promise<z.infer<typeof Contracts.LogisticsApplyDamageOutputSchema>> => this.request('logistics', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/damage`, args as Record<string, unknown>),
            land: async (args: z.infer<typeof Contracts.LogisticsLandInputSchema>): Promise<z.infer<typeof Contracts.LogisticsLandOutputSchema>> => this.request('logistics', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/land`, args as Record<string, unknown>),
            launch: async (args: z.infer<typeof Contracts.LogisticsLaunchInputSchema>): Promise<z.infer<typeof Contracts.LogisticsLaunchOutputSchema>> => this.request('logistics', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/launch`, args as Record<string, unknown>),
        },
        map: {
            list_regions: async (args: z.infer<typeof Contracts.MapListRegionsInputSchema>): Promise<z.infer<typeof Contracts.MapListRegionsOutputSchema>> => this.request('map', 'GET', `/map/regions`, args as Record<string, unknown>),
            get_overlay: async (args: z.infer<typeof Contracts.MapGetOverlayInputSchema>): Promise<z.infer<typeof Contracts.MapGetOverlayOutputSchema>> => this.request('map', 'GET', `/map/overlays/${args.overlayId}`, args as Record<string, unknown>),
            get_los: async (args: z.infer<typeof Contracts.MapGetLOSInputSchema>): Promise<z.infer<typeof Contracts.MapGetLOSOutputSchema>> => this.request('map', 'GET', `/matches/${args.matchId}/map/los`, args as Record<string, unknown>),
            calculate_distance: async (args: z.infer<typeof Contracts.MapCalculateDistanceInputSchema>): Promise<z.infer<typeof Contracts.MapCalculateDistanceOutputSchema>> => this.request('map', 'GET', `/map/distance`, args as Record<string, unknown>),
            list_zones: async (args: z.infer<typeof Contracts.MapListZonesInputSchema>): Promise<z.infer<typeof Contracts.MapListZonesOutputSchema>> => this.request('map', 'GET', `/matches/${args.matchId}/map/zones`, args as Record<string, unknown>),
            update_zone: async (args: z.infer<typeof Contracts.MapUpdateZoneInputSchema>): Promise<z.infer<typeof Contracts.TacticalZoneSchema>> => this.request('map', 'PATCH', `/matches/${args.matchId}/map/zones/${args.zoneId}`, args as Record<string, unknown>),
            create_zone: async (args: z.infer<typeof Contracts.MapCreateZoneInputSchema>): Promise<z.infer<typeof Contracts.TacticalZoneSchema>> => this.request('map', 'POST', `/matches/${args.matchId}/map/zones`, args as Record<string, unknown>),
            get_elevation_profile: async (args: z.infer<typeof Contracts.MapGetElevationProfileInputSchema>): Promise<z.infer<typeof Contracts.MapGetElevationProfileOutputSchema>> => this.request('map', 'GET', `/matches/${args.matchId}/map/elevation-profile`, args as Record<string, unknown>),
            get_los_geodetic: async (args: z.infer<typeof Contracts.MapGetLOSGeodeticInputSchema>): Promise<z.infer<typeof Contracts.MapGetLOSGeodeticOutputSchema>> => this.request('map', 'POST', `/map/los/geodetic`, args as Record<string, unknown>),
            get_elevation_profile_geodetic: async (args: z.infer<typeof Contracts.MapGetElevationProfileGeodeticInputSchema>): Promise<z.infer<typeof Contracts.MapGetElevationProfileGeodeticOutputSchema>> => this.request('map', 'POST', `/map/elevation-profile/geodetic`, args as Record<string, unknown>),
            convert: async (args: z.infer<typeof Contracts.MapConvertCoordinatesInputSchema>): Promise<z.infer<typeof Contracts.MapConvertCoordinatesOutputSchema>> => this.request('map', 'POST', `/map/convert`, args as Record<string, unknown>),
            get_worker_stats: async (args: z.infer<typeof Contracts.MapGetWorkerStatsInputSchema>): Promise<z.infer<typeof Contracts.MapGetWorkerStatsOutputSchema>> => this.request('map', 'GET', `/worker/stats`, args as Record<string, unknown>),
            get_harvester_status: async (args: z.infer<typeof Contracts.MapGetHarvesterStatusInputSchema>): Promise<z.infer<typeof Contracts.MapGetHarvesterStatusOutputSchema>> => this.request('map', 'GET', `/harvester/status`, args as Record<string, unknown>),
            get_harvester_coverage: async (args: z.infer<typeof Contracts.MapGetHarvesterCoverageInputSchema>): Promise<z.infer<typeof Contracts.MapGetHarvesterCoverageOutputSchema>> => this.request('map', 'GET', `/harvester/coverage`, args as Record<string, unknown>),
            start_harvester: async (args: z.infer<typeof Contracts.MapStartHarvesterInputSchema>): Promise<z.infer<typeof Contracts.MapStartHarvesterOutputSchema>> => this.request('map', 'POST', `/harvester/start`, args as Record<string, unknown>),
            stop_harvester: async (args: z.infer<typeof Contracts.MapStopHarvesterInputSchema>): Promise<z.infer<typeof Contracts.MapStopHarvesterOutputSchema>> => this.request('map', 'POST', `/harvester/stop`, args as Record<string, unknown>),
        },
        match: {
            list: async (args: z.infer<typeof Contracts.MatchListInputSchema>): Promise<z.infer<typeof Contracts.MatchListOutputSchema>> => this.request('match', 'GET', `/matches`, args as Record<string, unknown>),
            create: async (args: z.infer<typeof Contracts.MatchCreateInputSchema>): Promise<z.infer<typeof Contracts.MatchCreateOutputSchema>> => this.request('match', 'POST', `/matches`, args as Record<string, unknown>),
            get: async (args: z.infer<typeof Contracts.MatchGetInputSchema>): Promise<z.infer<typeof Contracts.MatchSchema>> => this.request('match', 'GET', `/matches/${args.matchId}`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.MatchUpdateInputSchema>): Promise<z.infer<typeof Contracts.MatchSchema>> => this.request('match', 'PATCH', `/matches/${args.matchId}`, args as Record<string, unknown>),
            delete: async (args: z.infer<typeof Contracts.MatchDeleteInputSchema>): Promise<z.infer<typeof Contracts.MatchDeleteOutputSchema>> => this.request('match', 'DELETE', `/matches/${args.matchId}`, args as Record<string, unknown>),
            get_win_state: async (args: z.infer<typeof Contracts.MatchWinStateInputSchema>): Promise<z.infer<typeof Contracts.MatchWinStateOutputSchema>> => this.request('match', 'GET', `/matches/${args.matchId}/win-state`, args as Record<string, unknown>),
        },
        ministry: {
            get_evaluation: async (args: z.infer<typeof Contracts.MinistryGetEvaluationInputSchema>): Promise<z.infer<typeof Contracts.DesiredStateSchema>> => this.request('ministry', 'GET', `/matches/${args.matchId}/ministries/${args.side}/evaluation`, args as Record<string, unknown>),
            update_doctrine: async (args: z.infer<typeof Contracts.MinistryUpdateDoctrineInputSchema>): Promise<z.infer<typeof Contracts.MinistryUpdateDoctrineOutputSchema>> => this.request('ministry', 'PATCH', `/matches/${args.matchId}/ministries/${args.side}/doctrine`, args as Record<string, unknown>),
        },
        mission: {
            list: async (args: z.infer<typeof Contracts.MissionListInputSchema>): Promise<z.infer<typeof Contracts.MissionListOutputSchema>> => this.request('mission', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/missions`, args as Record<string, unknown>),
            create: async (args: z.infer<typeof Contracts.MissionCreateInputSchema>): Promise<z.infer<typeof Contracts.MissionSchema>> => this.request('mission', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/missions`, args as Record<string, unknown>),
            get_tasks: async (args: z.infer<typeof Contracts.MissionGetTasksInputSchema>): Promise<z.infer<typeof Contracts.MissionGetTasksOutputSchema>> => this.request('mission', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/tasks`, args as Record<string, unknown>),
        },
        nav: {
            get: async (args: z.infer<typeof Contracts.NavGetInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('nav', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/navigation`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.NavUpdateInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('nav', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/navigation`, args as Record<string, unknown>),
            list_waypoints: async (args: z.infer<typeof Contracts.NavListWaypointsInputSchema>): Promise<z.infer<typeof Contracts.NavListWaypointsOutputSchema>> => this.request('nav', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args as Record<string, unknown>),
            add_waypoint: async (args: z.infer<typeof Contracts.NavAddWaypointInputSchema>): Promise<z.infer<typeof Contracts.NavListWaypointsOutputSchema>> => this.request('nav', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args as Record<string, unknown>),
            clear_waypoints: async (args: z.infer<typeof Contracts.NavClearWaypointsInputSchema>): Promise<z.infer<typeof Contracts.NavClearWaypointsOutputSchema>> => this.request('nav', 'DELETE', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args as Record<string, unknown>),
            join_formation: async (args: z.infer<typeof Contracts.NavJoinFormationInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('nav', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/navigation/formation`, args as Record<string, unknown>),
            break_formation: async (args: z.infer<typeof Contracts.NavBreakFormationInputSchema>): Promise<z.infer<typeof Contracts.NavBreakFormationOutputSchema>> => this.request('nav', 'DELETE', `/matches/${args.matchId}/entities/${args.entityId}/navigation/formation`, args as Record<string, unknown>),
        },
        orbital: {
            get_elements: async (args: z.infer<typeof Contracts.OrbitalGetInputSchema>): Promise<z.infer<typeof Contracts.OrbitalStateSchema>> => this.request('orbital', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/orbital`, args as Record<string, unknown>),
            update_elements: async (args: z.infer<typeof Contracts.OrbitalUpdateInputSchema>): Promise<z.infer<typeof Contracts.OrbitalStateSchema>> => this.request('orbital', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/orbital`, args as Record<string, unknown>),
            predict_pass: async (args: z.infer<typeof Contracts.OrbitalPredictInputSchema>): Promise<z.infer<typeof Contracts.OrbitalPredictOutputSchema>> => this.request('orbital', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/orbital/passes`, args as Record<string, unknown>),
        },
        propulsion: {
            get: async (args: z.infer<typeof Contracts.PropulsionGetInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('propulsion', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/propulsion`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.PropulsionUpdateInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('propulsion', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/propulsion`, args as Record<string, unknown>),
            set_state: async (args: z.infer<typeof Contracts.PropulsionSetStateInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('propulsion', 'PUT', `/matches/${args.matchId}/entities/${args.entityId}/propulsion/state`, args as Record<string, unknown>),
        },
        qa: {
            test_weapon: async (args: z.infer<typeof Contracts.TestWeaponInputSchema>): Promise<z.infer<typeof Contracts.TestWeaponOutputSchema>> => this.request('qa', 'POST', `/qa/test-weapon`, args as Record<string, unknown>),
        },
        sensor: {
            list: async (args: z.infer<typeof Contracts.SensorListInputSchema>): Promise<z.infer<typeof Contracts.SensorListOutputSchema>> => this.request('sensor', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/sensors`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.SensorUpdateInputSchema>): Promise<z.infer<typeof Contracts.SensorStateSchema>> => this.request('sensor', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/sensors/${args.index}`, args as Record<string, unknown>),
            set_emcon: async (args: z.infer<typeof Contracts.SensorSetEmconInputSchema>): Promise<z.infer<typeof Contracts.SensorSetEmconOutputSchema>> => this.request('sensor', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/sensors/emcon`, args as Record<string, unknown>),
            add_detection: async (args: z.infer<typeof Contracts.SensorAddDetectionInputSchema>): Promise<z.infer<typeof Contracts.SensorAddDetectionOutputSchema>> => this.request('sensor', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/detections`, args as Record<string, unknown>),
        },
        side: {
            get_roe: async (args: z.infer<typeof Contracts.SideGetROEInputSchema>): Promise<z.infer<typeof Contracts.SideGetROEOutputSchema>> => this.request('side', 'GET', `/matches/${args.matchId}/sides/${args.side}/roe`, args as Record<string, unknown>),
            update_roe: async (args: z.infer<typeof Contracts.SideUpdateROEInputSchema>): Promise<z.infer<typeof Contracts.SideGetROEOutputSchema>> => this.request('side', 'PATCH', `/matches/${args.matchId}/sides/${args.side}/roe`, args as Record<string, unknown>),
        },
        signature: {
            get: async (args: z.infer<typeof Contracts.SignatureGetInputSchema>): Promise<z.infer<typeof Contracts.SignatureStateSchema>> => this.request('signature', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/signature`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.SignatureUpdateInputSchema>): Promise<z.infer<typeof Contracts.SignatureStateSchema>> => this.request('signature', 'PATCH', `/matches/${args.matchId}/entities/${args.entityId}/signature`, args as Record<string, unknown>),
        },
        cm: {
            deploy: async (args: z.infer<typeof Contracts.CMDeployInputSchema>): Promise<z.infer<typeof Contracts.CMDeployOutputSchema>> => this.request('cm', 'POST', `/matches/${args.matchId}/entities/${args.entityId}/countermeasures/deploy`, args as Record<string, unknown>),
            get_inventory: async (args: z.infer<typeof Contracts.CMGetInventoryInputSchema>): Promise<z.infer<typeof Contracts.CMGetInventoryOutputSchema>> => this.request('cm', 'GET', `/matches/${args.matchId}/entities/${args.entityId}/countermeasures`, args as Record<string, unknown>),
        },
        sim: {
            get: async (args: z.infer<typeof Contracts.SimGetInputSchema>): Promise<z.infer<typeof Contracts.SimGetOutputSchema>> => this.request('sim', 'GET', `/matches/${args.matchId}/simulation`, args as Record<string, unknown>),
            step: async (args: z.infer<typeof Contracts.SimStepInputSchema>): Promise<z.infer<typeof Contracts.SimStepOutputSchema>> => this.request('sim', 'POST', `/matches/${args.matchId}/simulation/step`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.SimUpdateInputSchema>): Promise<z.infer<typeof Contracts.SimUpdateOutputSchema>> => this.request('sim', 'PATCH', `/matches/${args.matchId}/simulation`, args as Record<string, unknown>),
            pause: async (args: z.infer<typeof Contracts.SimGetInputSchema>): Promise<z.infer<typeof Contracts.SimUpdateOutputSchema>> => this.request('sim', 'POST', `/matches/${args.matchId}/simulation/pause`, args as Record<string, unknown>),
            resume: async (args: z.infer<typeof Contracts.SimGetInputSchema>): Promise<z.infer<typeof Contracts.SimUpdateOutputSchema>> => this.request('sim', 'POST', `/matches/${args.matchId}/simulation/resume`, args as Record<string, unknown>),
            set_speed: async (args: z.infer<typeof Contracts.SimSetSpeedInputSchema>): Promise<z.infer<typeof Contracts.SimUpdateOutputSchema>> => this.request('sim', 'POST', `/matches/${args.matchId}/simulation/speed`, args as Record<string, unknown>),
            get_metrics: async (args: z.infer<typeof Contracts.SimGetMetricsInputSchema>): Promise<z.infer<typeof Contracts.SimMetricsOutputSchema>> => this.request('sim', 'GET', `/simulation/metrics`, args as Record<string, unknown>),
            get_stream: (args: z.infer<typeof Contracts.SimGetInputSchema>): AsyncIterable<z.infer<typeof Contracts.SimulationEventSchema>> => this.stream('sim', 'GET', `/matches/${args.matchId}/simulation/stream`, args as Record<string, unknown>),
        },
        track: {
            list: async (args: z.infer<typeof Contracts.TrackListInputSchema>): Promise<z.infer<typeof Contracts.TrackListOutputSchema>> => this.request('track', 'GET', `/matches/${args.matchId}/tracks`, args as Record<string, unknown>),
            get: async (args: z.infer<typeof Contracts.TrackGetInputSchema>): Promise<z.infer<typeof Contracts.TrackSchema>> => this.request('track', 'GET', `/matches/${args.matchId}/tracks/${args.trackId}`, args as Record<string, unknown>),
            update: async (args: z.infer<typeof Contracts.TrackUpdateInputSchema>): Promise<z.infer<typeof Contracts.TrackSchema>> => this.request('track', 'PATCH', `/matches/${args.matchId}/tracks/${args.trackId}`, args as Record<string, unknown>),
            delete: async (args: z.infer<typeof Contracts.TrackDeleteInputSchema>): Promise<z.infer<typeof Contracts.TrackDeleteOutputSchema>> => this.request('track', 'DELETE', `/matches/${args.matchId}/tracks/${args.trackId}`, args as Record<string, unknown>),
        },
        worker: {
            list: async (args: z.infer<typeof Contracts.WorkerListInputSchema>): Promise<z.infer<typeof Contracts.WorkerListOutputSchema>> => this.request('worker', 'GET', `/workers`, args as Record<string, unknown>),
            get_stats: async (args: z.infer<typeof Contracts.WorkerGetStatsInputSchema>): Promise<z.infer<typeof Contracts.WorkerPoolStatsSchema>> => this.request('worker', 'GET', `/workers/${args.poolName}`, args as Record<string, unknown>),
        },
    };
}
