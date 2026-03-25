import type { TaskRecord, ExecutionRecord } from "./types.js";

// ─── In-memory stores ─────────────────────────────────────────────────────────

const tasks = new Map<string, TaskRecord>();
const executions = new Map<string, ExecutionRecord>();

// ─── Task store ───────────────────────────────────────────────────────────────

export function saveTask(record: TaskRecord): void {
  tasks.set(record.taskId, { ...record, updatedAt: new Date().toISOString() });
}

export function getTask(taskId: string): TaskRecord | undefined {
  return tasks.get(taskId);
}

export function listTasks(): TaskRecord[] {
  return Array.from(tasks.values());
}

// ─── Execution store ─────────────────────────────────────────────────────────

export function saveExecution(record: ExecutionRecord): void {
  executions.set(record.executionId, record);
}

export function getExecution(executionId: string): ExecutionRecord | undefined {
  return executions.get(executionId);
}

export function listRecentExecutions(limit = 20): ExecutionRecord[] {
  return Array.from(executions.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
