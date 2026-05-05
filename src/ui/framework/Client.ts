import { WarGamesClient } from '../../sdk/WarGamesClient.js';

export const sdkClient = new WarGamesClient({ url: 'ws://localhost:3000' });

// Setup a default match
sdkClient.connect().catch(e => console.warn('SDK Client failed to connect on load', e));
