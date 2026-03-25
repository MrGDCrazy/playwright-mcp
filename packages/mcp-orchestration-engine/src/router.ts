import { getWorker, listWorkers } from "./registry.js";
import type { TaskType, WorkerResult } from "./types.js";

export interface RouteRequest {
  taskType: TaskType;
  input: Record<string, unknown>;
}

export interface RouteResponse {
  routed: boolean;
  taskType: TaskType;
  result?: WorkerResult;
  error?: string;
  availableWorkers: string[];
}

export async function routeTask(req: RouteRequest): Promise<RouteResponse> {
  const available = listWorkers();
  const worker = getWorker(req.taskType);
  if (!worker) {
    return {
      routed: false,
      taskType: req.taskType,
      error: `No worker registered for task type '${req.taskType}'. Available: ${available.join(", ")}`,
      availableWorkers: available,
    };
  }
  try {
    const result = await worker(req.input);
    return { routed: true, taskType: req.taskType, result, availableWorkers: available };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { routed: false, taskType: req.taskType, error: message, availableWorkers: available };
  }
}
