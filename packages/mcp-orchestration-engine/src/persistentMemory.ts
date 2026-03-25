import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { saveExecution, getExecution, listRecentExecutions } from "./memory.js";
import { logger } from "./logger.js";
import type { ExecutionRecord } from "./types.js";

const DATA_DIR = process.env["ORCHESTRATION_DATA_DIR"] ?? join(process.cwd(), ".orchestration-data");
const EXECUTIONS_FILE = join(DATA_DIR, "executions.json");

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function persistExecution(record: ExecutionRecord): void {
  // Always update in-memory store first so the record is queryable regardless
  // of whether the disk write succeeds.
  saveExecution(record);
  // Best-effort disk persistence: a filesystem error must not cause the
  // calling execution to appear failed.
  try {
    ensureDir();
    const all = listRecentExecutions(1000);
    writeFileSync(EXECUTIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    logger.warn("persist_execution_failed", {
      executionId: record.executionId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export function loadExecutions(): void {
  if (!existsSync(EXECUTIONS_FILE)) return;
  try {
    const raw = readFileSync(EXECUTIONS_FILE, "utf-8");
    const records: ExecutionRecord[] = JSON.parse(raw) as ExecutionRecord[];
    for (const r of records) {
      saveExecution(r);
    }
  } catch (err) {
    // Log a warning so operators know the file was unreadable, but do not
    // crash the server — the engine can continue with an empty in-memory store.
    logger.warn("load_executions_failed", {
      message: err instanceof Error ? err.message : String(err),
      data: { file: EXECUTIONS_FILE },
    });
  }
}

export { getExecution, listRecentExecutions };
