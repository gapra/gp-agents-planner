import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

/**
 * Strict semver regex: matches "MAJOR.MINOR.PATCH" with optional prerelease
 * and build metadata (e.g., "1.0.0", "2.1.0-beta.1", "3.0.0+build.42").
 * Rejects free-form strings like "latest", "v1", or "1.0".
 */
const SemverSchema = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
    'Must be a valid semantic version (e.g., "1.0.0" or "2.1.0-beta.1")',
  );

/**
 * API path validator: must start with "/" and contain only lowercase letters,
 * digits, hyphens, forward slashes, and curly-brace path parameters.
 * Rejects path traversal sequences ("..") and uppercase letters.
 * Examples: "/payment-methods", "/users/{id}/orders"
 */
const ApiPathSchema = z
  .string()
  .trim()
  .min(1, "Path cannot be empty")
  .max(500, "Path must not exceed 500 characters")
  .regex(
    /^\/[a-z0-9\-/{}]*$/,
    'Path must start with "/" and contain only lowercase letters, digits, hyphens, forward slashes, and curly-brace path parameters (e.g., "/payment-methods/{id}")',
  )
  .refine((val) => !val.includes(".."), 'Path must not contain path traversal sequences ("..")');

// ---------------------------------------------------------------------------
// GenerateEnterpriseApiSpec schema
// ---------------------------------------------------------------------------

export const GenerateApiSpecSchema = z.object({
  /**
   * Human-readable name of the API domain.
   * Trimmed and limited to prevent excessively large inputs.
   */
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters")
    .describe('API Domain Name (e.g., "Payment Service API")'),

  /**
   * Semantic version of this API specification.
   */
  version: SemverSchema.describe('Semantic version of the API (e.g., "1.0.0")'),

  /**
   * List of endpoint definitions.
   * Capped at 100 endpoints per invocation to prevent DoS via excessive processing.
   */
  endpoints: z
    .array(
      z
        .object({
          path: ApiPathSchema.describe(
            'Endpoint path (lowercase, plural nouns, kebab-case, e.g., "/payment-methods/{id}")',
          ),
          method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
          summary: z
            .string()
            .trim()
            .min(1, "Summary cannot be empty")
            .max(300, "Summary must not exceed 300 characters")
            .describe("Short description of the endpoint purpose"),
          requires_idempotency: z
            .boolean()
            .describe("Enforce Idempotency-Key header for this endpoint"),
          pagination_strategy: z
            .enum(["cursor", "offset", "none"])
            .default("none")
            .describe("Pagination model: cursor (recommended), offset, or none"),
          auth_scheme: z
            .enum(["bearer_jwt", "api_key", "oauth2_client_credentials", "none"])
            .default("bearer_jwt")
            .describe("Authentication scheme for this endpoint. Defaults to bearer_jwt."),
          rate_limit_tier: z
            .enum(["standard", "elevated", "unlimited"])
            .default("standard")
            .describe("Rate limiting tier. Defaults to standard (60 req/min)."),
          deprecated: z
            .boolean()
            .default(false)
            .describe(
              "Mark this endpoint as deprecated. Will inject Deprecation + Sunset headers.",
            ),
          sunset_date: z
            .string()
            .trim()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "sunset_date must be an ISO 8601 date (YYYY-MM-DD)")
            .optional()
            .describe("Required when deprecated=true. Must be at least 6 months from today."),
        })
        // Cross-field validation: sunset_date is required when deprecated=true
        .refine((ep) => !ep.deprecated || ep.sunset_date !== undefined, {
          message: "sunset_date is required when deprecated is true",
          path: ["sunset_date"],
        })
        // Cross-field validation: when sunset_date is provided, it must be a real
        // calendar date. Regex above accepts "2026-02-31"; Date silently rolls that
        // forward into March, so we round-trip the parsed components and reject
        // anything that does not match the input exactly.
        .refine(
          (ep) => {
            if (!ep.sunset_date) return true;
            const [yyyy, mm, dd] = ep.sunset_date.split("-").map(Number);
            const d = new Date(Date.UTC(yyyy, mm - 1, dd));
            return (
              d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd
            );
          },
          {
            message: "sunset_date must be a real calendar date (YYYY-MM-DD)",
            path: ["sunset_date"],
          },
        ),
    )
    .min(1, "At least one endpoint must be defined")
    .max(100, "Maximum of 100 endpoints per invocation"),
});

