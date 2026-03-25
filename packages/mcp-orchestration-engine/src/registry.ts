import type { WorkerFn, WorkerRegistration, WorkerResult } from "./types.js";

// ─── Registry ─────────────────────────────────────────────────────────────────

const registry = new Map<string, WorkerRegistration>();

export function registerWorker(reg: WorkerRegistration): void {
  registry.set(reg.taskType, reg);
}

export function getWorker(taskType: string): WorkerFn | undefined {
  return registry.get(taskType)?.fn;
}

export function listWorkers(): string[] {
  return Array.from(registry.keys());
}

// ─── Built-in worker stubs (structured, not throw-only) ────────────────────────

function makeStubResult(taskType: string, input: Record<string, unknown>): WorkerResult {
  return {
    status: "stub",
    output: { taskType, input },
    message: `Worker '${taskType}' is a structured stub — implement real logic to replace this result.`,
  };
}

registerWorker({
  taskType: "research",
  description: "Research and information gathering worker",
  fn: async (input) => makeStubResult("research", input),
});

registerWorker({
  taskType: "summarize",
  description: "Text summarization worker",
  fn: async (input) => {
    const text = typeof input["text"] === "string" ? input["text"] : "";
    return {
      status: "ok",
      output: {
        summary: text.length > 0 ? text.slice(0, 200) + (text.length > 200 ? "…" : "") : "(no text provided)",
        charCount: text.length,
      },
    };
  },
});

registerWorker({
  taskType: "code",
  description: "Code generation / review worker",
  fn: async (input) => makeStubResult("code", input),
});

registerWorker({
  taskType: "pr-triage",
  description: "Pull-request triage and classification worker",
  fn: async (input) => {
    const prId = input["pr_id"] ?? input["prId"] ?? null;
    const context = typeof input["context"] === "string" ? input["context"] : "";
    return {
      status: "ok",
      output: {
        prId,
        classification: "needs-review",
        riskLevel: "medium",
        proposedLabels: ["needs-review"],
        summary: context.length > 0 ? `PR context: ${context.slice(0, 120)}` : "No context provided — manual review required.",
        confidence: 0.72,
        humanReviewRequired: true,
        reviewReason: "Automated confidence below auto-execute threshold",
      },
    };
  },
});
