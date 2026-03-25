/**
 * Smoke test / validation script for the orchestration engine.
 * Run after build with: node dist/validate.js
 */
import { routeAndExecute } from "./executor.js";
import { executeTaskGraph } from "./executor.js";
import { getExecution, listRecentExecutions } from "./persistentMemory.js";

async function run(): Promise<void> {
  console.log("=== Orchestration Engine Smoke Test ===\n");

  // 1. Route a pr-triage task
  const r1 = await routeAndExecute({
    taskType: "pr-triage",
    description: "Triage PR #42",
    input: { pr_id: 42, context: "Adds new login flow" },
  });
  console.log("[1] route_task (pr-triage):", JSON.stringify(r1, null, 2));
  if (!r1.routed) throw new Error("pr-triage routing failed");

  // 2. Execute a task graph with two parallel nodes
  const r2 = await executeTaskGraph({
    nodes: [
      { taskType: "summarize", input: { text: "Hello world, this is a test." } },
      { taskType: "pr-triage", input: { pr_id: 99 } },
    ],
  });
  console.log("\n[2] execute_task_graph:", JSON.stringify(r2, null, 2));
  if (r2.status !== "completed") throw new Error("Graph execution did not complete");

  // 3. Query persisted execution
  const rec = getExecution(r1.executionId);
  console.log("\n[3] get_execution:", rec ? "found" : "NOT FOUND");
  if (!rec) throw new Error("Execution not found in persistent store");

  // 4. List recent executions
  const list = listRecentExecutions(10);
  console.log(`\n[4] list_recent_executions: ${list.length} record(s)`);
  if (list.length === 0) throw new Error("No executions in store");

  console.log("\n=== All checks passed ✓ ===");
}

run().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
