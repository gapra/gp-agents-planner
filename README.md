# 🚀 SDLC AI Agents MCP Server

> **Principal-level AI Agents and Skills for SDLC Planning via Model Context Protocol (MCP)**

[![npm version](https://img.shields.io/npm/v/@gapra/sdlc-planner-mcp.svg)](https://www.npmjs.com/package/@gapra/sdlc-planner-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@gapra/sdlc-planner-mcp.svg)](https://www.npmjs.com/package/@gapra/sdlc-planner-mcp)

A TypeScript-based MCP server that exposes specialized **AI Agent personas** and **Skills (Tools)** to assist in Software Development Life Cycle (SDLC) planning — from feature architecture and technical feasibility analysis to security auditing and dependency risk evaluation.

📦 **Published on npm:** [`@gapra/sdlc-planner-mcp`](https://www.npmjs.com/package/@gapra/sdlc-planner-mcp) — install with `npx`, no clone required.

> **Renamed from `sdlc-ai-agents-mcp`** as of `1.3.0`. The old package is deprecated and points here. See [CHANGELOG](CHANGELOG.md) for migration steps.

---

## 📐 Architecture Overview

```
sdlc-planner-mcp/
├── agents/                        # Agent persona definitions (as MCP Prompts)
│   ├── FeatureArchitect.md        # Principal Feature Architect — full lifecycle coverage
│   ├── TechResearcher.md          # Senior Technical Researcher — supply chain & risk analysis
│   ├── SecurityAuditor.md         # Senior AppSec Auditor — STRIDE + OWASP API Top 10
│   └── DbSchemaDesigner.md        # Senior DB Architect — schemas built for production scale
├── skills/                        # Skill definitions (as MCP Tools)
│   ├── GenerateEnterpriseApiSpec.md  # OpenAPI 3.1.0 spec generation with full enforcement rules
│   ├── AnalyzeFeasibility.md         # 8-dimension feasibility evaluation framework
│   ├── GenerateAdr.md                # Nygard-format Architecture Decision Records
│   ├── GenerateThreatModel.md        # STRIDE-based threat model
│   ├── AnalyzeObservabilityGaps.md   # Logs/metrics/traces/SLO/alerting audit
│   └── GenerateRunbook.md            # Operational runbook scaffold
├── src/
│   ├── index.ts                   # Entry point with fatal error handling
│   ├── mcp-server.ts              # MCP server — allowlists, graceful shutdown, error sanitization
│   ├── reports/
│   │   ├── template.ts            # Canonical 7-section report template + JSON envelope
│   │   ├── api-spec.ts            # Generates OpenAPI 3.1.0 YAML wrapped in templated report
│   │   ├── feasibility.ts         # Heuristic scoring across 8 dimensions
│   │   ├── adr.ts                 # ADR generator (Nygard format)
│   │   ├── threat-model.ts        # STRIDE scoring across 6 categories
│   │   ├── observability.ts       # Pillar-coverage analysis + instrumentation plan
│   │   └── runbook.ts             # Runbook scaffold + production-readiness verdict
│   ├── tools/
│   │   └── schemas.ts             # Zod schemas with semver validation, path safety, cross-field rules
│   └── utils/
│       └── markdown-loader.ts     # Markdown loader with path traversal prevention
├── tests/                         # Vitest suite covering schemas, security, all 6 generators
├── .github/workflows/ci.yml       # Lint + format + typecheck + build + test on Node 20/22
├── .eslintrc.cjs / .prettierrc.json
├── package.json
└── tsconfig.json
```

---

## 🤖 Agents (MCP Prompts)

Agents are **persona-driven system prompts** exposed via the MCP `prompts` capability. They instruct the LLM to adopt a specific expert role with defined reasoning frameworks, constraints, checklists, and output formats.

### `feature_architect`

**File:** `agents/FeatureArchitect.md`

A **Principal Software Engineer / Staff-Plus Architect** persona. Covers the full lifecycle of a system from initial design through rollout, operation, and deprecation. Designed for engineers who understand that a decision without a documented trade-off is a risk.

**Coverage:**

| Area                                   | Detail                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧠 **Identity & Seniority Signals**    | How a principal thinks: reversible vs. irreversible decisions, boring-is-good, trade-off documentation                                                                        |
| ⚙️ **Core Principles**                 | Design for Failure, Least Privilege, Immutable Infra, Observability First                                                                                                     |
| 🔁 **Chain-of-Thought Framework**      | Structured `<thinking>` with Problem Framing, Constraint Inventory, 2-alternative evaluation, Decision + Trade-off                                                            |
| 💥 **Failure Mode Catalog**            | 9 named failure patterns: Thundering Herd, Hot Shard, Clock Skew, Split Brain, Connection Pool Exhaustion, Cascading Failure, Phantom Read, N+1 Query, Backpressure Blindness |
| 🔄 **Backward Compatibility Doctrine** | Postel's Law, Breaking vs. Additive changes, API versioning strategy, consumer-driven contract testing, 3-phase DB migration pattern                                          |
| 🔐 **Security Checklist**              | 20+ checkboxes across: AuthN/AuthZ, IDOR prevention, JWT validation, Input validation, Secrets management, TLS enforcement, CORS, PII protection, Supply chain                |
| 📊 **Observability Mandate**           | Structured JSON logging (mandatory fields), RED method metrics, W3C Distributed Tracing, Symptom-based alerting, Deadman's switch                                             |
| 🚀 **Rollout Strategy Framework**      | Pre-rollout checklist, 4-stage canary plan with Go/No-Go criteria, Feature flag rules, Post-rollout monitoring                                                                |
| 📏 **Capacity Planning Methodology**   | Load model → Baseline → Bottleneck → Headroom projection → Scale plan                                                                                                         |

**Allowed Skills:** `generate_enterprise_api_spec`, `analyze_technical_feasibility`

---

### `tech_researcher`

**File:** `agents/TechResearcher.md`

A **Senior Technical Researcher & Dependency Analyst** persona. Evaluates the feasibility, security, compatibility, operational complexity, and long-term sustainability of third-party libraries, cloud services, and architectural patterns — before any implementation decision is finalised.

**Coverage:**

| Area                                       | Detail                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧠 **Identity & Seniority Signals**        | Thinks as a risk auditor, not a library promoter; evaluates transitive dependencies, bus factor, and abandonment risk                              |
| 🔬 **Research Plan Framework**             | Structured `<thinking>` with scope definition, candidate identification, evaluation dimensions, disqualification criteria, data sources            |
| 🛡️ **Supply Chain Security Protocol**      | SBOM analysis, CVE scan against NVD/OSV/Snyk, CVSS v3.1 severity classification (table), Security disclosure policy check, Sigstore/npm provenance |
| ⚖️ **License Compatibility Matrix**        | Full table: MIT/Apache2/BSD (safe) → MPL (weak copyleft) → LGPL (conditional) → GPL/AGPL/SSPL (hard blockers for SaaS); dual licensing traps       |
| 🏥 **Maintenance Health Assessment**       | Rubric table: last release age, open critical issues, PR merge time, active maintainer count, OpenSSF Scorecard, weekly downloads trend            |
| 🖥️ **Runtime Compatibility Matrix**        | Node.js LTS matrix, Linux x64/arm64, macOS arm64, Alpine/musl, serverless cold start — especially for native addon `.node` files                   |
| ⚡ **Performance Benchmarking Framework**  | Microbenchmark vs. macrobenchmark, P99 vs. P50 latency, GC pressure, startup time, hardware spec requirements                                      |
| 📅 **Deprecation Timeline Analysis**       | EOL date tracking, successor migration path, LTS schedule, semver breaking change frequency                                                        |
| 📋 **Output: Technical Evaluation Matrix** | Structured markdown table comparing all candidates across all dimensions with ✅/⚠️/❌ indicators                                                  |

**Allowed Skills:** `analyze_technical_feasibility`

---

### `security_auditor`

**File:** `agents/SecurityAuditor.md`

A **Senior Application Security Engineer / Staff-Plus Auditor** persona. Reasons like the adversary so you find what will be exploited before they do. Distinguishes vulnerability from exposure (reachability matters), insists on defence in depth, and writes findings engineers can fix in a sprint.

**Coverage:**

| Area                            | Detail                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| 🧠 **How they think**           | Assume breach, not "if"; vuln vs exposure; defence in depth; least privilege > detection |
| 🛑 **Constraints**              | Never roll your own crypto; never weaken a control to ship faster; never log secrets/PII |
| 🔬 **Audit Plan Framework**     | Scope · Asset Inventory · Threat Actors · STRIDE Walk · Disqualification                 |
| 📋 **OWASP API Top 10 (2023+)** | All 10 mapped with concrete validation questions per risk                                |
| 📝 **Findings Template**        | Title · Severity · Reachability · Reproduction · Impact · Fix · Detection · Scope        |
| ⚖️ **Decision Rules**           | When to halt rollout (auth/authz bypass, critical CVE reachable, secrets in repo)        |

**Allowed Skills:** `generate_threat_model`, `analyze_technical_feasibility`, `generate_enterprise_api_spec`, `generate_adr`

---

### `db_schema_designer`

**File:** `agents/DbSchemaDesigner.md`

A **Senior Data Engineer / Staff-Plus Database Architect** persona. Designs for the table at year three, not week one. Workload-driven design, online migrations, deliberate denormalisation, and tested rollback procedures.

**Coverage:**

| Area                            | Detail                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 🧠 **How they think**           | Workload first (p99 at 100× rows); OLTP vs OLAP separation; multi-tenancy by default; built-in deletion strategy         |
| 🛑 **Constraints**              | No floats for money; no varchar without length; no mutable PKs; no schema + code in one release                          |
| 🔬 **Schema Design Plan**       | Workload Characterisation · Access Patterns · Normalisation · Index · Partitioning · Constraints · Retention · Migration |
| 📋 **12 Patterns to Recognise** | Surrogate keys · Soft delete · Optimistic locking · Outbox · Saga · CQRS · Time-series partitioning · etc.               |
| 🚫 **Anti-patterns Rejected**   | EAV · God tables · Unindexed FKs · Auto-generated migrations without review                                              |
| 🔄 **Migration Doctrine**       | Expand → Deploy → Contract; online migration constraints (CONCURRENTLY, NOT NULL with default)                           |

**Allowed Skills:** `generate_adr`, `analyze_technical_feasibility`, `generate_threat_model`, `generate_runbook`

---

## 🛠️ Skills (MCP Tools)

Skills are **executable tools** exposed via the MCP `tools` capability. They accept structured inputs (validated with Zod) and return structured outputs.

### `generate_enterprise_api_spec`

**File:** `skills/GenerateEnterpriseApiSpec.md`

Generates a production-grade **OpenAPI 3.1.0 specification** with comprehensive enforcement rules.

#### Input Schema

| Field                              | Type      | Required | Constraints                                                    |
| ---------------------------------- | --------- | -------- | -------------------------------------------------------------- |
| `title`                            | `string`  | ✅       | 1–200 chars; trimmed                                           |
| `version`                          | `string`  | ✅       | Must match semver `x.y.z` regex                                |
| `endpoints`                        | `array`   | ✅       | 1–100 items                                                    |
| `endpoints[].path`                 | `string`  | ✅       | `/^\/[a-z0-9\-\/{}]+$/`; no `..` traversal                     |
| `endpoints[].method`               | `enum`    | ✅       | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`                        |
| `endpoints[].summary`              | `string`  | ✅       | 1–300 chars; trimmed                                           |
| `endpoints[].requires_idempotency` | `boolean` | ✅       | —                                                              |
| `endpoints[].pagination_strategy`  | `enum`    | ✅       | `cursor`, `offset`, `none`                                     |
| `endpoints[].auth_scheme`          | `enum`    | ❌       | `bearer_jwt`\*, `api_key`, `oauth2_client_credentials`, `none` |
| `endpoints[].rate_limit_tier`      | `enum`    | ❌       | `standard`\*, `elevated`, `unlimited`                          |
| `endpoints[].deprecated`           | `boolean` | ❌       | Default: `false`                                               |
| `endpoints[].sunset_date`          | `string`  | ❌       | Required when `deprecated: true`; ISO 8601 date                |

\* = default value

#### Enforcements

| Rule               | Detail                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Headers** | `X-Request-ID`, `X-Response-Time-Ms`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` injected on all endpoints                                                                                            |
| **Idempotency**    | `Idempotency-Key` (UUID v4) enforced on `POST`/`PUT` or when `requires_idempotency: true`; TTL 24h; scoped per user; reuse returns `422 IDEMPOTENCY_KEY_REUSE`                                                               |
| **Auth Schemes**   | `bearer_jwt` (default): validates `iss`, `aud`, `exp`, `nbf`, rejects `alg: none`; `api_key`: header-only (never query param), stored as SHA-256 hash; `oauth2_client_credentials`: mTLS preferred                           |
| **Error Format**   | RFC 7807 + mandatory machine-readable `error_code` (UPPER_SNAKE_CASE): `BAD_REQUEST`, `UNAUTHENTICATED`, `UNAUTHORIZED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `RATE_LIMIT_EXCEEDED`, `SERVICE_UNAVAILABLE` |
| **Pagination**     | `cursor`: for real-time feeds, no drift; `offset`: admin UIs, small datasets, with OFFSET N performance warning; hard `max_page_size` limit enforced                                                                         |
| **Versioning**     | URL prefix (`/v1`) with documented rationale; breaking changes require major version bump; 6-month minimum sunset period with `Deprecation` + `Sunset` + `Link: successor-version` headers                                   |
| **Rate Limiting**  | `standard` = 60 req/min; `elevated` = 600 req/min; `unlimited` = internal only; Token bucket algorithm; 429 response with `Retry-After`                                                                                      |
| **CORS**           | Explicit `allowedOrigins` allowlist — `*` is a hard blocker in production; `allowCredentials: true`; `maxAge: 86400`                                                                                                         |
| **Webhooks**       | At-least-once delivery; HMAC-SHA256 payload signing (`X-Webhook-Signature`); exponential backoff retry (30s → 5m → 30m → 2h → 24h)                                                                                           |

---

### `analyze_technical_feasibility`

**File:** `skills/AnalyzeFeasibility.md`

Evaluates proposed libraries or architectural patterns across **8 scored dimensions** with structured output including hard blocker detection and architectural recommendations.

#### Input Schema

| Field                     | Type       | Required | Constraints                                          |
| ------------------------- | ---------- | -------- | ---------------------------------------------------- |
| `proposed_stack`          | `string[]` | ✅       | 1–50 items; each 1–200 chars; trimmed                |
| `target_throughput`       | `number`   | ❌       | Integer; 1–1,000,000 RPS                             |
| `data_consistency`        | `enum`     | ❌       | `strong` or `eventual`                               |
| `runtime_environment`     | `string`   | ❌       | e.g., `"node20-alpine"`, `"lambda"`, `"k8s-x64"`     |
| `existing_stack`          | `string[]` | ❌       | Max 50 items; for conflict detection                 |
| `compliance_requirements` | `enum[]`   | ❌       | `gdpr`, `pci_dss`, `hipaa`, `sox`, `iso27001`        |
| `deployment_model`        | `enum`     | ❌       | `self_hosted`, `managed_cloud`, `serverless`, `edge` |

#### Evaluation Dimensions (0–10, 0 = no risk)

| #   | Dimension                        | Key Evaluation Factors                                                                   | Hard Blocker Threshold             |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | **Security Risk**                | CVE count + CVSS severity; patch availability; security disclosure policy                | Score ≥ 9                          |
| 2   | **License Compatibility**        | SPDX identifier; copyleft contamination; dual licensing traps                            | Score ≥ 8 (AGPL/SSPL/GPL for SaaS) |
| 3   | **Maintenance & Sustainability** | Last release age; active maintainer count; bus factor; OpenSSF Scorecard                 | —                                  |
| 4   | **Performance Risk**             | Throughput vs. target RPS; P99 latency; memory footprint; GC pressure; cold start time   | —                                  |
| 5   | **Operational Complexity**       | Config surface; infra requirements (sidecar/daemon); observability support; upgrade path | —                                  |
| 6   | **Cloud Lock-in Risk**           | Cloud provider coupling; portability; migration cost                                     | —                                  |
| 7   | **Backward Compatibility Risk**  | Semver discipline; breaking changes in minor versions; migration guide quality           | —                                  |
| 8   | **Dependency Conflict Risk**     | Transitive conflicts with existing stack; duplicate packages; peer dep requirements      | —                                  |

**Overall Risk Score** = weighted average (Security × 2, License × 2, Maintenance × 1.5, others × 1)

**Output:** Structured Feasibility Report with Risk Scorecard, Hard Blockers list, Executive Summary, Per-Package Findings, Architectural Recommendations, Suggested Alternatives, and Re-evaluation Triggers.

---

### `generate_adr`

**File:** `skills/GenerateAdr.md`

Generates an **Architecture Decision Record (ADR)** in Nygard format wrapped in the canonical templated report. Captures context, options compared (≥ 2 enforced), the chosen decision, reversibility (one-way vs two-way door), consequences, and links. Surfaces ADR quality issues — missing alternatives, decision drift, under-documented one-way doors — as risk register entries.

| Quality Check                                 | Severity if Violated     |
| --------------------------------------------- | ------------------------ |
| At least 2 options compared                   | Schema rejection         |
| Decision text references a chosen option name | 🟡 `ADR-DECISION-DRIFT`  |
| One-way door has ≥ 3 consequences             | 🔴 `ADR-ONEWAY-UNDERDOC` |
| Every option has at least one pro or con      | 🟢 `ADR-EMPTY-OPTION`    |

**Output:** Ready-to-commit `docs/adr/0042-<slug>.md` markdown + options table + quality checklist.

---

### `generate_threat_model`

**File:** `skills/GenerateThreatModel.md`

Produces a **STRIDE-based threat model** scoring all six categories 0–10 with recommended controls per category. Heuristic scoring driven by inputs (auth scheme, asset sensitivity, trust boundaries, PII handling, compliance regime). Designed to **force the security conversation** rather than replace a human auditor.

| STRIDE Category            | What drives the score                           |
| -------------------------- | ----------------------------------------------- |
| **Spoofing**               | Authentication scheme; entry point count        |
| **Tampering**              | Restricted asset count; trust boundary count    |
| **Repudiation**            | Compliance regime (SOX/HIPAA → mandatory audit) |
| **Information Disclosure** | PII handling × compliance regime                |
| **Denial of Service**      | Entry point count; auth presence                |
| **Elevation of Privilege** | Restricted asset presence; trust boundaries     |

**Hard rule:** A STRIDE score ≥ 9 forces `verdict: "reject"`.

---

### `analyze_observability_gaps`

**File:** `skills/AnalyzeObservabilityGaps.md`

Evaluates a service against the FeatureArchitect **Observability Mandate**: structured logs, RED metrics, distributed traces, SLO definitions, symptom-based alerting. Identifies missing required signals, alert fatigue risk, and produces a concrete instrumentation plan ordered by priority.

| Risk ID                     | Trigger                            | Severity   |
| --------------------------- | ---------------------------------- | ---------- |
| `OBS-NO-LOGS`               | `logs` not in current signals      | 🚫 Blocker |
| `OBS-NO-METRICS`            | `metrics` not in current signals   | 🚫 Blocker |
| `OBS-NO-TRACES`             | `traces` not in current signals    | 🔴 High    |
| `OBS-NO-SLO`                | No SLO targets declared            | 🔴 High    |
| `OBS-ALERT-FATIGUE`         | `alert_count > 50`                 | 🟡 Medium  |
| `OBS-SERVERLESS-NO-METRICS` | Serverless deployment + no metrics | 🔴 High    |

---

### `generate_runbook`

**File:** `skills/GenerateRunbook.md`

Produces an **operational runbook scaffold**: severity tiers, on-call escalation, upstream dependencies, rollback procedure, and one detailed section per known failure mode (detection + mitigation + investigation + postmortem template). Verdict reflects production-readiness.

| Risk ID                     | Trigger                           | Severity   |
| --------------------------- | --------------------------------- | ---------- |
| `RUNBOOK-NO-ROLLBACK-DRILL` | `has_tested_rollback = false`     | 🚫 Blocker |
| `RUNBOOK-NO-SLO`            | `slo_target` missing              | 🔴 High    |
| `RUNBOOK-NO-DEPS`           | No upstream dependencies declared | 🟡 Medium  |
| `RUNBOOK-FEW-FAILURE-MODES` | < 3 failure modes documented      | 🟡 Medium  |
| `RUNBOOK-NO-SEV1`           | No SEV-1 tier defined             | 🟡 Medium  |

**Output:** Ready-to-commit `docs/runbooks/<service>.md` markdown + readiness checklist + failure mode map.

---

## 🔒 Security Architecture

### Path Traversal Prevention

The `markdown-loader` utility validates that every file path resolves to an absolute path strictly within `agents/` or `skills/`. Requests to paths like `../../etc/passwd` are rejected before any filesystem access occurs.

### Input Allowlisting

All MCP prompt and tool names are validated against explicit allowlists (`ALLOWED_PROMPTS` Map, `ALLOWED_TOOLS` Set) before any handler logic runs. Unknown names are rejected immediately.

### Error Sanitization

Raw error messages (which may contain internal filesystem paths or stack traces) are sanitized before being sent to MCP clients. Filesystem paths are redacted and message length is capped.

### Schema Hardening

All tool inputs are validated with strict Zod schemas:

- `version` field validated against semver regex
- API paths validated against `^\/[a-z0-9\-\/{}]+$` (blocks `../` traversal in path values)
- All strings have `.trim()` applied (prevents whitespace injection)
- Arrays have `max()` guards (prevents DoS via unbounded processing)
- Cross-field validation (e.g., `sunset_date` required when `deprecated: true`)

### Graceful Shutdown

SIGTERM and SIGINT handlers ensure the MCP server closes cleanly, preventing mid-request termination that could leave MCP clients in an undefined state. Unhandled promise rejections are logged without crashing the server.

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** >= 18 (LTS recommended: 20 or 22)
- **npm** >= 9

### Option A — Use the published npm package (recommended for end users)

No clone, no build. The MCP client launches the server on demand via `npx`:

```bash
npx -y @gapra/sdlc-planner-mcp
```

You normally do not run this directly — point your MCP client at it (see [Connecting to an MCP Client](#-connecting-to-an-mcp-client) below).

To install globally instead of using `npx`:

```bash
npm install -g @gapra/sdlc-planner-mcp
sdlc-planner-mcp   # binary on your PATH
```

### Option B — Clone and build from source (for contributors)

```bash
git clone https://github.com/gapra/sdlc-planner-mcp.git
cd sdlc-planner-mcp
npm install
npm run dev          # development (tsx)
npm run build && npm start   # production build
```

The server uses **stdio transport**, making it compatible with MCP clients like **Claude Desktop** and **Cursor**.

---

## 🔌 Connecting to an MCP Client

Pick the recipe that matches how you installed the server.

### Recipe 1 — From npm (zero install, recommended)

Works in **Claude Desktop** (`claude_desktop_config.json`) or **Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sdlc-planner": {
      "command": "npx",
      "args": ["-y", "@gapra/sdlc-planner-mcp"]
    }
  }
}
```

> The first launch downloads the package; subsequent launches reuse the npx cache. Pin a version with `@gapra/sdlc-planner-mcp@1.3.0` if you want reproducible behaviour across machines.

### Recipe 2 — Globally installed binary

After `npm install -g @gapra/sdlc-planner-mcp`:

```json
{
  "mcpServers": {
    "sdlc-planner": {
      "command": "sdlc-planner-mcp"
    }
  }
}
```

### Recipe 3 — Local build (for contributors)

After `npm run build` in your clone:

```json
{
  "mcpServers": {
    "sdlc-planner": {
      "command": "node",
      "args": ["/absolute/path/to/sdlc-planner-mcp/dist/index.js"]
    }
  }
}
```

> **Restart your MCP client** after editing the config. In Claude Desktop you should see `sdlc-planner` in the MCP icon menu, with `feature_architect` / `tech_researcher` available as prompts and the two skills as callable tools.

---

## 📘 Workflow: From RFC / PRD → Implementation Plan

When you receive a **Tech RFC**, **Product PRD**, **Design Doc**, or **JIRA epic**, run it through the agents and skills _before_ writing any code. The flow is always the same four phases.

### Phase 0 — Load the document into the conversation

Open your MCP client (Claude Desktop / Cursor) and either paste the doc inline or attach the file. Do not summarise — give the agent the full text. The Feature Architect persona is trained to extract requirements itself.

### Phase 1 — Activate the persona that matches the document type

| Document type                    | Persona to activate (MCP prompt)            | Why                                                                                   |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Product PRD / feature brief      | `feature_architect`                         | Maps business intent → SLOs, failure modes, rollout plan                              |
| Tech RFC / design doc            | `feature_architect`                         | Validates the proposed design against the failure-mode catalog and security checklist |
| Library / framework selection    | `tech_researcher`                           | Runs the supply-chain + license + maintenance protocol                                |
| Mixed (PRD that names libraries) | `feature_architect`, then `tech_researcher` | Architect first frames constraints; researcher then evaluates the picks               |

In Claude Desktop / Cursor, the persona is loaded by selecting it from the **MCP Prompts** menu (or `/feature_architect`, `/tech_researcher`).

### Phase 2 — Let the persona produce its `<thinking>` block

Both personas force a structured reasoning pass before any tool call. Do not skip it. The block makes the implicit explicit:

- **Feature Architect** → Problem framing, constraint inventory (RPS / latency / consistency / tenancy / compliance), two-alternative comparison, decision + reversibility, edge cases.
- **Tech Researcher** → Research scope, candidate list, evaluation dimensions, disqualification criteria, data sources.

If the doc is missing a constraint (no RPS target, no consistency model, no compliance scope), the persona will ask you. Answer those questions before moving on — every downstream score depends on them.

### Phase 3 — Invoke the skills (templated outputs)

Once constraints are explicit, the persona will (or you can ask it to) call the skills. The output of every skill is a **canonical 7-section report** with a machine-readable JSON envelope (see [Report Template](#-report-template)).

**Pattern A — Validate the proposed stack first**

```
Tool:  analyze_technical_feasibility
Input: {
  "proposed_stack": ["fastify@4.26.0", "pg@8.11.0", "bullmq@5.7.0", "@aws-sdk/client-s3@3.580.0"],
  "target_throughput": 5000,
  "data_consistency": "strong",
  "runtime_environment": "node20-alpine",
  "deployment_model": "managed_cloud",
  "compliance_requirements": ["pci_dss", "gdpr"],
  "existing_stack": ["express@4.19.0", "pg@8.11.0"]
}
```

Read the **Risk Register** and **JSON envelope**:

- `verdict: "reject"` → stop. Resolve every blocker before proceeding to API design.
- `verdict: "approve_with_conditions"` → record the listed mitigations as ADR follow-ups, then continue.
- `verdict: "approve"` → continue.

**Pattern B — Generate the API contract**

```
Tool:  generate_enterprise_api_spec
Input: {
  "title": "Payment Service API",
  "version": "1.0.0",
  "endpoints": [
    { "path": "/payment-methods", "method": "GET", "summary": "List payment methods", "requires_idempotency": false, "pagination_strategy": "cursor" },
    { "path": "/payment-methods", "method": "POST", "summary": "Add a payment method", "requires_idempotency": true, "pagination_strategy": "none", "rate_limit_tier": "elevated" },
    { "path": "/payment-methods/{id}", "method": "DELETE", "summary": "Remove a payment method", "requires_idempotency": true, "pagination_strategy": "none" }
  ]
}
```

The output includes:

1. The full **OpenAPI 3.1.0 YAML** (drop directly into your repo as `openapi.yaml`).
2. **Endpoint Inventory table** — quick visual review.
3. **Enforced Conventions** — auth, idempotency, errors, rate limits, versioning, CORS.
4. **Quality Gate Checklist** — unique paths, idempotency on writes, pagination on GETs, deprecation discipline.
5. **Risk Register** flagging any auth-less endpoints, missing idempotency on writes, or short sunset windows.

### Phase 4 — Convert the report into your team's artefacts

Each templated section maps cleanly onto a real planning artefact:

| Report section        | Where it goes                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| **Context**           | Top of the implementation ticket / ADR header                                 |
| **Executive Summary** | First paragraph of the RFC's "Decision" section                               |
| **Findings**          | The OpenAPI YAML → committed; the scorecard → an ADR appendix                 |
| **Risk Register**     | One JIRA sub-task per risk, linked to the ADR                                 |
| **Recommendations**   | Acceptance criteria for the implementation ticket                             |
| **Next Steps**        | Sprint backlog items (each one is already a checkbox with optional owner/due) |
| **Re-evaluation**     | Calendar reminder / scheduled follow-up                                       |
| **JSON envelope**     | CI gate input — fail the PR if `verdict == "reject"` or `blockers.length > 0` |

### End-to-end example (PRD-driven)

> **PRD:** "Let users save & charge multiple credit cards. Peak load is ~3k RPS, must be PCI-DSS compliant, must support GDPR right-to-erasure."

1. `/feature_architect` → produces `<thinking>` block; identifies missing constraints (data residency? token TTL?); asks before continuing.
2. After answers, the architect proposes a stack: `fastify`, `pg`, `bullmq`, `@aws-sdk/client-kms`.
3. Architect calls `analyze_technical_feasibility` with that stack + `compliance_requirements: ["pci_dss", "gdpr"]`. The report flags `COMPLIANCE-PCI-PII` (high) — **do not store PAN/CVV; tokenise at the boundary**.
4. Architect updates the design: PAN tokenised by Stripe / Adyen, only token IDs stored.
5. Architect calls `generate_enterprise_api_spec` with the revised endpoint list. The report's Risk Register confirms zero high-severity findings → `verdict: "approve"`.
6. The OpenAPI YAML, the ADR (built from Findings + Recommendations), and the JIRA tickets (built from Next Steps) all flow from one consistent artefact set.

### Quick decision tree

```
Got an RFC / PRD?
  └─ Does it name specific libraries?
        ├─ Yes → start with `tech_researcher` → analyze_technical_feasibility
        └─ No  → start with `feature_architect` → propose a stack
                 → analyze_technical_feasibility on the proposal
  └─ Does it expose a public API surface?
        ├─ Yes → generate_enterprise_api_spec → commit the YAML
        └─ No  → skip; the feasibility report is enough
  └─ Verdict in JSON envelope?
        ├─ approve              → ship the implementation tickets
        ├─ approve_with_conditions → record mitigations as ADR follow-ups, then ship
        └─ reject               → loop back; do not start coding
```

---

## 🧰 Tech Stack

| Technology                                                                            | Role                                                              |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [TypeScript](https://www.typescriptlang.org/)                                         | Primary language (strict mode)                                    |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | MCP server SDK                                                    |
| [Zod](https://zod.dev/)                                                               | Schema validation with cross-field rules and security constraints |
| [`zod-to-json-schema`](https://github.com/StefanTerdell/zod-to-json-schema)           | Converts Zod schemas to JSON Schema for MCP tool registration     |
| [tsx](https://github.com/privatenumber/tsx)                                           | TypeScript execution for development                              |

---

## 📑 Report Template

Every skill returns a markdown report following the same canonical 7-section flow, plus a trailing machine-readable JSON envelope. This guarantees:

- LLM consumers and humans scan reports identically across tools.
- Downstream tooling (CI gates, planners) can parse the verdict without re-reading the prose.
- A future layout change touches one file (`src/reports/template.ts`).

````
# <Title>
> Tool · Schema · Generated · Verdict

## 1. Context           ← inputs summarised for traceability
## 2. Executive Summary ← 2–3 sentences, leads with the verdict
## 3. Findings          ← body sections (e.g. generated YAML, scorecard)
## 4. Risk Register     ← table: ID · Severity · Description · Mitigation
## 5. Recommendations   ← numbered, actionable
## 6. Next Steps        ← checklist with owner/due hooks
## 7. Re-evaluation     ← when to revisit

```json
{ "tool": "...", "verdict": "approve | approve_with_conditions | reject", "blockers": [], "payload": {} }
```
````

**Verdict values:** `approve`, `approve_with_conditions`, `reject`, `needs_review`. Any risk with severity `blocker` forces `reject` and is listed in `envelope.blockers` for CI gating.

---

## 🧪 Quality Gates

| Gate          | Command                 | What it does                                                           |
| ------------- | ----------------------- | ---------------------------------------------------------------------- |
| **Lint**      | `npm run lint`          | ESLint with `@typescript-eslint` + Prettier compatibility              |
| **Format**    | `npm run format:check`  | Prettier validates formatting; `npm run format` writes fixes           |
| **Typecheck** | `npm run typecheck`     | `tsc --noEmit` over `src/` and `tests/`                                |
| **Test**      | `npm test`              | Vitest — 35 tests across schema validation, path-traversal, generators |
| **Coverage**  | `npm run test:coverage` | v8 coverage reporter (`text` + `html`)                                 |
| **Build**     | `npm run build`         | Compiles `src/` → `dist/`                                              |
| **CI**        | GitHub Actions          | Runs all of the above on Node 20.x and 22.x for every push/PR          |

---

## 🗺️ Roadmap

- [x] Full YAML generation implementation for `generate_enterprise_api_spec`
- [x] Heuristic 8-dimension scoring for `analyze_technical_feasibility`
- [x] Canonical report template with machine-readable JSON envelope
- [x] Vitest suite covering security-critical paths (path traversal, input allowlisting)
- [x] ESLint, Prettier, GitHub Actions CI on Node 20/22
- [ ] Real CVE checker integration (NVD/OSV/Snyk API) — replace heuristics
- [ ] License scanner integration (SPDX) — replace heuristics
- [ ] Maintenance health metrics fetcher (npm registry + GitHub API)
- [ ] Add more agents: Security Auditor, DB Schema Designer, Incident Runbook Generator
- [ ] Add more skills: `generate_er_diagram`, `estimate_story_points`, `generate_adr`
- [ ] HTTP/SSE transport support alongside stdio

---

## 📄 License

MIT