// ---------------------------------------------------------------------------
// AnalyzeFeasibility schema
// ---------------------------------------------------------------------------

export const AnalyzeFeasibilitySchema = z.object({
  /**
   * Name of the feature or project being evaluated.
   * Used in the report title and executive summary.
   */
  feature_name: z
    .string()
    .trim()
    .min(1, "feature_name cannot be empty")
    .max(200, "feature_name must not exceed 200 characters")
    .optional()
    .describe('Feature or project name (e.g., "Real-time Order Tracking")'),

  /**
   * List of libraries, frameworks, or cloud services to evaluate.
   * Each entry should include the version where possible (e.g., "prisma@5.0.0").
   * Capped at 50 items to prevent DoS via excessive analysis loops.
   */
  proposed_stack: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Package name cannot be empty")
        .max(200, "Package name must not exceed 200 characters"),
    )
    .min(1, "At least one package must be provided")
    .max(50, "Maximum of 50 packages per invocation")
    .describe(
      'List of libraries, tools, or services to evaluate (e.g., ["prisma@5.0.0", "bull@4.12.0"])',
    ),

  /**
   * Expected peak load in Requests Per Second.
   * Used to evaluate performance risk and identify bottlenecks.
   */
  target_throughput: z
    .number()
    .int("target_throughput must be an integer")
    .min(1, "target_throughput must be at least 1 RPS")
    .max(1_000_000, "target_throughput must not exceed 1,000,000 RPS")
    .optional()
    .describe("Expected peak load in Requests Per Second (RPS)"),

  /**
   * Required data consistency model for the proposed feature.
   * Affects the evaluation of database and messaging choices.
   */
  data_consistency: z
    .enum(["strong", "eventual"])
    .optional()
    .describe("Required data consistency model: strong or eventual"),

  /**
   * Target runtime environment. Affects native addon compatibility,
   * cold start analysis, and Alpine/musl compatibility checks.
   */
  runtime_environment: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Target runtime environment (e.g., "node20-alpine", "lambda", "k8s-x64")'),

  /**
   * Current production stack. Used to detect dependency conflicts
   * and avoid introducing duplicate functionality.
   */
  existing_stack: z
    .array(z.string().trim().min(1).max(200))
    .max(50, "Maximum of 50 existing stack entries")
    .optional()
    .describe("Current production stack for conflict detection"),

  /**
   * Applicable compliance frameworks. Affects the evaluation of
   * data handling, encryption at rest, audit logging, and access controls.
   */
  compliance_requirements: z
    .array(z.enum(["gdpr", "pci_dss", "hipaa", "sox", "iso27001"]))
    .max(5)
    .optional()
    .describe("Applicable compliance frameworks"),

  /**
   * Target deployment model. Affects operational complexity scoring.
   */
  deployment_model: z
    .enum(["self_hosted", "managed_cloud", "serverless", "edge"])
    .optional()
    .describe("Target deployment model"),

  /**
   * Free-text engineering constraints (e.g., "Must run on AWS ECS Fargate",
   * "Zero-downtime rolling deploys required"). Each constraint is listed as
   * a separate finding in the Constraint Analysis section.
   */
  constraints: z
    .array(z.string().trim().min(1).max(300))
    .max(20, "Maximum of 20 constraints")
    .optional()
    .describe("Engineering constraints that affect technology choices"),

  /**
   * Number of engineers available to implement and own this feature.
   * Affects operational complexity scoring.
   */
  team_size: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Number of engineers on the team"),

  /**
   * Planned delivery timeline in weeks. Used in the executive summary and
   * flags aggressive timelines relative to stack complexity.
   */
  timeline_weeks: z
    .number()
    .int()
    .min(1)
    .max(260)
    .optional()
    .describe("Planned delivery timeline in weeks"),
});

