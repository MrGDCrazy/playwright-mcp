import { randomUUID } from "node:crypto";
import type { TaskGraph, TaskType } from "./types.js";

export interface MultiAgentPlanRequest {
  description: string;
  taskTypes: TaskType[];
  inputs: Record<string, Record<string, unknown>>;
}

/**
 * Creates a parallel task graph where each task type becomes one independent node.
 */
export function planMultiAgentGraph(req: MultiAgentPlanRequest): TaskGraph {
  const nodes = req.taskTypes.map((tt) => ({
    id: randomUUID(),
    taskType: tt,
    input: req.inputs[tt] ?? {},
    dependsOn: [],
    status: "pending" as const,
  }));

  return {
    graphId: randomUUID(),
    nodes,
    createdAt: new Date().toISOString(),
  };
}
