import { z } from 'zod';
import * as Contracts from '../contracts/index.js';

export class WarGamesClientV2 {
    constructor(private baseUrl: string) {}

    private async request<TOut>(method: string, path: string, args: any): Promise<TOut> {
        let url = this.baseUrl + path;
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
        return response.json();
    }

    private async *stream<TOut>(method: string, path: string, args: any): AsyncIterable<TOut> {
        let url = this.baseUrl + path;
        const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
        
        if (method === 'GET') {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(args)) {
                if (value === undefined) continue;
                queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            }
            const qs = queryParams.toString();
            if (qs) url += '?' + qs;
        } else {
            options.body = JSON.stringify(args);
        }

        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Stream failed: ${response.status} - ${await response.text()}`);
        if (!response.body) throw new Error('Response body is empty');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try { yield JSON.parse(line.substring(6)); } catch (e) {} 
                }
            }
        }
    }

    public api = {
        agent: {
            create: async (args: z.infer<typeof Contracts.AgentCreateInputSchema>): Promise<z.infer<typeof Contracts.AgentSchema>> => this.request('POST', `/agents`, args),
            list: async (args: z.infer<typeof Contracts.AgentListInputSchema>): Promise<z.infer<typeof Contracts.AgentListOutputSchema>> => this.request('GET', `/agents`, args),
            delete: async (args: z.infer<typeof Contracts.AgentDeleteInputSchema>): Promise<z.infer<typeof Contracts.AgentDeleteOutputSchema>> => this.request('DELETE', `/agents/${args.agentId}`, args),
            seed: async (args: z.infer<typeof Contracts.AgentSeedInputSchema>): Promise<z.infer<typeof Contracts.AgentSeedOutputSchema>> => this.request('POST', `/agents/seed`, args),
            thread_create: async (args: z.infer<typeof Contracts.ThreadCreateInputSchema>): Promise<z.infer<typeof Contracts.ThreadSchema>> => this.request('POST', `/agents/${args.agentId}/threads`, args),
            thread_history: async (args: z.infer<typeof Contracts.ThreadHistoryInputSchema>): Promise<z.infer<typeof Contracts.ThreadHistoryOutputSchema>> => this.request('GET', `/threads/${args.threadId}/history`, args),
            run_stream: (args: z.infer<typeof Contracts.AgentRunStreamInputSchema>): AsyncIterable<z.infer<typeof Contracts.AgentEventSchema>> => this.stream('POST', `/threads/${args.threadId}/run`, args),
        },
        automation: {
            list_events: async (args: z.infer<typeof Contracts.AutomationListEventsInputSchema>): Promise<z.infer<typeof Contracts.AutomationListEventsOutputSchema>> => this.request('GET', `/matches/${args.matchId}/automation/events`, args),
            trigger_event: async (args: z.infer<typeof Contracts.AutomationTriggerEventInputSchema>): Promise<z.infer<typeof Contracts.AutomationTriggerEventOutputSchema>> => this.request('POST', `/matches/${args.matchId}/automation/events/${args.eventId}/trigger`, args),
            get_results: async (args: z.infer<typeof Contracts.AutomationGetResultsInputSchema>): Promise<z.infer<typeof Contracts.AutomationGetResultsOutputSchema>> => this.request('GET', `/matches/${args.matchId}/automation/assertions`, args),
        },
        bug: {
            list: async (args: z.infer<typeof Contracts.BugListInputSchema>): Promise<z.infer<typeof Contracts.BugListOutputSchema>> => this.request('GET', `/bugs`, args),
            create: async (args: z.infer<typeof Contracts.BugCreateInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('POST', `/bugs`, args),
            get: async (args: z.infer<typeof Contracts.BugGetInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('GET', `/bugs/${args.id}`, args),
            update: async (args: z.infer<typeof Contracts.BugUpdateInputSchema>): Promise<z.infer<typeof Contracts.BugReportSchema>> => this.request('PATCH', `/bugs/${args.id}`, args),
            add_comment: async (args: z.infer<typeof Contracts.BugAddCommentInputSchema>): Promise<z.infer<typeof Contracts.BugCommentSchema>> => this.request('POST', `/bugs/${args.bugId}/comments`, args),
        },
        combat: {
            get: async (args: z.infer<typeof Contracts.CombatGetInputSchema>): Promise<z.infer<typeof Contracts.CombatStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/combat`, args),
            fire: async (args: z.infer<typeof Contracts.CombatFireInputSchema>): Promise<z.infer<typeof Contracts.CombatFireOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/combat/fire`, args),
            fire_salvo: async (args: z.infer<typeof Contracts.CombatFireSalvoInputSchema>): Promise<z.infer<typeof Contracts.CombatFireSalvoOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/combat/salvo`, args),
            list_mounts: async (args: z.infer<typeof Contracts.CombatListMountsInputSchema>): Promise<z.infer<typeof Contracts.CombatListMountsOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/combat/mounts`, args),
            get_wra: async (args: z.infer<typeof Contracts.CombatGetWRAInputSchema>): Promise<z.infer<typeof Contracts.CombatGetWRAOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/combat/wra`, args),
            update_wra: async (args: z.infer<typeof Contracts.CombatUpdateWRAInputSchema>): Promise<z.infer<typeof Contracts.CombatGetWRAOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/combat/wra`, args),
            update_roe: async (args: z.infer<typeof Contracts.CombatUpdateROEInputSchema>): Promise<z.infer<typeof Contracts.CombatUpdateROEOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/combat/roe`, args),
        },
        datalink: {
            get: async (args: z.infer<typeof Contracts.DatalinkGetInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/datalink`, args),
            update_network: async (args: z.infer<typeof Contracts.DatalinkUpdateNetworkInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/datalink/network`, args),
            set_emissions: async (args: z.infer<typeof Contracts.DatalinkSetEmissionsInputSchema>): Promise<z.infer<typeof Contracts.DatalinkStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/datalink/emissions`, args),
        },
        db: {
            profile_list: async (args: z.infer<typeof Contracts.DBProfileListInputSchema>): Promise<z.infer<typeof Contracts.DBProfileListOutputSchema>> => this.request('GET', `/db/profiles`, args),
            profile_get: async (args: z.infer<typeof Contracts.DBProfileGetInputSchema>): Promise<z.infer<typeof Contracts.EntityProfileSchema>> => this.request('GET', `/db/profiles/${args.id}`, args),
            profile_create: async (args: z.infer<typeof Contracts.DBProfileCreateInputSchema>): Promise<z.infer<typeof Contracts.DBProfileCreateOutputSchema>> => this.request('POST', `/db/profiles`, args),
            weapon_list: async (args: z.infer<typeof Contracts.DBWeaponListInputSchema>): Promise<z.infer<typeof Contracts.DBWeaponListOutputSchema>> => this.request('GET', `/db/weapons`, args),
            weapon_get: async (args: z.infer<typeof Contracts.DBWeaponGetInputSchema>): Promise<z.infer<typeof Contracts.WeaponProfileSchema>> => this.request('GET', `/db/weapons/${args.id}`, args),
            scenario_list: async (args: z.infer<typeof Contracts.DBScenarioListInputSchema>): Promise<z.infer<typeof Contracts.DBScenarioListOutputSchema>> => this.request('GET', `/db/scenarios`, args),
            scenario_get: async (args: z.infer<typeof Contracts.DBScenarioGetInputSchema>): Promise<z.infer<typeof Contracts.ScenarioManifestSchema>> => this.request('GET', `/db/scenarios/${args.id}`, args),
            seed: async (args: z.infer<typeof Contracts.DBSeedInputSchema>): Promise<z.infer<typeof Contracts.DBSeedOutputSchema>> => this.request('POST', `/db/seed`, args),
        },
        entity: {
            list: async (args: z.infer<typeof Contracts.EntityListInputSchema>): Promise<z.infer<typeof Contracts.EntityListOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities`, args),
            get: async (args: z.infer<typeof Contracts.EntityGetInputSchema>): Promise<z.infer<typeof Contracts.EntitySummarySchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}`, args),
            create: async (args: z.infer<typeof Contracts.EntityCreateInputSchema>): Promise<z.infer<typeof Contracts.EntitySummarySchema>> => this.request('POST', `/matches/${args.matchId}/entities`, args),
            delete: async (args: z.infer<typeof Contracts.EntityDeleteInputSchema>): Promise<z.infer<typeof Contracts.EntityDeleteOutputSchema>> => this.request('DELETE', `/matches/${args.matchId}/entities/${args.entityId}`, args),
            get_status: async (args: z.infer<typeof Contracts.EntityStatusInputSchema>): Promise<z.infer<typeof Contracts.EntityStatusOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/status`, args),
        },
        env: {
            get: async (args: z.infer<typeof Contracts.EnvGetInputSchema>): Promise<z.infer<typeof Contracts.EnvironmentStateSchema>> => this.request('GET', `/matches/${args.matchId}/environment`, args),
            update: async (args: z.infer<typeof Contracts.EnvUpdateInputSchema>): Promise<z.infer<typeof Contracts.EnvironmentStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/environment`, args),
            sample_terrain: async (args: z.infer<typeof Contracts.EnvSampleTerrainInputSchema>): Promise<z.infer<typeof Contracts.EnvSampleTerrainOutputSchema>> => this.request('GET', `/matches/${args.matchId}/environment/terrain`, args),
            sample_ocean: async (args: z.infer<typeof Contracts.EnvSampleOceanInputSchema>): Promise<z.infer<typeof Contracts.EnvSampleOceanOutputSchema>> => this.request('GET', `/matches/${args.matchId}/environment/ocean`, args),
            get_borders: async (args: z.infer<typeof Contracts.EnvGetBordersInputSchema>): Promise<z.infer<typeof Contracts.EnvGetBordersOutputSchema>> => this.request('GET', `/matches/${args.matchId}/environment/borders`, args),
            set_time: async (args: z.infer<typeof Contracts.EnvSetTimeInputSchema>): Promise<z.infer<typeof Contracts.EnvSetTimeOutputSchema>> => this.request('PUT', `/matches/${args.matchId}/environment/time`, args),
            prefetch_terrain: async (args: z.infer<typeof Contracts.EnvPrefetchTerrainInputSchema>): Promise<z.infer<typeof Contracts.EnvPrefetchTerrainOutputSchema>> => this.request('POST', `/matches/${args.matchId}/environment/terrain/prefetch`, args),
            get_cache_stats: async (args: z.infer<typeof Contracts.EnvGetCacheStatsInputSchema>): Promise<z.infer<typeof Contracts.EnvGetCacheStatsOutputSchema>> => this.request('GET', `/env/terrain/cache`, args),
        },
        ew: {
            get_jammer: async (args: z.infer<typeof Contracts.EWGetJammerInputSchema>): Promise<z.infer<typeof Contracts.JammerStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer`, args),
            set_jammer_state: async (args: z.infer<typeof Contracts.EWSetJammerStateInputSchema>): Promise<z.infer<typeof Contracts.JammerStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer/state`, args),
            assign_jammer_target: async (args: z.infer<typeof Contracts.EWAssignJammerTargetInputSchema>): Promise<z.infer<typeof Contracts.EWAssignJammerTargetOutputSchema>> => this.request('PUT', `/matches/${args.matchId}/entities/${args.entityId}/ew/jammer/target`, args),
            get_sigint: async (args: z.infer<typeof Contracts.EWGetSIGINTInputSchema>): Promise<z.infer<typeof Contracts.SIGINTStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/ew/sigint`, args),
        },
        group: {
            list: async (args: z.infer<typeof Contracts.GroupListInputSchema>): Promise<z.infer<typeof Contracts.GroupListOutputSchema>> => this.request('GET', `/matches/${args.matchId}/groups`, args),
            get: async (args: z.infer<typeof Contracts.GroupGetInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('GET', `/matches/${args.matchId}/groups/${args.groupId}`, args),
            create: async (args: z.infer<typeof Contracts.GroupCreateInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('POST', `/matches/${args.matchId}/groups`, args),
            set_leader: async (args: z.infer<typeof Contracts.GroupSetLeaderInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('PUT', `/matches/${args.matchId}/groups/${args.groupId}/leader`, args),
            set_parameters: async (args: z.infer<typeof Contracts.GroupSetParametersInputSchema>): Promise<z.infer<typeof Contracts.GroupStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/groups/${args.groupId}/parameters`, args),
        },
        guidance: {
            get: async (args: z.infer<typeof Contracts.GuidanceGetInputSchema>): Promise<z.infer<typeof Contracts.GuidanceStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/guidance`, args),
            update: async (args: z.infer<typeof Contracts.GuidanceUpdateInputSchema>): Promise<z.infer<typeof Contracts.GuidanceStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/guidance`, args),
            set_target: async (args: z.infer<typeof Contracts.GuidanceSetTargetInputSchema>): Promise<z.infer<typeof Contracts.GuidanceSetTargetOutputSchema>> => this.request('PUT', `/matches/${args.matchId}/entities/${args.entityId}/guidance/target`, args),
        },
        history: {
            list_telemetry: async (args: z.infer<typeof Contracts.HistoryListTelemetryInputSchema>): Promise<z.infer<typeof Contracts.HistoryListTelemetryOutputSchema>> => this.request('GET', `/history/${args.batchId}/telemetry/${args.entityId}`, args),
            get_heatmap: async (args: z.infer<typeof Contracts.HistoryGetHeatmapInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetHeatmapOutputSchema>> => this.request('GET', `/history/${args.batchId}/heatmap`, args),
            list_events: async (args: z.infer<typeof Contracts.HistoryListEventsInputSchema>): Promise<z.infer<typeof Contracts.HistoryListEventsOutputSchema>> => this.request('GET', `/history/${args.batchId}/events`, args),
            get_losses: async (args: z.infer<typeof Contracts.HistoryGetLossesInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetLossesOutputSchema>> => this.request('GET', `/history/${args.batchId}/losses`, args),
            aggregate_metrics: async (args: z.infer<typeof Contracts.HistoryAggregateMetricsInputSchema>): Promise<z.infer<typeof Contracts.HistoryAggregateMetricsOutputSchema>> => this.request('GET', `/history/${args.batchId}/metrics`, args),
            get_entity_samples: async (args: z.infer<typeof Contracts.HistoryGetEntitySamplesInputSchema>): Promise<z.infer<typeof Contracts.HistoryGetEntitySamplesOutputSchema>> => this.request('GET', `/history/${args.batchId}/telemetry/${args.entityId}/samples`, args),
        },
        kinematics: {
            get: async (args: z.infer<typeof Contracts.KinematicsGetInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/kinematics`, args),
            update: async (args: z.infer<typeof Contracts.KinematicsUpdateInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/kinematics`, args),
            set_position: async (args: z.infer<typeof Contracts.KinematicsSetPositionInputSchema>): Promise<z.infer<typeof Contracts.KinematicsStateSchema>> => this.request('PUT', `/matches/${args.matchId}/entities/${args.entityId}/kinematics/position`, args),
            apply_force: async (args: z.infer<typeof Contracts.KinematicsApplyForceInputSchema>): Promise<z.infer<typeof Contracts.KinematicsApplyForceOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/kinematics/force`, args),
        },
        logistics: {
            get: async (args: z.infer<typeof Contracts.LogisticsGetInputSchema>): Promise<z.infer<typeof Contracts.LogisticsStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/logistics`, args),
            update_state: async (args: z.infer<typeof Contracts.LogisticsUpdateStateInputSchema>): Promise<z.infer<typeof Contracts.LogisticsStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/logistics/state`, args),
            transfer: async (args: z.infer<typeof Contracts.LogisticsTransferInputSchema>): Promise<z.infer<typeof Contracts.LogisticsTransferOutputSchema>> => this.request('POST', `/matches/${args.matchId}/logistics/transfer`, args),
            apply_damage: async (args: z.infer<typeof Contracts.LogisticsApplyDamageInputSchema>): Promise<z.infer<typeof Contracts.LogisticsApplyDamageOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/damage`, args),
            land: async (args: z.infer<typeof Contracts.LogisticsLandInputSchema>): Promise<z.infer<typeof Contracts.LogisticsLandOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/land`, args),
            launch: async (args: z.infer<typeof Contracts.LogisticsLaunchInputSchema>): Promise<z.infer<typeof Contracts.LogisticsLaunchOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/logistics/launch`, args),
        },
        map: {
            list_regions: async (args: z.infer<typeof Contracts.MapListRegionsInputSchema>): Promise<z.infer<typeof Contracts.MapListRegionsOutputSchema>> => this.request('GET', `/map/regions`, args),
            get_overlay: async (args: z.infer<typeof Contracts.MapGetOverlayInputSchema>): Promise<z.infer<typeof Contracts.MapGetOverlayOutputSchema>> => this.request('GET', `/map/overlays/${args.overlayId}`, args),
            get_los: async (args: z.infer<typeof Contracts.MapGetLOSInputSchema>): Promise<z.infer<typeof Contracts.MapGetLOSOutputSchema>> => this.request('GET', `/matches/${args.matchId}/map/los`, args),
            calculate_distance: async (args: z.infer<typeof Contracts.MapCalculateDistanceInputSchema>): Promise<z.infer<typeof Contracts.MapCalculateDistanceOutputSchema>> => this.request('GET', `/map/distance`, args),
            list_zones: async (args: z.infer<typeof Contracts.MapListZonesInputSchema>): Promise<z.infer<typeof Contracts.MapListZonesOutputSchema>> => this.request('GET', `/matches/${args.matchId}/map/zones`, args),
            update_zone: async (args: z.infer<typeof Contracts.MapUpdateZoneInputSchema>): Promise<z.infer<typeof Contracts.TacticalZoneSchema>> => this.request('PATCH', `/matches/${args.matchId}/map/zones/${args.zoneId}`, args),
            create_zone: async (args: z.infer<typeof Contracts.MapCreateZoneInputSchema>): Promise<z.infer<typeof Contracts.TacticalZoneSchema>> => this.request('POST', `/matches/${args.matchId}/map/zones`, args),
            get_elevation_profile: async (args: z.infer<typeof Contracts.MapGetElevationProfileInputSchema>): Promise<z.infer<typeof Contracts.MapGetElevationProfileOutputSchema>> => this.request('GET', `/matches/${args.matchId}/map/elevation-profile`, args),
            convert: async (args: z.infer<typeof Contracts.MapConvertCoordinatesInputSchema>): Promise<z.infer<typeof Contracts.MapConvertCoordinatesOutputSchema>> => this.request('POST', `/map/convert`, args),
        },
        match: {
            list: async (args: z.infer<typeof Contracts.MatchListInputSchema>): Promise<z.infer<typeof Contracts.MatchListOutputSchema>> => this.request('GET', `/matches`, args),
            create: async (args: z.infer<typeof Contracts.MatchCreateInputSchema>): Promise<z.infer<typeof Contracts.MatchCreateOutputSchema>> => this.request('POST', `/matches`, args),
            get: async (args: z.infer<typeof Contracts.MatchGetInputSchema>): Promise<z.infer<typeof Contracts.MatchSchema>> => this.request('GET', `/matches/${args.matchId}`, args),
            update: async (args: z.infer<typeof Contracts.MatchUpdateInputSchema>): Promise<z.infer<typeof Contracts.MatchSchema>> => this.request('PATCH', `/matches/${args.matchId}`, args),
            delete: async (args: z.infer<typeof Contracts.MatchDeleteInputSchema>): Promise<z.infer<typeof Contracts.MatchDeleteOutputSchema>> => this.request('DELETE', `/matches/${args.matchId}`, args),
            get_win_state: async (args: z.infer<typeof Contracts.MatchWinStateInputSchema>): Promise<z.infer<typeof Contracts.MatchWinStateOutputSchema>> => this.request('GET', `/matches/${args.matchId}/win-state`, args),
        },
        ministry: {
            get_evaluation: async (args: z.infer<typeof Contracts.MinistryGetEvaluationInputSchema>): Promise<z.infer<typeof Contracts.DesiredStateSchema>> => this.request('GET', `/matches/${args.matchId}/ministries/${args.side}/evaluation`, args),
            update_doctrine: async (args: z.infer<typeof Contracts.MinistryUpdateDoctrineInputSchema>): Promise<z.infer<typeof Contracts.MinistryUpdateDoctrineOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/ministries/${args.side}/doctrine`, args),
        },
        mission: {
            list: async (args: z.infer<typeof Contracts.MissionListInputSchema>): Promise<z.infer<typeof Contracts.MissionListOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/missions`, args),
            create: async (args: z.infer<typeof Contracts.MissionCreateInputSchema>): Promise<z.infer<typeof Contracts.MissionSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/missions`, args),
            get_tasks: async (args: z.infer<typeof Contracts.MissionGetTasksInputSchema>): Promise<z.infer<typeof Contracts.MissionGetTasksOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/tasks`, args),
        },
        nav: {
            get: async (args: z.infer<typeof Contracts.NavGetInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/navigation`, args),
            update: async (args: z.infer<typeof Contracts.NavUpdateInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/navigation`, args),
            list_waypoints: async (args: z.infer<typeof Contracts.NavListWaypointsInputSchema>): Promise<z.infer<typeof Contracts.NavListWaypointsOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args),
            add_waypoint: async (args: z.infer<typeof Contracts.NavAddWaypointInputSchema>): Promise<z.infer<typeof Contracts.NavListWaypointsOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args),
            clear_waypoints: async (args: z.infer<typeof Contracts.NavClearWaypointsInputSchema>): Promise<z.infer<typeof Contracts.NavClearWaypointsOutputSchema>> => this.request('DELETE', `/matches/${args.matchId}/entities/${args.entityId}/navigation/waypoints`, args),
            join_formation: async (args: z.infer<typeof Contracts.NavJoinFormationInputSchema>): Promise<z.infer<typeof Contracts.NavigationStateSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/navigation/formation`, args),
            break_formation: async (args: z.infer<typeof Contracts.NavBreakFormationInputSchema>): Promise<z.infer<typeof Contracts.NavBreakFormationOutputSchema>> => this.request('DELETE', `/matches/${args.matchId}/entities/${args.entityId}/navigation/formation`, args),
        },
        orbital: {
            get_elements: async (args: z.infer<typeof Contracts.OrbitalGetInputSchema>): Promise<z.infer<typeof Contracts.OrbitalStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/orbital`, args),
            update_elements: async (args: z.infer<typeof Contracts.OrbitalUpdateInputSchema>): Promise<z.infer<typeof Contracts.OrbitalStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/orbital`, args),
            predict_pass: async (args: z.infer<typeof Contracts.OrbitalPredictInputSchema>): Promise<z.infer<typeof Contracts.OrbitalPredictOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/orbital/passes`, args),
        },
        propulsion: {
            get: async (args: z.infer<typeof Contracts.PropulsionGetInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/propulsion`, args),
            update: async (args: z.infer<typeof Contracts.PropulsionUpdateInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/propulsion`, args),
            set_state: async (args: z.infer<typeof Contracts.PropulsionSetStateInputSchema>): Promise<z.infer<typeof Contracts.PropulsionStateSchema>> => this.request('PUT', `/matches/${args.matchId}/entities/${args.entityId}/propulsion/state`, args),
        },
        qa: {
            test_weapon: async (args: z.infer<typeof Contracts.TestWeaponInputSchema>): Promise<z.infer<typeof Contracts.TestWeaponOutputSchema>> => this.request('POST', `/qa/test-weapon`, args),
        },
        sensor: {
            list: async (args: z.infer<typeof Contracts.SensorListInputSchema>): Promise<z.infer<typeof Contracts.SensorListOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/sensors`, args),
            update: async (args: z.infer<typeof Contracts.SensorUpdateInputSchema>): Promise<z.infer<typeof Contracts.SensorStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/sensors/${args.index}`, args),
            set_emcon: async (args: z.infer<typeof Contracts.SensorSetEmconInputSchema>): Promise<z.infer<typeof Contracts.SensorSetEmconOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/sensors/emcon`, args),
            add_detection: async (args: z.infer<typeof Contracts.SensorAddDetectionInputSchema>): Promise<z.infer<typeof Contracts.SensorAddDetectionOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/detections`, args),
        },
        side: {
            get_roe: async (args: z.infer<typeof Contracts.SideGetROEInputSchema>): Promise<z.infer<typeof Contracts.SideGetROEOutputSchema>> => this.request('GET', `/matches/${args.matchId}/sides/${args.side}/roe`, args),
            update_roe: async (args: z.infer<typeof Contracts.SideUpdateROEInputSchema>): Promise<z.infer<typeof Contracts.SideGetROEOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/sides/${args.side}/roe`, args),
        },
        signature: {
            get: async (args: z.infer<typeof Contracts.SignatureGetInputSchema>): Promise<z.infer<typeof Contracts.SignatureStateSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/signature`, args),
            update: async (args: z.infer<typeof Contracts.SignatureUpdateInputSchema>): Promise<z.infer<typeof Contracts.SignatureStateSchema>> => this.request('PATCH', `/matches/${args.matchId}/entities/${args.entityId}/signature`, args),
        },
        cm: {
            deploy: async (args: z.infer<typeof Contracts.CMDeployInputSchema>): Promise<z.infer<typeof Contracts.CMDeployOutputSchema>> => this.request('POST', `/matches/${args.matchId}/entities/${args.entityId}/countermeasures/deploy`, args),
            get_inventory: async (args: z.infer<typeof Contracts.CMGetInventoryInputSchema>): Promise<z.infer<typeof Contracts.CMGetInventoryOutputSchema>> => this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/countermeasures`, args),
        },
        sim: {
            get: async (args: z.infer<typeof Contracts.SimGetInputSchema>): Promise<z.infer<typeof Contracts.SimGetOutputSchema>> => this.request('GET', `/matches/${args.matchId}/simulation`, args),
            step: async (args: z.infer<typeof Contracts.SimStepInputSchema>): Promise<z.infer<typeof Contracts.SimStepOutputSchema>> => this.request('POST', `/matches/${args.matchId}/simulation/step`, args),
            update: async (args: z.infer<typeof Contracts.SimUpdateInputSchema>): Promise<z.infer<typeof Contracts.SimUpdateOutputSchema>> => this.request('PATCH', `/matches/${args.matchId}/simulation`, args),
            get_metrics: async (args: z.infer<typeof Contracts.SimGetMetricsInputSchema>): Promise<z.infer<typeof Contracts.SimMetricsOutputSchema>> => this.request('GET', `/simulation/metrics`, args),
            get_stream: (args: z.infer<typeof Contracts.SimGetInputSchema>): AsyncIterable<z.infer<typeof Contracts.SimulationEventSchema>> => this.stream('GET', `/matches/${args.matchId}/simulation/stream`, args),
        },
        track: {
            list: async (args: z.infer<typeof Contracts.TrackListInputSchema>): Promise<z.infer<typeof Contracts.TrackListOutputSchema>> => this.request('GET', `/matches/${args.matchId}/tracks`, args),
            get: async (args: z.infer<typeof Contracts.TrackGetInputSchema>): Promise<z.infer<typeof Contracts.TrackSchema>> => this.request('GET', `/matches/${args.matchId}/tracks/${args.trackId}`, args),
            update: async (args: z.infer<typeof Contracts.TrackUpdateInputSchema>): Promise<z.infer<typeof Contracts.TrackSchema>> => this.request('PATCH', `/matches/${args.matchId}/tracks/${args.trackId}`, args),
            delete: async (args: z.infer<typeof Contracts.TrackDeleteInputSchema>): Promise<z.infer<typeof Contracts.TrackDeleteOutputSchema>> => this.request('DELETE', `/matches/${args.matchId}/tracks/${args.trackId}`, args),
        },
        worker: {
            list: async (args: z.infer<typeof Contracts.WorkerListInputSchema>): Promise<z.infer<typeof Contracts.WorkerListOutputSchema>> => this.request('GET', `/workers`, args),
            get_stats: async (args: z.infer<typeof Contracts.WorkerGetStatsInputSchema>): Promise<z.infer<typeof Contracts.WorkerPoolStatsSchema>> => this.request('GET', `/workers/${args.poolName}`, args),
        },
    };
}
