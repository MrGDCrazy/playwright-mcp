import { randomUUID } from "node:crypto";
import type { TaskRecord, TaskType } from "./types.js";

export interface PlanRequest {
  executionId: string;
  taskType: TaskType;
  description: string;
  input: Record<string, unknown>;
}

/**
 * Creates a single-step plan (one TaskRecord) for simple task routing.
 * Multi-step plans are handled by multiAgentPlanner.
 */
export function createPlan(req: PlanRequest): TaskRecord[] {
  return [
    {
      taskId: randomUUID(),
      taskType: req.taskType,
      description: req.description,
      input: req.input,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
