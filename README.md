# 🚀 SDLC AI Agents MCP Server

> **Principal-level AI Agents and Skills for SDLC Planning via Model Context Protocol (MCP)**

A TypeScript-based MCP server that exposes specialized **AI Agent personas** and **Skills (Tools)** to assist in Software Development Life Cycle (SDLC) planning — from feature architecture and technical feasibility analysis to security auditing and dependency risk evaluation.

---

## 📐 Architecture Overview

```
gp-agents-planner/
├── agents/                        # Agent persona definitions (as MCP Prompts)
│   ├── FeatureArchitect.md        # Principal Feature Architect — full lifecycle coverage
│   └── TechResearcher.md          # Senior Technical Researcher — supply chain & risk analysis
├── skills/                        # Skill definitions (as MCP Tools)
│   ├── AnalyzeFeasibility.md      # 8-dimension feasibility evaluation framework
│   └── GenerateEnterpriseApiSpec.md # OpenAPI 3.1.0 spec generation with full enforcement rules
├── src/
│   ├── index.ts                   # Entry point with fatal error handling
│   ├── mcp-server.ts              # MCP server — allowlists, graceful shutdown, error sanitization
│   ├── tools/
│   │   └── schemas.ts             # Zod schemas with semver validation, path safety, cross-field rules
│   └── utils/
│       └── markdown-loader.ts     # Markdown loader with path traversal prevention
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

| Area | Detail |
|---|---|
| 🧠 **Identity & Seniority Signals** | How a principal thinks: reversible vs. irreversible decisions, boring-is-good, trade-off documentation |
| ⚙️ **Core Principles** | Design for Failure, Least Privilege, Immutable Infra, Observability First |
| 🔁 **Chain-of-Thought Framework** | Structured `<thinking>` with Problem Framing, Constraint Inventory, 2-alternative evaluation, Decision + Trade-off |
| 💥 **Failure Mode Catalog** | 9 named failure patterns: Thundering Herd, Hot Shard, Clock Skew, Split Brain, Connection Pool Exhaustion, Cascading Failure, Phantom Read, N+1 Query, Backpressure Blindness |
| 🔄 **Backward Compatibility Doctrine** | Postel's Law, Breaking vs. Additive changes, API versioning strategy, consumer-driven contract testing, 3-phase DB migration pattern |
| 🔐 **Security Checklist** | 20+ checkboxes across: AuthN/AuthZ, IDOR prevention, JWT validation, Input validation, Secrets management, TLS enforcement, CORS, PII protection, Supply chain |
| 📊 **Observability Mandate** | Structured JSON logging (mandatory fields), RED method metrics, W3C Distributed Tracing, Symptom-based alerting, Deadman's switch |
| 🚀 **Rollout Strategy Framework** | Pre-rollout checklist, 4-stage canary plan with Go/No-Go criteria, Feature flag rules, Post-rollout monitoring |
| 📏 **Capacity Planning Methodology** | Load model → Baseline → Bottleneck → Headroom projection → Scale plan |

**Allowed Skills:** `generate_enterprise_api_spec`, `analyze_technical_feasibility`

---

### `tech_researcher`
**File:** `agents/TechResearcher.md`

A **Senior Technical Researcher & Dependency Analyst** persona. Evaluates the feasibility, security, compatibility, operational complexity, and long-term sustainability of third-party libraries, cloud services, and architectural patterns — before any implementation decision is finalised.

**Coverage:**

| Area | Detail |
|---|---|
| 🧠 **Identity & Seniority Signals** | Thinks as a risk auditor, not a library promoter; evaluates transitive dependencies, bus factor, and abandonment risk |
| 🔬 **Research Plan Framework** | Structured `<thinking>` with scope definition, candidate identification, evaluation dimensions, disqualification criteria, data sources |
| 🛡️ **Supply Chain Security Protocol** | SBOM analysis, CVE scan against NVD/OSV/Snyk, CVSS v3.1 severity classification (table), Security disclosure policy check, Sigstore/npm provenance |
| ⚖️ **License Compatibility Matrix** | Full table: MIT/Apache2/BSD (safe) → MPL (weak copyleft) → LGPL (conditional) → GPL/AGPL/SSPL (hard blockers for SaaS); dual licensing traps |
| 🏥 **Maintenance Health Assessment** | Rubric table: last release age, open critical issues, PR merge time, active maintainer count, OpenSSF Scorecard, weekly downloads trend |
| 🖥️ **Runtime Compatibility Matrix** | Node.js LTS matrix, Linux x64/arm64, macOS arm64, Alpine/musl, serverless cold start — especially for native addon `.node` files |
| ⚡ **Performance Benchmarking Framework** | Microbenchmark vs. macrobenchmark, P99 vs. P50 latency, GC pressure, startup time, hardware spec requirements |
| 📅 **Deprecation Timeline Analysis** | EOL date tracking, successor migration path, LTS schedule, semver breaking change frequency |
| 📋 **Output: Technical Evaluation Matrix** | Structured markdown table comparing all candidates across all dimensions with ✅/⚠️/❌ indicators |

**Allowed Skills:** `analyze_technical_feasibility`

---

## 🛠️ Skills (MCP Tools)

Skills are **executable tools** exposed via the MCP `tools` capability. They accept structured inputs (validated with Zod) and return structured outputs.

### `generate_enterprise_api_spec`
**File:** `skills/GenerateEnterpriseApiSpec.md`

Generates a production-grade **OpenAPI 3.1.0 specification** with comprehensive enforcement rules.

#### Input Schema

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | `string` | ✅ | 1–200 chars; trimmed |
| `version` | `string` | ✅ | Must match semver `x.y.z` regex |
| `endpoints` | `array` | ✅ | 1–100 items |
| `endpoints[].path` | `string` | ✅ | `/^\/[a-z0-9\-\/{}]+$/`; no `..` traversal |
| `endpoints[].method` | `enum` | ✅ | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `endpoints[].summary` | `string` | ✅ | 1–300 chars; trimmed |
| `endpoints[].requires_idempotency` | `boolean` | ✅ | — |
| `endpoints[].pagination_strategy` | `enum` | ✅ | `cursor`, `offset`, `none` |
| `endpoints[].auth_scheme` | `enum` | ❌ | `bearer_jwt`*, `api_key`, `oauth2_client_credentials`, `none` |
| `endpoints[].rate_limit_tier` | `enum` | ❌ | `standard`*, `elevated`, `unlimited` |
| `endpoints[].deprecated` | `boolean` | ❌ | Default: `false` |
| `endpoints[].sunset_date` | `string` | ❌ | Required when `deprecated: true`; ISO 8601 date |

\* = default value

#### Enforcements

| Rule | Detail |
|---|---|
| **Global Headers** | `X-Request-ID`, `X-Response-Time-Ms`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` injected on all endpoints |
| **Idempotency** | `Idempotency-Key` (UUID v4) enforced on `POST`/`PUT` or when `requires_idempotency: true`; TTL 24h; scoped per user; reuse returns `422 IDEMPOTENCY_KEY_REUSE` |
| **Auth Schemes** | `bearer_jwt` (default): validates `iss`, `aud`, `exp`, `nbf`, rejects `alg: none`; `api_key`: header-only (never query param), stored as SHA-256 hash; `oauth2_client_credentials`: mTLS preferred |
| **Error Format** | RFC 7807 + mandatory machine-readable `error_code` (UPPER_SNAKE_CASE): `BAD_REQUEST`, `UNAUTHENTICATED`, `UNAUTHORIZED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, `RATE_LIMIT_EXCEEDED`, `SERVICE_UNAVAILABLE` |
| **Pagination** | `cursor`: for real-time feeds, no drift; `offset`: admin UIs, small datasets, with OFFSET N performance warning; hard `max_page_size` limit enforced |
| **Versioning** | URL prefix (`/v1`) with documented rationale; breaking changes require major version bump; 6-month minimum sunset period with `Deprecation` + `Sunset` + `Link: successor-version` headers |
| **Rate Limiting** | `standard` = 60 req/min; `elevated` = 600 req/min; `unlimited` = internal only; Token bucket algorithm; 429 response with `Retry-After` |
| **CORS** | Explicit `allowedOrigins` allowlist — `*` is a hard blocker in production; `allowCredentials: true`; `maxAge: 86400` |
| **Webhooks** | At-least-once delivery; HMAC-SHA256 payload signing (`X-Webhook-Signature`); exponential backoff retry (30s → 5m → 30m → 2h → 24h) |

---

### `analyze_technical_feasibility`
**File:** `skills/AnalyzeFeasibility.md`

Evaluates proposed libraries or architectural patterns across **8 scored dimensions** with structured output including hard blocker detection and architectural recommendations.

#### Input Schema

| Field | Type | Required | Constraints |
|---|---|---|---|
| `proposed_stack` | `string[]` | ✅ | 1–50 items; each 1–200 chars; trimmed |
| `target_throughput` | `number` | ❌ | Integer; 1–1,000,000 RPS |
| `data_consistency` | `enum` | ❌ | `strong` or `eventual` |
| `runtime_environment` | `string` | ❌ | e.g., `"node20-alpine"`, `"lambda"`, `"k8s-x64"` |
| `existing_stack` | `string[]` | ❌ | Max 50 items; for conflict detection |
| `compliance_requirements` | `enum[]` | ❌ | `gdpr`, `pci_dss`, `hipaa`, `sox`, `iso27001` |
| `deployment_model` | `enum` | ❌ | `self_hosted`, `managed_cloud`, `serverless`, `edge` |

#### Evaluation Dimensions (0–10, 0 = no risk)

| # | Dimension | Key Evaluation Factors | Hard Blocker Threshold |
|---|---|---|---|
| 1 | **Security Risk** | CVE count + CVSS severity; patch availability; security disclosure policy | Score ≥ 9 |
| 2 | **License Compatibility** | SPDX identifier; copyleft contamination; dual licensing traps | Score ≥ 8 (AGPL/SSPL/GPL for SaaS) |
| 3 | **Maintenance & Sustainability** | Last release age; active maintainer count; bus factor; OpenSSF Scorecard | — |
| 4 | **Performance Risk** | Throughput vs. target RPS; P99 latency; memory footprint; GC pressure; cold start time | — |
| 5 | **Operational Complexity** | Config surface; infra requirements (sidecar/daemon); observability support; upgrade path | — |
| 6 | **Cloud Lock-in Risk** | Cloud provider coupling; portability; migration cost | — |
| 7 | **Backward Compatibility Risk** | Semver discipline; breaking changes in minor versions; migration guide quality | — |
| 8 | **Dependency Conflict Risk** | Transitive conflicts with existing stack; duplicate packages; peer dep requirements | — |

**Overall Risk Score** = weighted average (Security × 2, License × 2, Maintenance × 1.5, others × 1)

**Output:** Structured Feasibility Report with Risk Scorecard, Hard Blockers list, Executive Summary, Per-Package Findings, Architectural Recommendations, Suggested Alternatives, and Re-evaluation Triggers.

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

### Installation

```bash
git clone https://github.com/your-username/gp-agents-planner.git
cd gp-agents-planner
npm install
```

### Running (Development)

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

The server uses **stdio transport**, making it compatible with MCP clients like **Claude Desktop** and **Cursor**.

---

## 🔌 Connecting to an MCP Client

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sdlc-agents": {
      "command": "node",
      "args": ["/absolute/path/to/gp-agents-planner/dist/index.js"]
    }
  }
}
```

