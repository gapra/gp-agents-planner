import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  GenerateApiSpecSchema,
  AnalyzeFeasibilitySchema,
  GenerateAdrSchema,
  GenerateThreatModelSchema,
  AnalyzeObservabilityGapsSchema,
  GenerateRunbookSchema,
} from "./tools/schemas.js";
import { loadMarkdown } from "./utils/markdown-loader.js";
import { generateEnterpriseApiSpec } from "./reports/api-spec.js";
import { generateFeasibilityReport } from "./reports/feasibility.js";
import { generateAdr } from "./reports/adr.js";
import { generateThreatModel } from "./reports/threat-model.js";
import { generateObservabilityReport } from "./reports/observability.js";
import { generateRunbook } from "./reports/runbook.js";

// ---------------------------------------------------------------------------
// Allowlisted prompt names
// ---------------------------------------------------------------------------

/**
 * Strict allowlist of valid prompt names. Any request for a name not in this
 * set will be rejected with an MCP error before any filesystem access occurs.
 * This prevents prompt-injection attacks or probing of the filesystem via
 * the GetPrompt handler.
 */
const ALLOWED_PROMPTS = new Map<string, { description: string; file: string }>([
  [
    "feature_architect",
    {
      description:
        "Principal Architect persona for designing robust, secure, and scalable backend systems.",
      file: "agents/FeatureArchitect.md",
    },
  ],
  [
    "tech_researcher",
    {
      description:
        "Senior Researcher for evaluating dependencies, CVE exposure, license compatibility, and technical feasibility.",
      file: "agents/TechResearcher.md",
    },
  ],
  [
    "security_auditor",
    {
      description:
        "Senior Application Security Engineer persona for STRIDE threat modelling, OWASP API Top 10 review, and producing actionable security findings.",
      file: "agents/SecurityAuditor.md",
    },
  ],
  [
    "db_schema_designer",
    {
      description:
        "Senior Database Architect persona for designing schemas that survive production scale: workload-driven design, online migrations, indexing strategy, and partitioning.",
      file: "agents/DbSchemaDesigner.md",
    },
  ],
]);

/**
 * Strict allowlist of valid tool names. This prevents any dynamic tool
 * dispatch from being exploited with unexpected names.
 */
const ALLOWED_TOOLS = new Set([
  "generate_enterprise_api_spec",
  "analyze_technical_feasibility",
  "generate_adr",
  "generate_threat_model",
  "analyze_observability_gaps",
  "generate_runbook",
]);

// ---------------------------------------------------------------------------
// McpAgentServer
// ---------------------------------------------------------------------------

export class McpAgentServer {
  private server: Server;
  private transport: StdioServerTransport | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "sdlc-feature-planning-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );

