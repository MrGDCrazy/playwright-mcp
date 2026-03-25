import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { routeAndExecute } from "@playwright/mcp-orchestration-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = new Server(
  { name: "agent-pr-triage", version: "0.0.1" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "triage_pr",
      description: "Analyze a PR and return structured triage output (classification, risk, labels, confidence)",
      inputSchema: {
        type: "object",
        properties: {
          pr_id: { type: "number", description: "GitHub pull-request number" },
          context: { type: "string", description: "PR description or additional context" },
        },
        required: ["pr_id"],
      },
    },
    {
      name: "handoff_to_browser",
      description: "Delegate a browser-based verification task to the orchestration engine",
      inputSchema: {
        type: "object",
        properties: {
          pr_id: { type: "number" },
          task: { type: "string" },
          context: { type: "object" },
        },
        required: ["pr_id", "task"],
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
      case "triage_pr": {
        if (typeof a["pr_id"] !== "number")
          return fail("'pr_id' must be a number");
        const result = await routeAndExecute({
          taskType: "pr-triage",
          description: `Triage PR #${a["pr_id"]}`,
          input: {
            pr_id: a["pr_id"],
            context: typeof a["context"] === "string" ? a["context"] : "",
          },
        });
        return ok(result);
      }

      case "handoff_to_browser": {
        if (typeof a["pr_id"] !== "number")
          return fail("'pr_id' must be a number");
        if (typeof a["task"] !== "string" || a["task"].trim() === "")
          return fail("'task' must be a non-empty string");
        // Browser workers are not yet registered; return a structured pending result.
        return ok({
          status: "pending",
          message: "Browser handoff queued — no browser worker is registered yet. Register a 'browser' worker in the orchestration engine to enable this path.",
          pr_id: a["pr_id"],
          task: a["task"],
        });
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("PR Triage MCP Server running on stdio\n");
}

main().catch((error) => {
  process.stderr.write(`Fatal error in main(): ${String(error)}\n`);
  process.exit(1);
});
