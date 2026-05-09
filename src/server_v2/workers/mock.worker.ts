import { parentPort } from 'worker_threads';

if (parentPort) {
    parentPort.on('message', (msg) => {
        if (msg.type === 'echo') {
            parentPort!.postMessage({ 
                result: msg.data,
                __performance: {
                    memory: process.memoryUsage()
                }
            });
        } else if (msg.type === 'error') {
            throw new Error('Mock Worker Error');
        }
    });
}
