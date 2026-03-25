import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  routeAndExecute,
  executeTaskGraph,
  getExecution,
  listRecentExecutions,
  loadExecutions,
} from "@playwright/mcp-orchestration-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolResult = { content: Array<{ type: string; text: string }> };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  } as ToolResult;
}

function assertString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.trim() === "")
    throw new TypeError(`'${name}' must be a non-empty string`);
  return v;
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "agent-orchestrator", version: "0.0.1" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "route_task",
      description: "Route and execute a task through the orchestration engine",
      inputSchema: {
        type: "object",
        properties: {
          taskType: {
            type: "string",
            description: "Task type: research | summarize | code | pr-triage",
          },
          description: { type: "string" },
          input: { type: "object" },
        },
        required: ["taskType"],
      },
    },
    {
      name: "execute_task_graph",
      description: "Execute a directed task graph across multiple workers",
      inputSchema: {
        type: "object",
        properties: {
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                taskType: { type: "string" },
                input: { type: "object" },
                dependsOn: { type: "array", items: { type: "string" } },
              },
              required: ["taskType"],
            },
          },
        },
        required: ["nodes"],
      },
    },
    {
      name: "get_execution",
      description: "Retrieve a persisted execution record by ID",
      inputSchema: {
        type: "object",
        properties: {
          executionId: { type: "string" },
        },
        required: ["executionId"],
      },
    },
    {
      name: "list_recent_executions",
      description: "List the most recent execution records",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 100 },
        },
      },
    },
  ],
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "route_task": {
        const taskType = assertString(a["taskType"], "taskType");
        const result = await routeAndExecute({
          taskType,
          description: typeof a["description"] === "string" ? a["description"] : undefined,
          input: (typeof a["input"] === "object" && a["input"] !== null
            ? a["input"]
            : {}) as Record<string, unknown>,
        });
        return ok(result);
      }

      case "execute_task_graph": {
        if (!Array.isArray(a["nodes"]))
          return fail("'nodes' must be an array");
        const result = await executeTaskGraph({
          nodes: a["nodes"] as Array<{
            id?: string;
            taskType: string;
            input: Record<string, unknown>;
            dependsOn?: string[];
          }>,
        });
        return ok(result);
      }

      case "get_execution": {
        const executionId = assertString(a["executionId"], "executionId");
        const record = getExecution(executionId);
        if (!record)
          return fail(`No execution found for id '${executionId}'`);
        return ok(record);
      }

      case "list_recent_executions": {
        const limit = typeof a["limit"] === "number" ? Math.min(100, Math.max(1, a["limit"])) : 20;
        const records = listRecentExecutions(limit);
        return ok({ executions: records, count: records.length });
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
});

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  loadExecutions();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Orchestrator MCP Server running on stdio\n");
}

main().catch((error) => {
  process.stderr.write(`Fatal error in main(): ${String(error)}\n`);
  process.exit(1);
});
