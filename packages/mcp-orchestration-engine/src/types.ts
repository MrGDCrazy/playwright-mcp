// ─── Core task types ──────────────────────────────────────────────────────────

export type TaskType = "research" | "summarize" | "code" | "pr-triage" | string;

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked-awaiting-human";

export interface TaskRecord {
  taskId: string;
  taskType: TaskType;
  description: string;
  input: Record<string, unknown>;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  result?: WorkerResult;
  error?: string;
}

// ─── Worker types ─────────────────────────────────────────────────────────────

export interface WorkerResult {
  status: "ok" | "error" | "stub";
  output: Record<string, unknown>;
  message?: string;
}

export type WorkerFn = (
  input: Record<string, unknown>
) => Promise<WorkerResult>;

export interface WorkerRegistration {
  taskType: TaskType;
  fn: WorkerFn;
  description?: string;
}

// ─── Graph types ──────────────────────────────────────────────────────────────

export type GraphNodeStatus = "pending" | "running" | "completed" | "failed";

export interface GraphNode {
  id: string;
  taskType: TaskType;
  input: Record<string, unknown>;
  dependsOn?: string[];
  status: GraphNodeStatus;
  result?: WorkerResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskGraph {
  graphId: string;
  nodes: GraphNode[];
  createdAt: string;
}

// ─── Execution record (persisted) ─────────────────────────────────────────────

export interface ExecutionRecord {
  executionId: string;
  graphId?: string;
  taskId?: string;
  status: TaskStatus;
  plan?: TaskRecord[];
  graph?: TaskGraph;
  result?: WorkerResult;
  createdAt: string;
  completedAt?: string;
  logs: string[];
}
