import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';

export interface WorkerStats {
    id: number;
    busy: boolean;
    jobsProcessed: number;
    errors: number;
    memory?: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    load?: number;
}

export interface PoolStats {
    poolName: string;
    workerCount: number;
    activeJobs: number;
    queuedJobs: number;
    workers: WorkerStats[];
}

/**
 * WorkerPool: Manages a pool of worker threads for a specific task type.
 */
class WorkerPool extends EventEmitter {
    private readonly workers: Array<{ worker: Worker, stats: WorkerStats }> = [];
    private readonly jobQueue: Array<{ job: any, resolve: Function, reject: Function }> = [];

    constructor(
        public readonly poolName: string,
        private readonly workerPath: string,
        private readonly size: number
    ) {
        super();
        this.init();
    }

    private init() {
        for (let i = 0; i < this.size; i++) {
            const worker = new Worker(this.workerPath, {
                execArgv: process.execArgv
            });
            const stats: WorkerStats = { id: i, busy: false, jobsProcessed: 0, errors: 0 };
            
            worker.on('message', (msg) => {
                // If message contains performance data, update stats
                if (msg.__performance) {
                    stats.memory = msg.__performance.memory;
                    // Calculate ELU (Load)
                    const elu = worker.performance.eventLoopUtilization();
                    stats.load = elu.utilization;
                }

                // If it's a job result (not just a stats heartbeat)
                if (msg.success !== undefined || msg.result !== undefined) {
                    const activeJob = this.jobQueue.shift();
                    stats.busy = false;
                    stats.jobsProcessed++;
                    if (activeJob) activeJob.resolve(msg);
                    this.processNext();
                }
            });

            worker.on('error', (err) => {
                stats.errors++;
                console.error(`WorkerPool [${this.poolName}] Worker ${i} Error:`, err);
                const activeJob = this.jobQueue.shift();
                if (activeJob) activeJob.reject(err);
                stats.busy = false;
                this.processNext();
            });

            this.workers.push({ worker, stats });
        }
    }

    public async execute<TOut>(job: any): Promise<TOut> {
        return new Promise((resolve, reject) => {
            this.jobQueue.push({ job, resolve, reject });
            this.processNext();
        });
    }

    private processNext() {
        const availableWorker = this.workers.find(w => !w.stats.busy);
        if (availableWorker && this.jobQueue.length > 0) {
            const next = this.jobQueue[0];
            availableWorker.stats.busy = true;
            availableWorker.worker.postMessage(next.job);
        }
    }

    public getStats(): PoolStats {
        return {
            poolName: this.poolName,
            workerCount: this.workers.length,
            activeJobs: this.workers.filter(w => w.stats.busy).length,
            queuedJobs: Math.max(0, this.jobQueue.length - this.workers.filter(w => w.stats.busy).length),
            workers: this.workers.map(w => ({ ...w.stats }))
        };
    }

    public shutdown() {
        for (const w of this.workers) {
            w.worker.terminate();
        }
    }
}

/**
 * WorkerService: A registry and manager for multiple worker pools.
 */
export class WorkerService {
    private readonly pools = new Map<string, WorkerPool>();

    public createPool(name: string, workerPath: string, size: number = 4): void {
        if (this.pools.has(name)) throw new Error(`Worker pool ${name} already exists`);
        this.pools.set(name, new WorkerPool(name, workerPath, size));
    }

    public getPool(name: string): WorkerPool {
        const pool = this.pools.get(name);
        if (!pool) throw new Error(`Worker pool ${name} not found`);
        return pool;
    }

    public listPools(): PoolStats[] {
        return Array.from(this.pools.values()).map(p => p.getStats());
    }

    public shutdown() {
        for (const pool of this.pools.values()) {
            pool.shutdown();
        }
    }
}