    this.setupPromptHandlers();
    this.setupToolHandlers();
    this.setupGracefulShutdown();
  }

  // -------------------------------------------------------------------------
  // AGENTS (PROMPTS)
  // -------------------------------------------------------------------------

  private setupPromptHandlers() {
    // List available prompts — derived from the allowlist to keep it DRY
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: Array.from(ALLOWED_PROMPTS.entries()).map(([name, meta]) => ({
          name,
          description: meta.description,
        })),
      };
    });

    // Serve a prompt by name — validates against allowlist before filesystem access
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const name = request.params.name;

      // Allowlist check — reject unknown or unexpected prompt names immediately
      const promptMeta = ALLOWED_PROMPTS.get(name);
      if (!promptMeta) {
        throw new Error(
          `Prompt not found: '${sanitizeForLog(name)}'. ` +
            `Available prompts: ${Array.from(ALLOWED_PROMPTS.keys()).join(", ")}.`,
        );
      }

      // loadMarkdown will throw (not silently fail) if the file cannot be read
      // or if the path is outside allowed roots (additional defence-in-depth).
      const content = await loadMarkdown(promptMeta.file);

      return {
        description: promptMeta.description,
        messages: [
          {
            // "user" role is used here per MCP prompt specification.
            // The prompt content acts as the initial context message sent to the LLM.
            // MCP host clients (Claude Desktop, Cursor) prepend this as the first
            // message in the conversation, establishing the agent persona.
            role: "user",
            content: { type: "text", text: content },
          },
        ],
      };
    });
  }

  // -------------------------------------------------------------------------
  // SKILLS (TOOLS)
  // -------------------------------------------------------------------------

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "generate_enterprise_api_spec",
            description:
              "Generates a production-grade OpenAPI 3.1.0 specification enforcing: " +
              "authentication schemes (JWT, OAuth2, API Key), idempotency (Idempotency-Key header), " +
              "structured error formats (RFC 7807 + machine-readable error_code), cursor/offset pagination, " +
              "API versioning strategy, deprecation lifecycle (Deprecation + Sunset headers), " +
              "rate limiting policy (X-RateLimit-* headers), and CORS policy.",
            inputSchema: zodToJsonSchema(GenerateApiSpecSchema),
          },
          {
            name: "analyze_technical_feasibility",
            description:
              "Evaluates implementation risks and produces a structured feasibility report across 8 dimensions: " +
              "Security (CVE/CVSS analysis), License compatibility, Maintenance health, Performance risk, " +
              "Operational complexity, Cloud lock-in risk, Backward compatibility risk, and Dependency conflict risk. " +
              "Returns an overall risk score (0–10) with hard blocker identification and architectural recommendations.",
            inputSchema: zodToJsonSchema(AnalyzeFeasibilitySchema),
          },
          {
            name: "generate_adr",
            description:
              "Generates an Architecture Decision Record (ADR) in Nygard format. Captures context, options compared, " +
              "the chosen decision, reversibility (one-way vs two-way door), consequences, and related links. " +
              "Surfaces ADR quality issues (missing alternatives, decision drift, under-documented one-way doors) as risks.",
            inputSchema: zodToJsonSchema(GenerateAdrSchema),
          },
          {
            name: "generate_threat_model",
            description:
              "Produces a STRIDE-based threat model (Spoofing, Tampering, Repudiation, Information Disclosure, " +
              "Denial of Service, Elevation of Privilege). Scores each category 0–10, lists recommended controls, " +
              "and flags compliance/auth/PII interactions. Output drives security review punch-list.",
            inputSchema: zodToJsonSchema(GenerateThreatModelSchema),
          },
          {
            name: "analyze_observability_gaps",
            description:
              "Evaluates a service against the Observability Mandate (structured logs, RED metrics, distributed " +
              "traces, SLOs, symptom alerting). Identifies missing required signals, alert fatigue risk, and " +
              "produces a concrete instrumentation plan ordered by priority.",
            inputSchema: zodToJsonSchema(AnalyzeObservabilityGapsSchema),
          },
          {
            name: "generate_runbook",
            description:
              "Produces an operational runbook scaffold: severity tiers, on-call escalation, upstream dependencies, " +
              "rollback procedure, and one section per known failure mode (detection + mitigation + investigation + " +
              "postmortem template). Verdict reflects production-readiness (rollback tested, SLO defined, etc.).",
            inputSchema: zodToJsonSchema(GenerateRunbookSchema),
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Allowlist check — reject unknown tool names before any processing
      if (!ALLOWED_TOOLS.has(name)) {
        return {
          content: [
            {
              type: "text",
              text: `Tool not found: '${sanitizeForLog(name)}'. Available tools: ${Array.from(ALLOWED_TOOLS).join(", ")}.`,
            },
          ],
          isError: true,
        };
      }

      try {
        if (name === "generate_enterprise_api_spec") {
          const parsedArgs = GenerateApiSpecSchema.parse(args);
          const report = generateEnterpriseApiSpec(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        if (name === "analyze_technical_feasibility") {
          const parsedArgs = AnalyzeFeasibilitySchema.parse(args);
          const report = generateFeasibilityReport(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        if (name === "generate_adr") {
          const parsedArgs = GenerateAdrSchema.parse(args);
          const report = generateAdr(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        if (name === "generate_threat_model") {
          const parsedArgs = GenerateThreatModelSchema.parse(args);
          const report = generateThreatModel(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        if (name === "analyze_observability_gaps") {
          const parsedArgs = AnalyzeObservabilityGapsSchema.parse(args);
          const report = generateObservabilityReport(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        if (name === "generate_runbook") {
          const parsedArgs = GenerateRunbookSchema.parse(args);
          const report = generateRunbook(parsedArgs);
          return { content: [{ type: "text", text: report }] };
        }

        // Should never reach here due to allowlist check above, but kept as a safety net
        throw new Error(`Unhandled tool: ${sanitizeForLog(name)}`);
      } catch (error: unknown) {
        // Sanitize error messages before sending to the client.
        // We deliberately avoid exposing: stack traces, internal file paths,
        // or raw system error messages that could leak implementation details.
        const safeMessage = sanitizeErrorMessage(error);
        return {
          content: [
            {
              type: "text",
              text: `Error executing tool '${sanitizeForLog(name)}': ${safeMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // -------------------------------------------------------------------------
  // GRACEFUL SHUTDOWN
  // -------------------------------------------------------------------------

  /**
   * Registers handlers for SIGTERM and SIGINT to allow the server to shut down
   * cleanly. Without this, termination signals (e.g., from Docker, Kubernetes,
   * or the OS) will kill the process mid-request, potentially corrupting state
   * or leaving MCP clients in an undefined state.
   */
  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.error(`[McpAgentServer] Received ${signal}. Initiating graceful shutdown...`);
      try {
        await this.server.close();
        console.error("[McpAgentServer] Server closed cleanly. Exiting.");
        process.exit(0);
      } catch (err) {
        console.error("[McpAgentServer] Error during shutdown:", err);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Catch unhandled promise rejections to prevent silent failures that
    // crash the process without a useful error message.
    process.on("unhandledRejection", (reason) => {
      console.error("[McpAgentServer] Unhandled promise rejection:", reason);
      // Do not exit — log and continue. MCP servers should be resilient to
      // individual request failures.
    });
  }

  // -------------------------------------------------------------------------
  // START
  // -------------------------------------------------------------------------

  public async start() {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error("🚀 SDLC MCP Server running on stdio transport");
    console.error(`   Available prompts: ${Array.from(ALLOWED_PROMPTS.keys()).join(", ")}`);
    console.error(`   Available tools:   ${Array.from(ALLOWED_TOOLS).join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Security utility functions
// ---------------------------------------------------------------------------

/**
 * Strips characters that could be used for log injection or newline injection
 * before including user-controlled values in log output.
 * Limits output to 100 characters to prevent log flooding.
 */
function sanitizeForLog(value: unknown): string {
  if (typeof value !== "string") return String(value).slice(0, 100);
  return value.replace(/[\r\n\t]/g, " ").slice(0, 100);
}

/**
 * Extracts a safe, user-facing error message without leaking internal details.
 *
 * Rules:
 * - Zod validation errors: return the formatted validation message (safe, user-facing).
 * - Known Error instances: return only the `.message` property.
 * - Unknown throws: return a generic message to prevent information leakage.
 *
 * What we deliberately exclude:
 * - Stack traces (reveal internal file paths and line numbers)
 * - System error codes with filesystem paths (e.g., ENOENT /internal/path/to/file)
 * - Raw Zod issue paths that reference internal schema structure
 */
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // For Zod parse errors, the message is already structured and user-facing.
    // For other errors, return only the message (not the stack).
    const msg = error.message;
    // Remove any filesystem paths that may appear in the message (e.g., from ENOENT)
    const sanitized = msg.replace(/([A-Za-z]:)?\/[^\s'",]*/g, "[path]");
    return sanitized.slice(0, 500); // Limit length
  }
  return "An unexpected error occurred. Please check your input and try again.";
}
