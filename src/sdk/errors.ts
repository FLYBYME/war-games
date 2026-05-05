/**
 * SDK Error Hierarchy.
 * Strongly typed errors for every failure mode in the client SDK.
 */

export class SDKError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'SDKError';
    }
}

export class NetworkError extends SDKError {
    constructor(message: string, public readonly cause?: any) {
        super(message, 'NETWORK_ERROR');
        this.name = 'NetworkError';
    }
}

export class ConnectionTimeoutError extends SDKError {
    constructor(url: string, timeoutMs: number) {
        super(`Connection to ${url} timed out after ${timeoutMs}ms`, 'CONNECTION_TIMEOUT');
        this.name = 'ConnectionTimeoutError';
    }
}

export class CommandValidationError extends SDKError {
    constructor(commandType: string, reason: string) {
        super(`Invalid command "${commandType}": ${reason}`, 'COMMAND_VALIDATION');
        this.name = 'CommandValidationError';
    }
}

export class CommandRejectedError extends SDKError {
    constructor(commandType: string, serverError: string) {
        super(`Server rejected "${commandType}": ${serverError}`, 'COMMAND_REJECTED');
        this.name = 'CommandRejectedError';
    }
}

export class SideIsolationError extends SDKError {
    constructor(entityId: string) {
        super(`Side isolation violation: cannot command entity "${entityId}"`, 'SIDE_ISOLATION');
        this.name = 'SideIsolationError';
    }
}

export class NotConnectedError extends SDKError {
    constructor() {
        super('Client is not connected to a server', 'NOT_CONNECTED');
        this.name = 'NotConnectedError';
    }
}

export class NotJoinedError extends SDKError {
    constructor() {
        super('Client has not joined a match', 'NOT_JOINED');
        this.name = 'NotJoinedError';
    }
}