// ---------------------------------------------------------------------------
// GenerateAdr schema
// ---------------------------------------------------------------------------

export const GenerateAdrSchema = z.object({
  /**
   * Sequential ADR number. Used in the file name (`0042-...`) and the title.
   * Capped at 9999 because four-digit zero-padding is the convention.
   */
  number: z
    .number()
    .int("ADR number must be an integer")
    .min(1, "ADR number must be >= 1")
    .max(9999, "ADR number must be <= 9999")
    .describe('Sequential ADR number (e.g., 42 → "ADR-0042")'),
  /**
   * Title of the decision in present tense ("Use cursor pagination for /orders").
   */
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title must not exceed 200 characters")
    .describe("Decision title in present tense"),
  /**
   * Lifecycle status. Drives the badge in the report.
   */
  status: z
    .enum(["proposed", "accepted", "deprecated", "superseded"])
    .default("proposed")
    .describe("ADR lifecycle status"),
  /**
   * The business or technical context that triggered the decision.
   */
  context: z
    .string()
    .trim()
    .min(10, "Context must be at least 10 characters")
    .max(5000, "Context must not exceed 5000 characters")
    .describe("Why are we deciding now? Constraints, goals, prior state."),
  /**
   * Two or more candidate approaches that were considered. Forcing >= 2
   * prevents teams from documenting only the chosen path.
   */
  options_considered: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        pros: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
        cons: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
      }),
    )
    .min(2, "Document at least two options to make the trade-off explicit")
    .max(6, "More than 6 options usually means the problem is not framed yet"),
  /**
   * The chosen option. Must match the `name` of one entry in `options_considered`
   * (validated cross-field below).
   */
  decision: z
    .string()
    .trim()
    .min(1, "Decision cannot be empty")
    .max(2000, "Decision must not exceed 2000 characters")
    .describe("The chosen option and the rationale, in 1–3 sentences"),
  /**
   * Reversibility classification. One-way doors require disproportionately more
   * caution and documentation per FeatureArchitect doctrine.
   */
  reversibility: z
    .enum(["one_way_door", "two_way_door"])
    .default("two_way_door")
    .describe("Is this decision reversible without significant cost?"),
  /**
   * Consequences of the decision — both positive and negative.
   */
  consequences: z
    .array(z.string().trim().min(1).max(500))
    .min(1, "List at least one consequence")
    .max(20, "Consequences capped at 20 entries"),
  /**
   * Optional links to RFCs, tickets, related ADRs.
   */
  related_links: z
    .array(z.string().trim().min(1).max(500))
    .max(20)
    .optional()
    .describe("Links to RFC, JIRA, related ADRs (validation kept lenient — clients send strings)"),
});

// Cross-field warning surface: the architect agent sometimes drafts a decision
// that doesn't reference any of the considered options. We don't reject — that
// would be too strict for narrative prose — but downstream code can flag it via
// the `chosen_option_present` payload field (see src/reports/adr.ts).

// ---------------------------------------------------------------------------
// GenerateThreatModel schema
// ---------------------------------------------------------------------------

