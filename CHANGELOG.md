# Changelog

All notable changes to `sdlc-ai-agents-mcp` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  + pagination schemas, and standard error responses (400/401/403/404/422/
  429/503). Includes per-endpoint risk detection: missing auth (`AUTH-`),
  missing idempotency on writes (`IDEMP-`), unlimited rate tier (`RATE-`),
  short sunset window (`SUNSET-`), pre-1.0 version (`VERSION-PRE-1.0`).
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
