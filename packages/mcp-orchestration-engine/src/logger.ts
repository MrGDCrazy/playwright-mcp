export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  event: string;
  executionId?: string;
  nodeId?: string;
  taskType?: string;
  message?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class StructuredLogger {
  private readonly entries: LogEntry[] = [];

  log(level: LogLevel, event: string, meta?: Partial<Omit<LogEntry, "level" | "event" | "timestamp">>): void {
    const entry: LogEntry = {
      level,
      event,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    this.entries.push(entry);
    // Emit to stderr so it doesn't pollute MCP stdio transport
    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  info(event: string, meta?: Partial<Omit<LogEntry, "level" | "event" | "timestamp">>): void {
    this.log("info", event, meta);
  }

  warn(event: string, meta?: Partial<Omit<LogEntry, "level" | "event" | "timestamp">>): void {
    this.log("warn", event, meta);
  }

  error(event: string, meta?: Partial<Omit<LogEntry, "level" | "event" | "timestamp">>): void {
    this.log("error", event, meta);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }
}

export const logger = new StructuredLogger();
