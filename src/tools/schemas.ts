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
});

// ---------------------------------------------------------------------------
// Exported TypeScript types (inferred from schemas for type safety)
// ---------------------------------------------------------------------------

export type GenerateApiSpecInput = z.infer<typeof GenerateApiSpecSchema>;
export type AnalyzeFeasibilityInput = z.infer<typeof AnalyzeFeasibilitySchema>;
