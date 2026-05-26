import type { BrowserManager } from '@vyro/browser-engine';
import type {
  AgentJobPayload,
  TaskPlan,
  TaskResult,
  WsMessage,
} from '@vyro/shared-types';
import type { Logger } from 'pino';
import { PlannerAgent } from './PlannerAgent.js';
import { BrowserAgent } from './BrowserAgent.js';
import { ShortTermMemory } from './memory/ShortTermMemory.js';
import { SafetyGuard } from './safety/SafetyGuard.js';
import type { AgentEventCallback, ApprovalCallback } from './BrowserAgent.js';

export interface AgentLoopConfig {
  ollamaBaseUrl?: string;
  model?: string;
  browserManager: BrowserManager;
  logger: Logger;
  maxSteps?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireApprovalFor?: string[];
}

export interface RunResult {
  success: boolean;
  plan: TaskPlan | null;
  result: TaskResult;
  durationMs: number;
}

/**
 * AgentLoop orchestrates the full observe → plan → act → verify cycle.
 *
 * Flow:
 * 1. PlannerAgent analyzes the instruction and produces a TaskPlan
 * 2. BrowserSession is created for the task
 * 3. BrowserAgent runs the Ollama tool-calling loop, driving browser actions
 * 4. Events are streamed to the caller via onEvent callback
 * 5. On completion or failure, resources are cleaned up
 */
export class AgentLoop {
  private readonly config: AgentLoopConfig;
  private readonly planner: PlannerAgent;
  private readonly safetyGuard: SafetyGuard;

  constructor(config: AgentLoopConfig) {
    this.config = config;
    this.planner = new PlannerAgent({
      ollamaBaseUrl: config.ollamaBaseUrl,
      model: config.model,
      logger: config.logger.child({ agent: 'planner' }),
    });
    this.safetyGuard = new SafetyGuard({
      allowedDomains: config.allowedDomains,
      blockedDomains: config.blockedDomains,
      requireApprovalFor: config.requireApprovalFor,
    });
  }

  async run(
    payload: AgentJobPayload,
    onEvent: AgentEventCallback,
    onApprovalRequired: ApprovalCallback
  ): Promise<RunResult> {
    const { taskId, instruction, startUrl, options } = payload;
    const startTime = Date.now();
    const logger = this.config.logger.child({ taskId });

    let plan: TaskPlan | null = null;

    logger.info({ instruction }, 'AgentLoop starting');
    this.emitEvent(onEvent, taskId, 'task:started', { taskId, instruction });

    try {
      // ── Phase 1: Planning ──────────────────────────────────────────────
      logger.info('Phase 1: Planning');
      plan = await this.planner.plan(instruction);

      this.emitEvent(onEvent, taskId, 'task:plan', { plan });
      logger.info({ plan }, 'Plan ready');

      // ── Phase 2: Browser Setup ─────────────────────────────────────────
      const session = await this.config.browserManager.createSession(taskId);

      // Navigate to start URL if specified
      const resolvedStartUrl = startUrl ?? plan.startUrl;
      if (resolvedStartUrl) {
        const safetyCheck = this.safetyGuard.checkUrl(resolvedStartUrl);
        if (!safetyCheck.allowed) {
          throw new Error(`Start URL blocked by safety guard: ${safetyCheck.reason}`);
        }
        await session.navigate(resolvedStartUrl);
        logger.info({ url: resolvedStartUrl }, 'Navigated to start URL');
      }

      // ── Phase 3: Agent Execution ───────────────────────────────────────
      const memory = new ShortTermMemory();
      memory.setPlan(plan);

      const taskSafetyGuard = new SafetyGuard({
        allowedDomains: options?.allowedDomains ?? this.config.allowedDomains,
        blockedDomains: this.config.blockedDomains,
        requireApprovalFor: options?.requireApprovalFor?.map(String),
      });

      const browserAgent = new BrowserAgent({
        ollamaBaseUrl: this.config.ollamaBaseUrl,
        model: this.config.model,
        logger: logger.child({ agent: 'browser' }),
        maxIterations: options?.maxSteps ?? this.config.maxSteps ?? 50,
        safetyGuard: taskSafetyGuard,
      });

      const agentResult = await browserAgent.execute({
        taskId,
        instruction,
        memory,
        session,
        onEvent,
        onApprovalRequired,
      });

      // ── Phase 4: Cleanup ───────────────────────────────────────────────
      await this.config.browserManager.closeSession(taskId);

      const durationMs = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: agentResult.success,
        summary: agentResult.summary,
        extractedData: agentResult.extractedData,
        totalSteps: memory.getLogs().length,
        successfulSteps: memory.getLogs().filter((l) => l.level === 'info').length,
      };

      if (agentResult.success) {
        this.emitEvent(onEvent, taskId, 'task:completed', { result: taskResult, durationMs });
        logger.info({ durationMs }, 'Task completed successfully');
      } else {
        this.emitEvent(onEvent, taskId, 'task:failed', { error: agentResult.summary });
        logger.warn({ durationMs }, 'Task failed');
      }

      return { success: agentResult.success, plan, result: taskResult, durationMs };
    } catch (error) {
      const err = error as Error;
      logger.error({ error: err.message, stack: err.stack }, 'AgentLoop error');

      await this.config.browserManager.closeSession(taskId).catch(() => undefined);

      const durationMs = Date.now() - startTime;
      const taskResult: TaskResult = {
        success: false,
        summary: `Task failed with error: ${err.message}`,
        totalSteps: 0,
        successfulSteps: 0,
        error: err.message,
      };

      this.emitEvent(onEvent, taskId, 'task:failed', { error: err.message });

      return { success: false, plan, result: taskResult, durationMs };
    }
  }

  private emitEvent(callback: AgentEventCallback, taskId: string, type: WsMessage['type'], payload: unknown): void {
    void callback({ type, taskId, payload, timestamp: new Date().toISOString() });
  }
}
