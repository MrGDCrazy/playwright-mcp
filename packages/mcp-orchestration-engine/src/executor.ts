import { randomUUID } from "node:crypto";
import { createPlan } from "./planner.js";
import { executeGraph } from "./graph.js";
import { persistExecution } from "./persistentMemory.js";
import { onTaskAccepted, onPlanCreated, onExecutionCompleted } from "./observability.js";
import type { TaskType, ExecutionRecord, WorkerResult, TaskGraph } from "./types.js";

// ─── Route a single task ──────────────────────────────────────────────────────

export interface RouteTaskRequest {
  taskType: TaskType;
  description?: string;
  input: Record<string, unknown>;
}

export interface RouteTaskResponse {
  executionId: string;
  routed: boolean;
  result?: WorkerResult;
  error?: string;
}

export async function routeAndExecute(req: RouteTaskRequest): Promise<RouteTaskResponse> {
  const executionId = randomUUID();
  const now = new Date().toISOString();

  onTaskAccepted(executionId, req.taskType, req.input);

  const plan = createPlan({
    executionId,
    taskType: req.taskType,
    description: req.description ?? req.taskType,
    input: req.input,
  });

  onPlanCreated(executionId, plan.length);

  // Execute via a single-node graph so all observability hooks fire
  const graphResult = await executeGraph({
    executionId,
    nodes: plan.map((t) => ({
      id: t.taskId,
      taskType: t.taskType,
      input: t.input,
    })),
  });

  const firstResult = Object.values(graphResult.results)[0];
  const firstError = Object.values(graphResult.errors)[0];

  const record: ExecutionRecord = {
    executionId,
    graphId: graphResult.graphId,
    status: graphResult.finalStatus === "completed" ? "completed" : "failed",
    plan,
    graph: graphResult.graph,
    result: firstResult,
    createdAt: now,
    completedAt: new Date().toISOString(),
    logs: [],
  };

  persistExecution(record);
  onExecutionCompleted(executionId, record);

  return {
    executionId,
    routed: graphResult.finalStatus === "completed",
    result: firstResult,
    error: firstError,
  };
}

// ─── Execute a full task graph ────────────────────────────────────────────────

export interface ExecuteGraphRequest {
  nodes: Array<{
    id?: string;
    taskType: string;
    input: Record<string, unknown>;
    dependsOn?: string[];
  }>;
}

export interface ExecuteGraphResponse {
  executionId: string;
  graphId: string;
  status: "completed" | "failed";
  results: Record<string, WorkerResult>;
  errors: Record<string, string>;
  graph: TaskGraph;
}

export async function executeTaskGraph(req: ExecuteGraphRequest): Promise<ExecuteGraphResponse> {
  const executionId = randomUUID();
  const now = new Date().toISOString();

  onTaskAccepted(executionId, "graph", {});
  onPlanCreated(executionId, req.nodes.length);

  const graphResult = await executeGraph({ executionId, nodes: req.nodes });

  const record: ExecutionRecord = {
    executionId,
    graphId: graphResult.graphId,
    status: graphResult.finalStatus === "completed" ? "completed" : "failed",
    graph: graphResult.graph,
    createdAt: now,
    completedAt: new Date().toISOString(),
    logs: [],
  };

  persistExecution(record);
  onExecutionCompleted(executionId, record);

  return {
    executionId,
    graphId: graphResult.graphId,
    status: graphResult.finalStatus,
    results: graphResult.results,
    errors: graphResult.errors,
    graph: graphResult.graph,
  };
}
