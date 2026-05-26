import type { Task } from '@vyro/shared-types';

export interface SessionEntry {
  taskId: string;
  instruction: string;
  completedAt: Date;
  success: boolean;
  summary: string;
}

/**
 * SessionMemory persists cross-task context within a user session.
 * It enables the agent to reference previous tasks and avoid repeating work.
 */
export class SessionMemory {
  private sessions: Map<string, SessionEntry[]> = new Map();
  private readonly maxPerUser = 20;

  addCompletedTask(userId: string, task: Task): void {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, []);
    }

    const userSessions = this.sessions.get(userId)!;
    userSessions.push({
      taskId: task.id,
      instruction: task.instruction,
      completedAt: task.completedAt ?? new Date(),
      success: task.result?.success ?? false,
      summary: task.result?.summary ?? 'No summary available',
    });

    if (userSessions.length > this.maxPerUser) {
      userSessions.shift();
    }
  }

  getRecentTasks(userId: string, limit = 5): SessionEntry[] {
    return (this.sessions.get(userId) ?? []).slice(-limit);
  }

  getContextForUser(userId: string): string {
    const entries = this.getRecentTasks(userId);
    if (entries.length === 0) return '';

    const lines = ['Recent task history:'];
    entries.forEach((e, i) => {
      const status = e.success ? 'completed' : 'failed';
      lines.push(`${i + 1}. [${status}] "${e.instruction}" → ${e.summary}`);
    });

    return lines.join('\n');
  }

  clear(userId: string): void {
    this.sessions.delete(userId);
  }
}
