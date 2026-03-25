## Summary

This PR addresses the highest-priority verified issues from the full codebase audit. Changes are organized into 5 logical batches.

---

### Batch 1 — Agent Orchestrator: type safety + stub guard
**File:** `packages/agent-orchestrator/src/index.ts`

- **Removed all `as any` casts** — replaced with `RouteTaskArgs` and `RequestHumanReviewArgs` typed interfaces
- **Added runtime assertion guards** (`assertRouteTaskArgs`, `assertHumanReviewArgs`) that throw MCP-serializable errors on malformed input
- **Removed dead `payload` variable** from `route_task` destructure
- **Gated `route_task` stub behind `MCP_STUB_MODE=1`** — previously returning a PENDING string unconditionally, which made the orchestrator's core function a silent no-op in production
- **Structured JSON responses** from all handlers instead of plain strings
- **`default` case** added to the switch for unknown tool names

---

### Batch 2 — PR Triage Agent: remove dangerous hardcoded confidence
**File:** `packages/agent-pr-triage/src/index.ts`

- **Removed hardcoded `Confidence: 0.95` and `Auto-merge after CI passes`** — this was a critical footgun where agent consumers could make real auto-merge decisions based on fake data
- **Gated `triage_pr` stub behind `MCP_STUB_MODE=1`**
- **Added `assertTriagePRArgs` and `assertHandoffArgs` guards**
- **`pr_id` validated as positive integer** (was unvalidated `unknown`)
- **`context` validated as plain object before spread** (prevents array-spread crash)
- **Updated `inputSchema`** with `minimum: 1` on `pr_id`

---

### Batch 3 — `roll.js`: shell injection guard + error handling
**File:** `roll.js`

- **Added semver validation** via `/^\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?$/` before `version` touches disk or `execSync` — closes shell injection vector via `process.argv[2]` or tampered `npm info` output
- **Added `fs.existsSync` guard in `copyConfig()`** with actionable error message pointing to `PLAYWRIGHT_SRC_DIR` (previously threw uncaught synchronous exception)
- **Added `isDirectory()` filter** in `readdirSync` loop to skip stray non-directory entries
- **Added `JSON.parse` error handling** with graceful `process.exit(1)`
- **Added `'use strict'`** for safer CJS semantics

---

### Batch 4 — Dockerfile: name final stage, document COPY intent
**File:** `Dockerfile`

- **Named final stage `AS runtime`** so it can be targeted with `docker build --target=runtime` (previously had no name, untargetable)
- **Added comment documenting** that `.ts` source files are intentionally excluded from the production image

---

### Batch 5 — CI + Docs
**Files:** `.github/workflows/update-lockfile.yml`, `CLAUDE.md`

- **Aligned `update-lockfile.yml` Node version from 20 → 22** to match `node:22-bookworm-slim` in Dockerfile — mismatched Node versions produce divergent lockfiles
- **Fixed `CLAUDE.md`** `gh pr create --repo` to reference `MrGDCrazy/playwright-mcp` (was pointing to upstream `microsoft/playwright`)
- **Documented agent packages**, `MCP_STUB_MODE` requirement, and build instructions in `CLAUDE.md`

---

## Issues NOT addressed in this PR (require human decision)

| Issue | Reason deferred |
|---|---|
| `route_task` has no real routing implementation | Requires decision on transport mechanism (stdio subprocess vs HTTP) |
| `"browser"` enum value in orchestrator schema has no implementation | Requires browser agent package to exist |
| `playwright-cli-stub` package is empty | Requires decision on whether to implement or remove from workspace |
| Agent packages have zero tests | Requires human to define expected tool behavior before tests can be written |
| `@playwright/test` alpha version pinned in root `package.json` | Requires human to decide when to move to stable |

## Validation

```bash
# Type-check both agent packages
npm run lint --workspace=packages/agent-orchestrator
npm run lint --workspace=packages/agent-pr-triage

# Verify stub mode works
MCP_STUB_MODE=1 npm start --workspace=packages/agent-orchestrator
MCP_STUB_MODE=1 npm start --workspace=packages/agent-pr-triage

# Verify roll.js rejects malformed version
node roll.js 'malicious;rm -rf /'

# Verify roll.js semver passes
node roll.js 1.50.0
```