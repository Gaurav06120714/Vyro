import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { CreateTaskRequest, PaginationQuery, TaskStatus } from '@vyro/shared-types';
import { randomUUID } from 'crypto';

export class TaskService {
  async createTask(request: CreateTaskRequest): Promise<schema.Task> {
    const now = new Date();
    const task: schema.NewTask = {
      id: randomUUID(),
      instruction: request.instruction,
      status: 'pending',
      options: request.options ? JSON.stringify(request.options) : null,
      plan: null,
      result: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(schema.tasks).values(task).run();
    return task as schema.Task;
  }

  async getTask(taskId: string): Promise<schema.Task | null> {
    const task = db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).get();
    return task ?? null;
  }

  async listTasks(
    query: PaginationQuery = {}
  ): Promise<{ tasks: schema.Task[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    let baseQuery = db.select().from(schema.tasks);
    if (query.status) {
      baseQuery = baseQuery.where(eq(schema.tasks.status, query.status)) as typeof baseQuery;
    }

    const tasks = baseQuery.orderBy(desc(schema.tasks.createdAt)).limit(pageSize).offset(offset).all();

    // Count total
    let countQuery = db.$count(schema.tasks);
    // Note: drizzle-orm SQLite $count with where is limited; use raw approach
    const allRows = db.select().from(schema.tasks).all();
    const total = query.status
      ? allRows.filter((t) => t.status === query.status).length
      : allRows.length;

    return { tasks, total };
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    extra?: {
      errorMessage?: string | null;
      plan?: string | null;
      result?: string | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
    }
  ): Promise<void> {
    db.update(schema.tasks)
      .set({
        status,
        updatedAt: new Date(),
        ...(extra ?? {}),
      })
      .where(eq(schema.tasks.id, taskId))
      .run();
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;
    if (['completed', 'failed', 'cancelled'].includes(task.status)) return false;

    await this.updateTaskStatus(taskId, 'cancelled');
    return true;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) return false;
    db.delete(schema.tasks).where(eq(schema.tasks.id, taskId)).run();
    return true;
  }

  async getTaskScreenshots(taskId: string): Promise<schema.ScreenshotRow[]> {
    return db
      .select()
      .from(schema.screenshots)
      .where(eq(schema.screenshots.taskId, taskId))
      .orderBy(schema.screenshots.timestamp)
      .all();
  }

  async saveScreenshot(
    taskId: string,
    data: {
      url: string;
      pageUrl: string;
      width: number;
      height: number;
      stepId?: string;
    }
  ): Promise<schema.ScreenshotRow> {
    const screenshot: schema.NewScreenshot = {
      id: randomUUID(),
      taskId,
      stepId: data.stepId ?? null,
      url: data.url,
      pageUrl: data.pageUrl,
      width: data.width,
      height: data.height,
      timestamp: new Date(),
      storageKey: null,
    };

    db.insert(schema.screenshots).values(screenshot).run();
    return screenshot as schema.ScreenshotRow;
  }
}
