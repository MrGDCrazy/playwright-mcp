import { logger } from "./logger.js";
import type { WorkerResult, GraphNode, ExecutionRecord } from "./types.js";

export function onTaskAccepted(executionId: string, taskType: string, input: Record<string, unknown>): void {
  logger.info("task_accepted", { executionId, taskType, data: { input } });
}

export function onPlanCreated(executionId: string, nodeCount: number): void {
  logger.info("plan_created", { executionId, data: { nodeCount } });
}

export function onNodeStarted(executionId: string, node: GraphNode): void {
  logger.info("node_started", { executionId, nodeId: node.id, taskType: node.taskType });
}

export function onNodeCompleted(executionId: string, node: GraphNode, result: WorkerResult): void {
  logger.info("node_completed", { executionId, nodeId: node.id, taskType: node.taskType, data: { status: result.status } });
}

export function onNodeFailed(executionId: string, node: GraphNode, error: string): void {
  logger.error("node_failed", { executionId, nodeId: node.id, taskType: node.taskType, message: error });
}

export function onExecutionCompleted(executionId: string, record: ExecutionRecord): void {
  logger.info("execution_completed", { executionId, data: { status: record.status, logCount: record.logs.length } });
}
