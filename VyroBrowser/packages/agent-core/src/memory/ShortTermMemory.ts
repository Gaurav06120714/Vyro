import type { AgentLog, BrowserState, ExecutionStep, TaskPlan } from '@vyro/shared-types';

export interface MemoryEntry {
  type: 'state' | 'action' | 'observation' | 'error';
  content: string;
  timestamp: Date;
  stepNumber?: number;
}

/**
 * ShortTermMemory stores the working context for a single task execution.
 * It maintains a bounded history of states and actions to keep the AI context
 * window manageable while providing sufficient context for decision-making.
 */
export class ShortTermMemory {
  private entries: MemoryEntry[] = [];
  private plan: TaskPlan | null = null;
  private completedSteps: ExecutionStep[] = [];
  private logs: AgentLog[] = [];
  private readonly maxEntries: number;
  private readonly maxStateHistory: number;
  private recentUrls: string[] = [];
  private actionCounts: Map<string, number> = new Map();

  constructor(maxEntries = 50, maxStateHistory = 10) {
    this.maxEntries = maxEntries;
    this.maxStateHistory = maxStateHistory;
  }

  setPlan(plan: TaskPlan): void {
    this.plan = plan;
  }

  getPlan(): TaskPlan | null {
    return this.plan;
  }

  addState(state: BrowserState, stepNumber?: number): void {
    this.recentUrls.push(state.url);
    if (this.recentUrls.length > 10) {
      this.recentUrls.shift();
    }

    const stateEntries = this.entries.filter((e) => e.type === 'state');
    if (stateEntries.length >= this.maxStateHistory) {
      // Remove oldest state entry
      const idx = this.entries.findIndex((e) => e.type === 'state');
      if (idx !== -1) this.entries.splice(idx, 1);
    }

    this.addEntry({
      type: 'state',
      content: `URL: ${state.url} | Title: ${state.title} | Elements: ${state.domSummary.interactiveElements.length}`,
      timestamp: new Date(),
      stepNumber,
    });
  }

  addAction(description: string, result: string, stepNumber: number): void {
    // Track action frequency for anti-loop detection
    const key = description.slice(0, 50);
    this.actionCounts.set(key, (this.actionCounts.get(key) ?? 0) + 1);

    this.addEntry({
      type: 'action',
      content: `${description} → ${result}`,
      timestamp: new Date(),
      stepNumber,
    });
  }

  addObservation(observation: string, stepNumber?: number): void {
    this.addEntry({
      type: 'observation',
      content: observation,
      timestamp: new Date(),
      stepNumber,
    });
  }

  addError(error: string, stepNumber?: number): void {
    this.addEntry({
      type: 'error',
      content: error,
      timestamp: new Date(),
      stepNumber,
    });
  }

  addCompletedStep(step: ExecutionStep): void {
    this.completedSteps.push(step);
  }

  addLog(log: AgentLog): void {
    this.logs.push(log);
    if (this.logs.length > 200) {
      this.logs.shift();
    }
  }

  getLogs(): AgentLog[] {
    return this.logs;
  }

  /**
   * Returns a concise summary of memory for injecting into the AI context.
   */
  getSummary(): string {
    const lines: string[] = [];

    if (this.plan) {
      lines.push(`GOAL: ${this.plan.goal}`);
      lines.push(`SUBGOALS: ${this.plan.subgoals.join(' → ')}`);
      lines.push('');
    }

    if (this.completedSteps.length > 0) {
      lines.push(`COMPLETED STEPS (${this.completedSteps.length}):`);
      this.completedSteps.slice(-10).forEach((step) => {
        const status = step.status === 'success' ? '✓' : '✗';
        lines.push(`  ${status} Step ${step.stepNumber}: ${step.action.description}`);
      });
      lines.push('');
    }

    if (this.entries.length > 0) {
      lines.push('RECENT CONTEXT:');
      this.entries.slice(-15).forEach((entry) => {
        const prefix = entry.type === 'error' ? 'ERROR' : entry.type.toUpperCase();
        const step = entry.stepNumber !== undefined ? ` [step ${entry.stepNumber}]` : '';
        lines.push(`  [${prefix}${step}] ${entry.content}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Detects if the agent is stuck in a loop.
   * Returns true if the same action was repeated 3+ times.
   */
  isInLoop(): boolean {
    for (const count of this.actionCounts.values()) {
      if (count >= 3) return true;
    }

    // Check URL loop: same URL seen 4+ times in last 8 navigation entries
    if (this.recentUrls.length >= 4) {
      const recent = this.recentUrls.slice(-8);
      const counts = new Map<string, number>();
      for (const url of recent) {
        counts.set(url, (counts.get(url) ?? 0) + 1);
      }
      for (const count of counts.values()) {
        if (count >= 4) return true;
      }
    }

    return false;
  }

  /**
   * Get the most repeated action for loop reporting.
   */
  getMostRepeatedAction(): string | null {
    let maxCount = 0;
    let maxAction = '';
    for (const [action, count] of this.actionCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxAction = action;
      }
    }
    return maxCount >= 3 ? maxAction : null;
  }

  clear(): void {
    this.entries = [];
    this.completedSteps = [];
    this.logs = [];
    this.recentUrls = [];
    this.actionCounts.clear();
    this.plan = null;
  }

  private addEntry(entry: MemoryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      // Remove oldest non-state entries first, then states
      const oldest = this.entries.findIndex((e) => e.type !== 'state');
      this.entries.splice(oldest !== -1 ? oldest : 0, 1);
    }
  }
}
