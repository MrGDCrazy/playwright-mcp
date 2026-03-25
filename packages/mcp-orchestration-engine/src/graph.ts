import { randomUUID } from "node:crypto";
import { getWorker } from "./registry.js";
import { onNodeStarted, onNodeCompleted, onNodeFailed } from "./observability.js";
import type { TaskGraph, GraphNode, WorkerResult } from "./types.js";

export interface GraphRunRequest {
  executionId: string;
  nodes: Array<{
    id?: string;
    taskType: string;
    input: Record<string, unknown>;
    dependsOn?: string[];
  }>;
}

export interface GraphRunResult {
  graphId: string;
  graph: TaskGraph;
  finalStatus: "completed" | "failed";
  results: Record<string, WorkerResult>;
  errors: Record<string, string>;
}

export async function executeGraph(req: GraphRunRequest): Promise<GraphRunResult> {
  const graphId = randomUUID();
  const nodes: GraphNode[] = req.nodes.map((n) => ({
    id: n.id ?? randomUUID(),
    taskType: n.taskType,
    input: n.input,
    dependsOn: n.dependsOn ?? [],
    status: "pending",
  }));

  const graph: TaskGraph = { graphId, nodes, createdAt: new Date().toISOString() };
  const results: Record<string, WorkerResult> = {};
  const errors: Record<string, string> = {};

  // Topological execution: keep executing ready nodes until done or stuck
  const maxIterations = nodes.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    const pending = nodes.filter((n) => n.status === "pending");
    if (pending.length === 0) break;

    const ready = pending.filter((n) =>
      (n.dependsOn ?? []).every((dep) => {
        const depNode = nodes.find((x) => x.id === dep);
        return depNode?.status === "completed";
      })
    );

    if (ready.length === 0) {
      // Deadlock / unresolvable dependencies
      for (const n of pending) {
        n.status = "failed";
        errors[n.id] = "Dependency deadlock or missing dependency node";
      }
      break;
    }

    await Promise.all(
      ready.map(async (node) => {
        node.status = "running";
        node.startedAt = new Date().toISOString();
        onNodeStarted(req.executionId, node);

        const worker = getWorker(node.taskType);
        if (!worker) {
          node.status = "failed";
          node.completedAt = new Date().toISOString();
          const err = `No worker registered for task type '${node.taskType}'`;
          errors[node.id] = err;
          onNodeFailed(req.executionId, node, err);
          return;
        }

        try {
          const result = await worker(node.input);
          node.status = "completed";
          node.result = result;
          node.completedAt = new Date().toISOString();
          results[node.id] = result;
          onNodeCompleted(req.executionId, node, result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          node.status = "failed";
          node.completedAt = new Date().toISOString();
          node.error = message;
          errors[node.id] = message;
          onNodeFailed(req.executionId, node, message);
        }
      })
    );
  }

  const finalStatus = nodes.every((n) => n.status === "completed") ? "completed" : "failed";
  return { graphId, graph, finalStatus, results, errors };
}
