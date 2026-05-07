import { EventEmitter } from '../../sdk/EventEmitter';

/**
 * MockGateway: A local-only message bus for UI-driven simulation mocks.
 * Used when the backend is offline or for rapid prototyping.
 */
export class MockGateway extends EventEmitter {
    private isConnected = false;

    async connect(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.isConnected = true;
                this.emit('connected');
                resolve();
            }, 100);
        });
    }

    send(msg: { type: string, payload: unknown }): void {
        if (!this.isConnected) return;
        
        // Mock Command Loopback
        setTimeout(() => {
            this.emit('message', {
                type: 'COMMAND_ACK',
                payload: { commandType: msg.type, success: true }
            });
        }, 10);
    }

    mockServerMessage(type: string, payload: unknown): void {
        this.emit('message', { type, payload });
    }
}

export const mockGateway = new MockGateway();
