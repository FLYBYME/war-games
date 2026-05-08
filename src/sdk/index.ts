/**
 * War Games Engine V3 — Client SDK
 *
 * Usage:
 *   import { WarGamesClient } from 'war-games/sdk';
 *
 *   const client = new WarGamesClient({ url: 'ws://localhost:3000' });
 *   await client.connect();
 *   client.joinMatch(Side.Blue);
 */

export { WarGamesClient, ConnectionState } from './WarGamesClient.js';
export type { ClientConfig } from './WarGamesClient.js';
export { ScenarioModule } from './ScenarioModule.js';
export { TerrainModule } from './TerrainModule.js';
export { BugModule } from './BugModule.js';
export { EventEmitter } from './EventEmitter.js';
export { Formatters } from './Formatters.js';
export { DeltaEncoder } from './DeltaEncoder.js';
export { DeltaDecoder } from './DeltaDecoder.js';
export {
    SDKError,
    NetworkError,
    ConnectionTimeoutError,
    CommandValidationError,
    CommandRejectedError,
    SideIsolationError,
    NotConnectedError,
    NotJoinedError
} from './errors.js';
export * from './schemas/index.js';

// Services (Moved to server/services)
