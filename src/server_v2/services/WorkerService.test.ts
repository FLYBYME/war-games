import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerService } from './WorkerService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_WORKER_PATH = path.resolve(__dirname, '../workers/mock.worker.ts');

describe('WorkerService', () => {
    let service: WorkerService;

    beforeEach(() => {
        service = new WorkerService();
    });

    afterEach(() => {
        service.shutdown();
    });

    it('should create and manage a worker pool', async () => {
        service.createPool('test-pool', MOCK_WORKER_PATH, 2);
        const pool = service.getPool('test-pool');
        
        expect(pool.poolName).toBe('test-pool');
        const stats = pool.getStats();
        expect(stats.workerCount).toBe(2);
    });

    it('should execute jobs in the pool and report performance', async () => {
        service.createPool('test-pool', MOCK_WORKER_PATH, 1);
        const pool = service.getPool('test-pool');

        const result = await pool.execute<any>({ type: 'echo', data: 'hello' });
        expect(result.result).toBe('hello');
        
        const stats = pool.getStats();
        expect(stats.workers[0].jobsProcessed).toBe(1);
        expect(stats.workers[0].memory).toBeDefined();
        expect(stats.workers[0].memory?.heapUsed).toBeGreaterThan(0);
        expect(stats.workers[0].load).toBeDefined();
    });

    it('should handle multiple simultaneous jobs via queue', async () => {
        service.createPool('test-pool', MOCK_WORKER_PATH, 1);
        const pool = service.getPool('test-pool');

        const p1 = pool.execute<any>({ type: 'echo', data: '1' });
        const p2 = pool.execute<any>({ type: 'echo', data: '2' });

        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1.result).toBe('1');
        expect(r2.result).toBe('2');
    });

    it('should list all pools', () => {
        service.createPool('pool-a', MOCK_WORKER_PATH, 1);
        service.createPool('pool-b', MOCK_WORKER_PATH, 1);

        const pools = service.listPools();
        expect(pools).toHaveLength(2);
        expect(pools.map(p => p.poolName)).toContain('pool-a');
        expect(pools.map(p => p.poolName)).toContain('pool-b');
    });
});