### Cursor IDE

Add this to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sdlc-agents": {
      "command": "node",
      "args": ["/absolute/path/to/gp-agents-planner/dist/index.js"]
    }
  }
}
```

> **Note:** Run `npm run build` first to compile the TypeScript source before using with production MCP clients.

---

## 🧰 Tech Stack

| Technology | Role |
|---|---|
| [TypeScript](https://www.typescriptlang.org/) | Primary language (strict mode) |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | MCP server SDK |
| [Zod](https://zod.dev/) | Schema validation with cross-field rules and security constraints |
| [`zod-to-json-schema`](https://github.com/StefanTerdell/zod-to-json-schema) | Converts Zod schemas to JSON Schema for MCP tool registration |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript execution for development |

---

## 🗺️ Roadmap

- [ ] Full YAML generation implementation for `generate_enterprise_api_spec`
- [ ] Real CVE checker integration (NVD/OSV/Snyk API) for `analyze_technical_feasibility`
- [ ] License scanner integration (SPDX) for `analyze_technical_feasibility`
- [ ] Maintenance health metrics fetcher (npm registry + GitHub API)
- [ ] Add more agents: Security Auditor, DB Schema Designer, Incident Runbook Generator
- [ ] Add more skills: `generate_er_diagram`, `estimate_story_points`, `generate_adr`
- [ ] HTTP/SSE transport support alongside stdio
- [ ] Unit tests for security-critical paths (path traversal, input allowlisting)

---

## 📄 License

MIT
