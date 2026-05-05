import { WarGamesClient } from '../../sdk/WarGamesClient.js';

// Bypassing proxy for WebSocket to debug connectivity issues
// The proxy seems to be failing to upgrade the connection.
const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const wsUrl = `ws://${hostname}:3000/ws`;

export const sdkClient = new WarGamesClient({ 
    url: wsUrl,
    connectTimeoutMs: 10000,
    maxReconnectAttempts: 20
});

// Setup a default match
sdkClient.connect().catch(e => console.warn('SDK Client failed to connect on load', e));
