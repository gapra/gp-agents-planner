# 🚀 SDLC AI Agents MCP Server

> **Principal-level AI Agents and Skills for SDLC Planning via Model Context Protocol (MCP)**

A TypeScript-based MCP server that exposes specialized **AI Agent personas** and **Skills (Tools)** to assist in Software Development Life Cycle (SDLC) planning — from feature architecture to technical feasibility analysis.

---

## 📐 Architecture Overview

```
gp-agents-planner/
├── agents/                        # Agent persona definitions (as MCP Prompts)
│   ├── FeatureArchitect.md        # Principal Feature Architect persona
│   └── TechResearcher.md          # Senior Technical Researcher persona
├── skills/                        # Skill definitions (as MCP Tools)
│   ├── AnalyzeFeasibility.md      # Feasibility analysis skill spec
│   └── GenerateEnterpriseApiSpec.md # OpenAPI spec generation skill spec
├── src/
│   ├── index.ts                   # Entry point
│   ├── mcp-server.ts              # MCP server setup (prompts + tools)
│   ├── tools/
│   │   └── schemas.ts             # Zod schemas for tool input validation
│   └── utils/
│       └── markdown-loader.ts     # Utility to load .md agent definitions
├── package.json
└── tsconfig.json
```

---

## 🤖 Agents (MCP Prompts)

Agents are **persona-driven system prompts** exposed via the MCP `prompts` capability. They instruct the LLM to adopt a specific expert role with defined reasoning frameworks and constraints.

### `feature_architect`
**File:** `agents/FeatureArchitect.md`

A **Principal Software Engineer / Staff-Plus Architect** persona. Designed to bridge abstract business requirements and concrete, production-ready technical specifications.

- 🔁 **Design for Failure** — assumes external services will fail; enforces retries and circuit breakers
- 🧱 **Boring is Good** — prefers established technologies unless there's a quantifiable 10x benefit
- 🔐 **Secure by Design** — validates all inputs, applies Principle of Least Privilege
- 🧠 **Chain-of-Thought Reasoning** — uses `<thinking>` tags to evaluate two alternatives before choosing an approach

**Allowed Skills:** `generate_enterprise_api_spec`, `analyze_technical_feasibility`

---

### `tech_researcher`
**File:** `agents/TechResearcher.md`

A **Senior Technical Researcher & Dependency Analyst** persona. Evaluates feasibility, security, and compatibility of third-party libraries and architectural patterns before implementation begins.

- 🚫 Never recommends deprecated libraries
- 🔍 Always checks for known CVEs
- 📊 Outputs a **Technical Matrix** comparing options by: Bundle size, Performance, Security, and License type

---

## 🛠️ Skills (MCP Tools)

Skills are **executable tools** exposed via the MCP `tools` capability. They accept structured inputs (validated with Zod) and return structured outputs.

### `generate_enterprise_api_spec`
**File:** `skills/GenerateEnterpriseApiSpec.md`

Generates a production-grade **OpenAPI 3.1.0 specification**.

| Input Field | Type | Description |
|---|---|---|
| `title` | `string` | API domain name |
| `version` | `string` | Semantic version (e.g., `1.0.0`) |
| `endpoints` | `array` | List of endpoint definitions |
| `endpoints[].path` | `string` | Lowercase, plural, kebab-case path |
| `endpoints[].method` | `enum` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `endpoints[].summary` | `string` | Short description of the endpoint |
| `endpoints[].requires_idempotency` | `boolean` | Enforce `Idempotency-Key` header |
| `endpoints[].pagination_strategy` | `enum` | `cursor`, `offset`, or `none` (default) |

**Enforcements:** Global `X-Request-ID` header, `Idempotency-Key` for POST/PUT, RFC 7807 error format, cursor/offset pagination.

---

### `analyze_technical_feasibility`
**File:** `skills/AnalyzeFeasibility.md`

Evaluates **implementation risks**, potential tech debt, and dependency conflicts for a proposed feature or library stack.

| Input Field | Type | Description |
|---|---|---|
| `proposed_stack` | `string[]` | List of libraries or tools to evaluate |
| `target_throughput` | `number` *(optional)* | Expected RPS (Requests Per Second) |
| `data_consistency` | `enum` *(optional)* | `strong` or `eventual` |

**Output:** A risk score (0–10) with architectural adjustment recommendations.

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** >= 18
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
| [TypeScript](https://www.typescriptlang.org/) | Primary language |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | MCP server SDK |
| [Zod](https://zod.dev/) | Schema validation for tool inputs |
| [`zod-to-json-schema`](https://github.com/StefanTerdell/zod-to-json-schema) | Converts Zod schemas to JSON Schema for MCP |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript execution for development |

---

## 🗺️ Roadmap

- [ ] Full YAML generation implementation for `generate_enterprise_api_spec`
- [ ] Real dependency & CVE checker for `analyze_technical_feasibility`
- [ ] Add more agents (e.g., Security Auditor, DB Schema Designer)
- [ ] Add more skills (e.g., `generate_er_diagram`, `estimate_story_points`)
- [ ] HTTP/SSE transport support alongside stdio

---

## 📄 License

MIT
