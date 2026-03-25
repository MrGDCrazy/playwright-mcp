import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { saveExecution, getExecution, listRecentExecutions } from "./memory.js";
import type { ExecutionRecord } from "./types.js";

const DATA_DIR = process.env["ORCHESTRATION_DATA_DIR"] ?? join(process.cwd(), ".orchestration-data");
const EXECUTIONS_FILE = join(DATA_DIR, "executions.json");

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function persistExecution(record: ExecutionRecord): void {
  ensureDir();
  // Update in-memory store first
  saveExecution(record);
  // Persist all in-memory executions to disk
  const all = listRecentExecutions(1000);
  writeFileSync(EXECUTIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export function loadExecutions(): void {
  if (!existsSync(EXECUTIONS_FILE)) return;
  try {
    const raw = readFileSync(EXECUTIONS_FILE, "utf-8");
    const records: ExecutionRecord[] = JSON.parse(raw) as ExecutionRecord[];
    for (const r of records) {
      saveExecution(r);
    }
  } catch {
    // Ignore corrupted file on startup
  }
}

export { getExecution, listRecentExecutions };