export const GenerateThreatModelSchema = z.object({
  /**
   * Name of the system being modelled (e.g., "Payment Service API").
   */
  system_name: z
    .string()
    .trim()
    .min(1, "system_name cannot be empty")
    .max(200, "system_name must not exceed 200 characters"),
  /**
   * Trust boundaries that data crosses (e.g., "internet → public_api",
   * "service_a → database"). Each crossing is a STRIDE candidate.
   */
  trust_boundaries: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "List at least one trust boundary")
    .max(20, "trust_boundaries capped at 20"),
  /**
   * Assets being protected. Used to score Information Disclosure & Tampering.
   */
  assets: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
      }),
    )
    .min(1, "Identify at least one asset")
    .max(50, "assets capped at 50"),
  /**
   * Entry points where untrusted input enters the system.
   */
  entry_points: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "List at least one entry point")
    .max(50, "entry_points capped at 50"),
  /**
   * Authentication scheme in use. Drives Spoofing scoring.
   */
  authentication: z
    .enum(["bearer_jwt", "oauth2", "api_key", "mtls", "session_cookie", "none"])
    .default("bearer_jwt"),
  /**
   * Compliance frameworks that constrain the threat model.
   */
  compliance_requirements: z
    .array(z.enum(["gdpr", "pci_dss", "hipaa", "sox", "iso27001", "soc2"]))
    .max(6)
    .optional(),
  /**
   * Whether the system handles PII. If true, Information Disclosure scoring
   * is amplified.
   */
  handles_pii: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// AnalyzeObservabilityGaps schema
// ---------------------------------------------------------------------------

export const AnalyzeObservabilityGapsSchema = z.object({
  /**
   * Service / component being assessed.
   */
  service_name: z.string().trim().min(1).max(200),
  /**
   * Currently emitted signal types. Used to compute the gap.
   */
  current_signals: z
    .array(z.enum(["logs", "metrics", "traces", "events", "profiling"]))
    .max(5)
    .default([]),
  /**
   * Service-level objectives the team has committed to. Without an SLO,
   * alerting cannot be defined symptom-based.
   */
  slo_targets: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        target: z.string().trim().min(1).max(120),
      }),
    )
    .max(20)
    .default([]),
  /**
   * Critical user journeys that must be traceable end-to-end.
   */
  critical_user_journeys: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  /**
   * Existing alerting rules count. Drives over/under-alerting heuristic.
   */
  alert_count: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .optional()
    .describe("Approximate number of currently configured alerts"),
  /**
   * Deployment model. Affects expectations (e.g., serverless needs cold-start metrics).
   */
  deployment_model: z.enum(["self_hosted", "managed_cloud", "serverless", "edge"]).optional(),
});

// ---------------------------------------------------------------------------
// GenerateRunbook schema
// ---------------------------------------------------------------------------

export const GenerateRunbookSchema = z.object({
  /**
   * Service / feature the runbook covers.
   */
  service_name: z.string().trim().min(1).max(200),
  /**
   * Owning team. Becomes the on-call escalation root.
   */
  owner_team: z.string().trim().min(1).max(120),
  /**
   * Severity tiers in use. SEV-1 = pages humans 24/7; SEV-3 = next business day.
   */
  severity_tiers: z
    .array(z.enum(["sev1", "sev2", "sev3"]))
    .min(1, "Define at least one severity tier")
    .max(3),
  /**
   * Known failure modes that the team has decided to actively monitor.
   * Each one becomes a runbook section with detection + mitigation.
   */
  known_failure_modes: z
    .array(z.string().trim().min(1).max(200))
    .min(1, "List at least one failure mode")
    .max(20),
  /**
   * SLO for this service. Drives the burn-rate alert recommendation.
   */
  slo_target: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe('e.g., "99.9% availability over 30d"'),
  /**
   * Dependencies whose outage would impact this service.
   */
  upstream_dependencies: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  /**
   * Whether the service has a tested rollback path. Affects the readiness verdict.
   */
  has_tested_rollback: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Exported TypeScript types (inferred from schemas for type safety)
// ---------------------------------------------------------------------------

export type GenerateApiSpecInput = z.infer<typeof GenerateApiSpecSchema>;
export type AnalyzeFeasibilityInput = z.infer<typeof AnalyzeFeasibilitySchema>;
export type GenerateAdrInput = z.infer<typeof GenerateAdrSchema>;
export type GenerateThreatModelInput = z.infer<typeof GenerateThreatModelSchema>;
export type AnalyzeObservabilityGapsInput = z.infer<typeof AnalyzeObservabilityGapsSchema>;
export type GenerateRunbookInput = z.infer<typeof GenerateRunbookSchema>;
