# Changelog

All notable changes to `@gapra/sdlc-planner-mcp` (formerly `sdlc-ai-agents-mcp`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-04-27

### Added

- **4 new optional fields on `analyze_technical_feasibility`** (`AnalyzeFeasibilitySchema`):
  - `feature_name` — included in the report title and executive summary.
  - `team_size` — number of engineers; shown in context table and exec summary.
  - `timeline_weeks` — delivery timeline; shown in context table and exec summary.
  - `constraints` — free-text array of engineering constraints (e.g. `"Must run on AWS ECS
Fargate"`, `"Zero-downtime rolling deploys required"`); rendered verbatim in section 3.3
    Constraint Analysis. Previously this section only surfaced structured fields
    (`target_throughput`, `runtime_environment`, etc.) and ignored engineer-declared constraints.

- **`examples/` folder** — 6 realistic, runnable example reports covering all tools, built
  around a single `checkout-service` scenario so readers can see how one service is evaluated
  from six different angles:
  - `examples/report-api-spec.md` — 8 endpoints (1 deprecated with `sunset_date`), cursor pagination, elevated rate tier on `/confirm`
  - `examples/report-feasibility.md` — 10 components, PCI-DSS + GDPR, 4 ECS constraints, 6-engineer / 10-week timeline
  - `examples/report-adr.md` — ADR-0012: event sourcing vs. audit table vs. CDC (one-way door, 3 options, 6 consequences)
  - `examples/report-threat-model.md` — STRIDE scorecard, 5 assets (1 restricted), 6 trust boundaries, PCI-DSS + GDPR
  - `examples/report-observability-gaps.md` — service with only logs, no metrics/traces/SLOs/alerts (verdict: 🚫 Reject)
  - `examples/report-runbook.md` — 6 failure modes, 5 upstream dependencies, tested rollback, full escalation chain

### Fixed

- **Instrumentation plan step numbering** (`analyze_observability_gaps`) — steps were numbered
  with hard-coded integers (`1.`, `2.`, `3.`…), causing the plan to start at `2.` when logs
  were already present and step 1 was skipped. Steps are now numbered sequentially from the
  filtered list.
- **Per-component findings layout** (`analyze_technical_feasibility`) — components with no
  flags rendered as empty H4 sections with no body text. Clean packages are now grouped under
  a single "✅ No issues detected" heading, keeping flagged components visually prominent.
- **Abbreviation-aware context table labels** (`template.ts`) — field keys like `slo_targets`
  rendered as "Slo Targets" and `adr_id` as "Adr Id". The `humanize()` function now promotes
  known abbreviations (`adr`, `api`, `slo`, `sli`, `id`, `rps`, `url`, `jwt`, `pci`) to
  uppercase, producing "SLO Targets", "ADR ID", etc.
- **Executive summary specificity**:
  - `analyze_technical_feasibility` — summary now mentions feature name, timeline, engineer
    count, and lists blocker IDs by name instead of a generic count.
  - `analyze_observability_gaps` — summary now lists critical user journey names verbatim
    and explicitly labels missing signals as release blockers.

### Notes for upgraders

- The MCP **tool names**, **prompt names**, and **input schemas are backward-compatible**.
  Existing MCP client configs and tool calls continue to work without any changes.
- The 4 new fields on `analyze_technical_feasibility` are **optional** — existing calls that
  omit them produce output identical to 1.4.0.

## [1.4.0] - 2026-04-26

### Added

- **2 new agent personas**:
  - `security_auditor` — Senior AppSec Auditor with STRIDE + OWASP API Top 10 framework, defence-in-depth doctrine, and findings template
  - `db_schema_designer` — Senior Database Architect with workload-driven design, 12 patterns to recognise, 7 anti-patterns rejected, and expand-and-contract migration doctrine
- **4 new skills**, all using the canonical 7-section templated report:
  - `generate_adr` — Architecture Decision Records in Nygard format; flags decision drift, under-documented one-way doors, and missing alternatives
  - `generate_threat_model` — STRIDE-based threat model with 6-category scoring (0–10) and recommended controls; hard-blocker rule on score ≥ 9
  - `analyze_observability_gaps` — Pillar-coverage audit (logs/metrics/traces + SLO + alerting); blocker on missing required signals
  - `generate_runbook` — Operational runbook scaffold with severity tiers, on-call escalation, and per-failure-mode sections; rollback-untested is a release blocker
- **24 new Vitest tests** across 4 new test files (total now 59 tests across 9 files).
- README updated with new agents/skills documentation.

### Notes for upgraders

The MCP client config does **not** need any changes — new prompts and tools
are discovered automatically. Restart your MCP client to see them.

## [1.3.0] - 2026-04-26

### Changed (BREAKING for installers, not for tool consumers)

- **Renamed npm package** from `sdlc-ai-agents-mcp` to **`@gapra/sdlc-planner-mcp`**.
  The old package on the registry is deprecated with a pointer to the new name.
- **Renamed CLI binary** from `sdlc-ai-agents-mcp` to **`sdlc-planner-mcp`**.
- **Renamed GitHub repository** from `gp-agents-planner` to `sdlc-planner-mcp`
  (GitHub redirects from the old URL automatically).

### Migration

The MCP **tool names**, **prompt names**, **input schemas**, and **output
templates are unchanged**. Only the install identifier changes.

Update your MCP client config (`claude_desktop_config.json` or
`.cursor/mcp.json`):

```diff
 {
   "mcpServers": {
-    "sdlc-agents": {
+    "sdlc-planner": {
       "command": "npx",
-      "args": ["-y", "sdlc-ai-agents-mcp"]
+      "args": ["-y", "@gapra/sdlc-planner-mcp"]
     }
   }
 }
```

If you installed globally:

```bash
npm uninstall -g sdlc-ai-agents-mcp
npm install   -g @gapra/sdlc-planner-mcp
```

If you cloned the repo, update your remote (one-time, GitHub redirects
work indefinitely but explicit is better):

```bash
git remote set-url origin git@github.com:gapra/sdlc-planner-mcp.git
```

### Why the rename?

- The new name describes _what the tool does_ (plans the SDLC), not _what
  it is composed of_ (AI agents). Easier to discover, easier to remember.
- Scoping under `@gapra` makes ownership explicit and removes name-collision
  risk on the npm registry.

## [1.2.0] - 2026-04-25

### Added

- **Canonical report template** (`src/reports/template.ts`) — every skill now
  returns the same 7-section markdown layout (Context, Executive Summary,
  Findings, Risk Register, Recommendations, Next Steps, Re-evaluation) plus
  a trailing machine-readable JSON envelope with `verdict`, `blockers[]`,
  and tool-specific `payload`. Downstream tooling (CI gates, planners) can
  parse the verdict without re-reading the prose.
- **Full OpenAPI 3.1.0 generator** (`src/reports/api-spec.ts`) — replaces
  the previous structural stub. Emits real YAML with `securitySchemes`
  (BearerJWT, OAuth2 client credentials, ApiKey), parameter refs
  (`X-Request-ID`, `Idempotency-Key`, cursor/offset paging), `ProblemDetail`
  and pagination schemas, and standard error responses
  (400/401/403/404/422/429/503). Includes per-endpoint risk detection:
  missing auth (`AUTH-`), missing idempotency on writes (`IDEMP-`),
  unlimited rate tier (`RATE-`), short sunset window (`SUNSET-`),
  pre-1.0 version (`VERSION-PRE-1.0`).
- **Heuristic feasibility scoring** (`src/reports/feasibility.ts`) — replaces
  the previous structural stub. Weighted 8-dimension scoring (security ×2,
  license ×2, maintenance ×1.5, others ×1) with per-package categorisation,
  package-specific notes (deprecated `request`, `moment`, `jsonwebtoken < 9`,
  AWS SDK lock-in, MongoDB ACID, Prisma+Lambda cold start), and
  cross-cutting risks (`COMPLIANCE-PCI-PII`, `CONSISTENCY-MISMATCH`).
- **Vitest test suite** — 35 tests across 5 files covering Zod schema
  validation, path-traversal defence in the markdown loader, the template
  engine envelope shape, and both generators.
- **ESLint + Prettier** configuration with `@typescript-eslint`,
  type-aware rules, and prettier compatibility.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint + format +
  typecheck + build + test on Node 20.x and 22.x for every push/PR.
- **npm package distribution** — `bin` entry, `files` allowlist (ships
  `dist/`, `agents/`, `skills/`, `README.md` only), `engines: node >= 18`,
  keywords, repo metadata, and a `prepublishOnly` gate that runs lint +
  tests + build before publish. The compiled `dist/index.js` now has a
  `#!/usr/bin/env node` shebang and is `chmod +x`'d during build, so
  `npx -y sdlc-ai-agents-mcp` works directly from MCP client config.
- **Workflow documentation** — README now includes a four-phase guide for
  taking a Tech RFC / Product PRD through the agents and skills, and three
  MCP-client install recipes (npx, global binary, local build).

### Changed

- `src/tools/schemas.ts` — `sunset_date` validation now rejects impossible
  calendar dates (e.g. `2026-02-31`). The previous `Date.parse`-based
  check silently rolled invalid dates forward into the next month.
- `package.json` — bumped to `1.2.0`. Build script now runs
  `tsc && chmod +x dist/index.js`.

### Notes for upgraders

- The MCP **tool names**, **prompt names**, and **input schemas** are
  unchanged. Existing MCP client configs continue to work.
- The **output shape changed**: tools now return the canonical templated
  report instead of free-form text. If you parsed the previous output
  programmatically, switch to parsing the trailing JSON envelope —
  it is the stable contract.

## [1.1.0] - prior to 1.2.0

Pre-template release. Stub generators, no test suite, no CI.

## [1.0.0] - initial release

Initial MCP server with `feature_architect` and `tech_researcher` prompts
and `generate_enterprise_api_spec` / `analyze_technical_feasibility` tool
stubs.
