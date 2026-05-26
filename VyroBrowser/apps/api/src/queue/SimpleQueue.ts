import type { Logger } from 'pino';
import { AgentLoop } from '@vyro/agent-core';
import { BrowserManager } from '@vyro/browser-engine';
import type { AgentJobPayload, BrowserAction, WsMessage } from '@vyro/shared-types';
import { broadcastToTask, requestApproval } from '../ws/agentSocket.js';
import { randomUUID } from 'crypto';

export interface SimpleQueueConfig {
  concurrency: number;
  logger: Logger;
  ollamaBaseUrl: string;
  ollamaModel: string;
  browserHeadless: boolean;
  browserMaxSessions: number;
  browserTimeout: number;
  browserNavigationTimeout: number;
  browsersPath?: string;
  allowedDomains?: string[];
  blockedDomains?: string[];
}

interface QueueJob {
  id: string;
  payload: AgentJobPayload;
  addedAt: Date;
}

/**
 * SimpleQueue — an in-process async job queue that replaces BullMQ + Redis.
 * Supports configurable concurrency. All state is in-memory; it does not
 * survive process restarts, which is acceptable for a local single-user tool.
 */
export class SimpleQueue<T extends AgentJobPayload> {
  private readonly queue: QueueJob[] = [];
  private running = 0;
  private readonly config: SimpleQueueConfig;
  private browserManager: BrowserManager | null = null;
  private shuttingDown = false;

  constructor(config: SimpleQueueConfig) {
    this.config = config;
  }

  /** Add a job to the queue and start processing if capacity allows. */
  async add(payload: T): Promise<string> {
    const id = payload.taskId;
    this.queue.push({ id, payload, addedAt: new Date() });
    this.config.logger.info({ jobId: id }, 'Job enqueued');
    this.drain();
    return id;
  }

  /** Remove a pending job by id. Returns true if found and removed. */
  remove(jobId: string): boolean {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /** Current number of actively running jobs. */
  get activeCount(): number {
    return this.running;
  }

  /** Current number of pending jobs. */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** Drain pending jobs up to the concurrency limit. */
  private drain(): void {
    while (!this.shuttingDown && this.running < this.config.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;
      this.running++;
      this.processJob(job).finally(() => {
        this.running--;
        this.drain(); // Check for more work
      });
    }
  }

  private getBrowserManager(): BrowserManager {
    if (!this.browserManager) {
      this.browserManager = new BrowserManager({
        headless: this.config.browserHeadless,
        maxSessions: this.config.browserMaxSessions,
        timeout: this.config.browserTimeout,
        navigationTimeout: this.config.browserNavigationTimeout,
        logger: this.config.logger.child({ component: 'browser-manager' }),
        browsersPath: this.config.browsersPath,
      });
    }
    return this.browserManager;
  }

  private async processJob(job: QueueJob): Promise<void> {
    const { taskId, instruction } = job.payload;
    const logger = this.config.logger.child({ taskId, jobId: job.id });

    logger.info({ instruction }, 'Processing agent job');

    const agentLoop = new AgentLoop({
      ollamaBaseUrl: this.config.ollamaBaseUrl,
      model: this.config.ollamaModel,
      browserManager: this.getBrowserManager(),
      logger,
      allowedDomains: job.payload.options?.allowedDomains ?? this.config.allowedDomains,
      blockedDomains: this.config.blockedDomains,
    });

    const onEvent = async (message: WsMessage): Promise<void> => {
      broadcastToTask(taskId, message);
    };

    const onApprovalRequired = async (action: BrowserAction, reason: string): Promise<boolean> => {
      const stepId = randomUUID();
      logger.info({ action, reason }, 'Requesting human approval');
      return requestApproval(taskId, stepId, action as unknown as Record<string, unknown>, reason);
    };

    try {
      const result = await agentLoop.run(job.payload, onEvent, onApprovalRequired);
      logger.info(
        { success: result.success, durationMs: result.durationMs },
        'Agent job complete'
      );
    } catch (error) {
      const err = error as Error;
      logger.error({ error: err.message }, 'Agent job failed unexpectedly');

      broadcastToTask(taskId, {
        type: 'task:failed',
        taskId,
        payload: { error: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /** Wait for all running jobs to finish, then shut down the browser. */
  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.config.logger.info('Queue shutting down — waiting for active jobs...');

    // Poll until no running jobs remain
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.running === 0) resolve();
        else setTimeout(check, 200);
      };
      check();
    });

    if (this.browserManager) {
      await this.browserManager.shutdown();
      this.browserManager = null;
    }

    this.config.logger.info('Queue shut down complete');
  }
}
