import type { AnalyzeFeasibilityInput } from "../tools/schemas.js";
import { renderReport, type RiskEntry, type Verdict } from "./template.js";

const SCHEMA_VERSION = "1.0.0";

export type Dimension =
  | "security"
  | "license"
  | "maintenance"
  | "performance"
  | "operational"
  | "cloud_lockin"
  | "backward_compat"
  | "dependency_conflict";

export interface DimensionScore {
  dimension: Dimension;
  label: string;
  score: number;
  notes: string[];
}

export interface PackageFinding {
  raw: string;
  name: string;
  version?: string;
  category: PackageCategory;
  notes: string[];
}

type PackageCategory =
  | "database"
  | "queue"
  | "cache"
  | "cloud_service"
  | "framework"
  | "auth"
  | "orm"
  | "test"
  | "other";

const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  security: 2,
  license: 2,
  maintenance: 1.5,
  performance: 1,
  operational: 1,
  cloud_lockin: 1,
  backward_compat: 1,
  dependency_conflict: 1,
};

/**
 * Heuristic feasibility analysis. Operates on the input payload alone — does
 * not call out to npm/CVE feeds (that work belongs to a separate enrichment
 * tool). The heuristics here flag *categories* of risk based on package names,
 * versions, throughput targets, runtime, and compliance requirements.
 */
export function generateFeasibilityReport(input: AnalyzeFeasibilityInput): string {
  const findings = input.proposed_stack.map(parsePackage);
  const scores = scoreAllDimensions(input, findings);
  const overall = weightedOverall(scores);
  const risks = collectRisks(input, findings, scores);
  const verdict = pickVerdict(scores, risks);

  const featureName = input.feature_name ?? `${findings.length} component(s)`;

  return renderReport({
    tool: "analyze_technical_feasibility",
    schemaVersion: SCHEMA_VERSION,
    title: `Technical Feasibility Report: ${featureName}`,
    context: {
      feature: input.feature_name,
      proposed_stack: findings.map((f) => f.raw).join(", "),
      team_size: input.team_size !== undefined ? `${input.team_size} engineers` : undefined,
      timeline: input.timeline_weeks !== undefined ? `${input.timeline_weeks} weeks` : undefined,
      target_throughput_rps: input.target_throughput,
      data_consistency: input.data_consistency,
      runtime_environment: input.runtime_environment,
      deployment_model: input.deployment_model,
      compliance_requirements: input.compliance_requirements?.join(", "),
      existing_stack_size: input.existing_stack?.length,
    },
    executiveSummary: buildExecutiveSummary(input, findings, overall, verdict, risks),
    verdict,
    findings: [
      { heading: "3.1 Risk Scorecard", body: buildScorecard(scores, overall) },
      { heading: "3.2 Per-Component Findings", body: buildPerPackageFindings(findings) },
      { heading: "3.3 Constraint Analysis", body: buildConstraintAnalysis(input, findings) },
      { heading: "3.4 Compliance Considerations", body: buildComplianceBlock(input) },
    ],
    risks,
    recommendations: buildRecommendations(input, findings, scores),
    nextSteps: buildNextSteps(input, scores),
    reEvaluateIn: "6 months, or immediately on any new High-severity CVE",
    payload: {
      overall_score: round(overall, 2),
      verdict,
      dimension_scores: scores.map((s) => ({
        dimension: s.dimension,
        score: s.score,
        notes: s.notes,
      })),
      packages: findings,
      blockers: risks.filter((r) => r.severity === "blocker").map((r) => r.id),
    },
  });
}

// ---------------------------------------------------------------------------
// Package parsing + categorisation
// ---------------------------------------------------------------------------

function parsePackage(raw: string): PackageFinding {
  const trimmed = raw.trim();
  // Match scoped (@scope/name@version) and unscoped (name@version)
  const m = trimmed.match(/^(@[^/]+\/[^@\s]+|[^@\s]+)(?:@(.+))?$/);
  const name = m?.[1] ?? trimmed;
  const version = m?.[2];
  return {
    raw: trimmed,
    name,
    version,
    category: categorise(name),
    notes: collectPackageNotes(name, version),
  };
}

function categorise(name: string): PackageCategory {
  const n = name.toLowerCase();
  if (/(prisma|sequelize|typeorm|mikro-orm|drizzle|knex)/.test(n)) return "orm";
  if (
    /(postgres|pg|mysql|mariadb|mongodb|mongo|redis|cassandra|dynamodb|sqlite|cockroach|scylla)/.test(
      n,
    )
  )
    return "database";
  if (/(bull|bullmq|kafkajs|rabbit|sqs|pubsub|nats|amqp|temporal)/.test(n)) return "queue";
  if (/(memcached|ioredis|lru-cache|cache-manager)/.test(n)) return "cache";
  if (/(aws-|@aws-sdk|azure|@azure|gcp|@google-cloud|firebase)/.test(n)) return "cloud_service";
  if (/(express|fastify|koa|hapi|nest|hono|next|nuxt|remix)/.test(n)) return "framework";
  if (/(passport|jose|jsonwebtoken|auth0|clerk|next-auth|oidc)/.test(n)) return "auth";
  if (/(jest|vitest|mocha|chai|supertest|playwright|cypress)/.test(n)) return "test";
  return "other";
}

function collectPackageNotes(name: string, version: string | undefined): string[] {
  const notes: string[] = [];
  const n = name.toLowerCase();

  if (!version) {
    notes.push(
      "Version not pinned — production dependencies should be pinned to an exact version.",
    );
  } else if (/^[\^~]/.test(version)) {
    notes.push(`Range specifier '${version}' — use exact version in production manifests.`);
  } else if (/^0\./.test(version)) {
    notes.push("Pre-1.0 release — expect breaking changes between minor versions.");
  }

  if (/^@aws-sdk\/|^aws-/.test(n)) {
    notes.push(
      "AWS SDK — couples this code path to AWS APIs. Wrap behind a port/adapter to keep migration optional.",
    );
  }
  if (/^@azure\//.test(n) || /^@google-cloud\//.test(n) || /^firebase/.test(n)) {
    notes.push("Cloud-vendor SDK — assess lock-in cost before depending on proprietary services.");
  }
  if (/(mongodb|mongoose)/.test(n)) {
    notes.push(
      "MongoDB stack — verify ACID requirements; multi-document transactions have known performance cliffs.",
    );
  }
  if (/(prisma)/.test(n)) {
    notes.push(
      "Prisma — generates a Rust binary; verify Alpine/musl and Lambda layer compatibility for the target runtime.",
    );
  }
  if (/(bullmq|bull)/.test(n)) {
    notes.push(
      "Redis-backed queue — add a Dead Letter Queue (DLQ) and an idempotent consumer pattern.",
    );
  }
  if (/(jsonwebtoken)/.test(n)) {
    notes.push(
      "Historical CVEs around `alg: none` — ensure algorithms are pinned and verified explicitly.",
    );
  }
  if (/^moment$/.test(n)) {
    notes.push(
      "`moment` is in maintenance-only mode — prefer `date-fns`, `dayjs`, or native `Intl`.",
    );
  }
  if (/^request$/.test(n)) {
    notes.push(
      "`request` is deprecated — replace with `undici`, `node-fetch`, or built-in `fetch`.",
    );
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Dimension scoring
// ---------------------------------------------------------------------------

function scoreAllDimensions(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
): DimensionScore[] {
  return [
    scoreSecurity(findings),
    scoreLicense(findings),
    scoreMaintenance(findings),
    scorePerformance(input, findings),
    scoreOperational(input, findings),
    scoreCloudLockin(findings),
    scoreBackwardCompat(findings),
    scoreDependencyConflict(input, findings),
  ];
}

function scoreSecurity(findings: PackageFinding[]): DimensionScore {
  let score = 1;
  const notes: string[] = [];
  for (const f of findings) {
    if (/^request$/.test(f.name)) {
      score = Math.max(score, 7);
      notes.push("`request` (deprecated) has unpatched CVEs in transitive deps.");
    }
    if (
      /jsonwebtoken/.test(f.name) &&
      (f.version === undefined || /^[~^]?[0-8]\./.test(f.version))
    ) {
      score = Math.max(score, 6);
      notes.push(
        "`jsonwebtoken` < 9.x — historical `alg: none` and key-confusion CVEs; upgrade to ≥ 9.0.0.",
      );
    }
    if (!f.version) {
      score = Math.max(score, 3);
    }
  }
  if (notes.length === 0)
    notes.push(
      "No heuristic security flags. Run `npm audit` and OSV scan for authoritative results.",
    );
  return { dimension: "security", label: "Security Risk", score, notes };
}

function scoreLicense(findings: PackageFinding[]): DimensionScore {
  let score = 0;
  const notes: string[] = [];
  // Heuristic: known SaaS-incompatible projects
  for (const f of findings) {
    if (/(mongodb|elasticsearch)$/.test(f.name)) {
      score = Math.max(score, 8);
      notes.push(
        `${f.name} core may be SSPL — verify the SDK/client license you depend on, not the server.`,
      );
    }
  }
  if (notes.length === 0)
    notes.push(
      "No license red flags from name heuristics. Run `license-checker` for the authoritative SBOM verdict.",
    );
  return { dimension: "license", label: "License Compatibility", score, notes };
}

function scoreMaintenance(findings: PackageFinding[]): DimensionScore {
  let score = 1;
  const notes: string[] = [];
  for (const f of findings) {
    if (/^moment$/.test(f.name) || /^request$/.test(f.name)) {
      score = Math.max(score, 8);
      notes.push(`${f.name} — maintenance-only / deprecated upstream.`);
    }
  }
  if (notes.length === 0)
    notes.push(
      "No maintenance red flags. Verify last-release date and bus factor for each package.",
    );
  return { dimension: "maintenance", label: "Maintenance & Sustainability", score, notes };
}

function scorePerformance(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
): DimensionScore {
  let score = 1;
  const notes: string[] = [];
  const rps = input.target_throughput ?? 0;

  if (rps >= 10_000) {
    score = Math.max(score, 5);
    notes.push(
      `Target ${rps.toLocaleString()} RPS — verify per-package benchmarks; request batching and connection pooling become critical.`,
    );
  }
  if (rps >= 50_000) {
    score = Math.max(score, 7);
    notes.push(
      "≥ 50k RPS — Node.js single-thread limits are likely; design for horizontal scale and consider native components for hot paths.",
    );
  }
  if (input.runtime_environment?.includes("lambda") || input.deployment_model === "serverless") {
    if (findings.some((f) => /(prisma|@prisma)/.test(f.name))) {
      score = Math.max(score, 6);
      notes.push(
        "Prisma in Lambda — cold start includes engine binary load (~200–500ms); use provisioned concurrency or a connection pooler.",
      );
    }
  }
  if (notes.length === 0)
    notes.push(
      "No performance flags from inputs. Always measure with `autocannon`/`k6` against your actual workload.",
    );
  return { dimension: "performance", label: "Performance Risk", score, notes };
}

function scoreOperational(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
): DimensionScore {
  let score = 2;
  const notes: string[] = [];
  const sidecarHeavy = findings.filter((f) =>
    /(kafkajs|rabbit|temporal|cassandra|elastic|mongodb)/.test(f.name),
  );
  if (sidecarHeavy.length > 0) {
    score = Math.max(score, 5 + Math.min(sidecarHeavy.length, 3));
    notes.push(
      `Components requiring dedicated infrastructure: ${sidecarHeavy.map((f) => f.name).join(", ")}. Each adds operational surface (deployment, monitoring, upgrades).`,
    );
  }
  if (input.deployment_model === "self_hosted") {
    score += 1;
    notes.push("Self-hosted deployment — you own backups, HA, patching, and capacity planning.");
  }
  if (notes.length === 0) notes.push("Operational footprint is minimal based on package set.");
  return {
    dimension: "operational",
    label: "Operational Complexity",
    score: Math.min(score, 10),
    notes,
  };
}

function scoreCloudLockin(findings: PackageFinding[]): DimensionScore {
  let score = 0;
  const notes: string[] = [];
  const vendorSdks = findings.filter((f) =>
    /(^@aws-sdk\/|^aws-|^@azure\/|^@google-cloud\/|^firebase)/.test(f.name),
  );
  if (vendorSdks.length > 0) {
    score = Math.min(2 + vendorSdks.length * 2, 9);
    notes.push(
      `Vendor SDKs in use: ${vendorSdks.map((f) => f.name).join(", ")}. Wrap each behind an internal port to keep migration optional.`,
    );
  }
  if (notes.length === 0) notes.push("No vendor SDKs detected.");
  return { dimension: "cloud_lockin", label: "Cloud Lock-in Risk", score, notes };
}

function scoreBackwardCompat(findings: PackageFinding[]): DimensionScore {
  let score = 1;
  const notes: string[] = [];
  const preReleases = findings.filter((f) => f.version && /^[~^]?0\./.test(f.version));
  if (preReleases.length > 0) {
    score = Math.max(score, 5);
    notes.push(
      `Pre-1.0 components: ${preReleases.map((f) => f.raw).join(", ")} — semver does not protect minor-version breakage.`,
    );
  }
  if (notes.length === 0) notes.push("No pre-1.0 dependencies detected.");
  return { dimension: "backward_compat", label: "Backward Compatibility Risk", score, notes };
}

function scoreDependencyConflict(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
): DimensionScore {
  let score = 0;
  const notes: string[] = [];
  if (input.existing_stack && input.existing_stack.length > 0) {
    const existingNames = new Set(
      input.existing_stack.map((s) => parsePackage(s).name.toLowerCase()),
    );
    const overlap = findings.filter((f) => existingNames.has(f.name.toLowerCase()));
    if (overlap.length > 0) {
      score = Math.max(score, 5);
      notes.push(
        `Already present in existing stack: ${overlap.map((f) => f.name).join(", ")}. Confirm versions align.`,
      );
    }
    // Detect duplicate functionality
    const cats = new Map<PackageCategory, number>();
    for (const f of findings) cats.set(f.category, (cats.get(f.category) ?? 0) + 1);
    const dupCats = [...cats].filter(([, n]) => n > 1).map(([c]) => c);
    if (dupCats.length > 0) {
      score = Math.max(score, 4);
      notes.push(
        `Duplicate categories within proposed stack: ${dupCats.join(", ")}. Consolidate to one per category.`,
      );
    }
  } else {
    notes.push(
      "`existing_stack` not provided — conflict analysis skipped. Provide it for higher-fidelity scoring.",
    );
  }
  if (notes.length === 0) notes.push("No conflicts detected.");
  return { dimension: "dependency_conflict", label: "Dependency Conflict Risk", score, notes };
}

// ---------------------------------------------------------------------------
// Aggregation, risk, verdict
// ---------------------------------------------------------------------------

function weightedOverall(scores: DimensionScore[]): number {
  let total = 0;
  let weightSum = 0;
  for (const s of scores) {
    const w = DIMENSION_WEIGHTS[s.dimension];
    total += s.score * w;
    weightSum += w;
  }
  return total / weightSum;
}

function collectRisks(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
  scores: DimensionScore[],
): RiskEntry[] {
  const risks: RiskEntry[] = [];
  for (const s of scores) {
    if (s.score >= 9) {
      risks.push({
        id: `${s.dimension.toUpperCase()}-BLOCKER`,
        severity: "blocker",
        description: `${s.label} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: "Resolve before proceeding — find an alternative or upgrade.",
      });
    } else if (s.score >= 7) {
      risks.push({
        id: `${s.dimension.toUpperCase()}-HIGH`,
        severity: "high",
        description: `${s.label} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: "Architectural review required before integration.",
      });
    } else if (s.score >= 4) {
      risks.push({
        id: `${s.dimension.toUpperCase()}-MED`,
        severity: "medium",
        description: `${s.label} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: "Document mitigation in the implementation plan.",
      });
    }
  }

  // Compliance × stack composition
  if (
    input.compliance_requirements?.includes("pci_dss") &&
    findings.some((f) => f.category === "database")
  ) {
    risks.push({
      id: "COMPLIANCE-PCI-PII",
      severity: "high",
      description:
        "PCI-DSS scope includes the database stack. Cardholder data fields must be tokenised, never stored at rest.",
      mitigation:
        "Use a dedicated tokenisation vault; isolate PCI scope behind a service boundary.",
    });
  }

  // Strong consistency × eventual-consistency stores
  if (
    input.data_consistency === "strong" &&
    findings.some((f) => /(dynamodb|mongo|cassandra|scylla)/.test(f.name))
  ) {
    risks.push({
      id: "CONSISTENCY-MISMATCH",
      severity: "high",
      description:
        "Strong consistency required, but a primarily eventual-consistency store is in the proposed stack.",
      mitigation:
        "Verify the store's strong-consistency mode (e.g., DynamoDB ConsistentRead=true) covers all required reads, or pick a different store.",
    });
  }

  return risks;
}

function pickVerdict(scores: DimensionScore[], risks: RiskEntry[]): Verdict {
  if (risks.some((r) => r.severity === "blocker")) return "reject";
  if (scores.some((s) => s.score >= 7)) return "approve_with_conditions";
  if (scores.some((s) => s.score >= 4)) return "approve_with_conditions";
  return "approve";
}

function buildExecutiveSummary(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
  overall: number,
  verdict: Verdict,
  risks: RiskEntry[],
): string {
  const subject = input.feature_name
    ? `**${input.feature_name}** (${findings.length} component(s))`
    : `The proposed stack of **${findings.length} component(s)**`;

  const verdictText = {
    approve: "is **approved** for implementation",
    approve_with_conditions:
      "is **approved with conditions** — the documented risks must be mitigated before rollout",
    reject: "is **rejected** until the listed blockers are resolved",
    needs_review: "**requires further review**",
  }[verdict];

  const blockers = risks.filter((r) => r.severity === "blocker");
  const highs = risks.filter((r) => r.severity === "high");
  const timeline = input.timeline_weeks ? ` (${input.timeline_weeks}-week timeline, ${input.team_size ?? "?"} engineers)` : "";

  const riskSentence =
    blockers.length > 0
      ? `**${blockers.length} blocker(s)** must be resolved before rollout: ${blockers.map((r) => `\`${r.id}\``).join(", ")}.`
      : highs.length > 0
        ? `No blockers, but **${highs.length} high-severity risk(s)** require explicit owner and mitigation plan.`
        : risks.length === 0
          ? "No risks crossed the medium threshold — proceed with standard engineering diligence."
          : `${risks.length} medium-severity risk(s) identified — see Risk Register for mitigation.`;

  return [
    `${subject}${timeline} ${verdictText}.`,
    `The weighted overall risk score is **${round(overall, 2)}/10** across 8 dimensions (security and license weighted ×2; maintenance ×1.5).`,
    riskSentence,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

function buildScorecard(scores: DimensionScore[], overall: number): string {
  const rows = scores.map((s) => `| ${s.label} | ${s.score}/10 | ${severityBadge(s.score)} |`);
  return [
    "| Dimension | Score | Severity |",
    "|---|---|---|",
    ...rows,
    `| **Overall (weighted)** | **${round(overall, 2)}/10** | **${severityBadge(overall)}** |`,
    "",
    "_Weights: Security ×2, License ×2, Maintenance ×1.5, others ×1._",
  ].join("\n");
}

function buildPerPackageFindings(findings: PackageFinding[]): string {
  const withNotes = findings.filter((f) => f.notes.length > 0);
  const clean = findings.filter((f) => f.notes.length === 0);

  const flaggedRows = withNotes.map((f) => {
    const noteLines = f.notes.map((n) => `- ${n}`).join("\n");
    return `#### \`${f.raw}\` _(${f.category})_\n\n${noteLines}`;
  });

  const cleanRows =
    clean.length === 0
      ? []
      : [
          `#### ✅ No issues detected`,
          clean.map((f) => `- \`${f.raw}\` _(${f.category})_`).join("\n"),
        ];

  return [...flaggedRows, ...cleanRows].join("\n\n");
}

function buildConstraintAnalysis(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
): string {
  const lines: string[] = [];

  if (input.constraints && input.constraints.length > 0) {
    lines.push("**Engineering constraints declared by the team:**");
    for (const c of input.constraints) lines.push(`- ${c}`);
    lines.push("");
  }

  if (input.target_throughput) {
    lines.push(`**Throughput target:** ${input.target_throughput.toLocaleString()} RPS.`);
    if (input.target_throughput >= 10_000) {
      lines.push(
        "- Plan capacity for 2× peak; identify the first bottleneck (DB connections, event loop, network egress).",
      );
    }
  }
  if (input.data_consistency) {
    lines.push(`**Consistency model:** ${input.data_consistency}.`);
    if (input.data_consistency === "strong" && findings.some((f) => f.category === "database")) {
      lines.push(
        "- Confirm the chosen database supports the required isolation level (READ COMMITTED → SERIALIZABLE) without unacceptable contention.",
      );
    }
  }
  if (input.runtime_environment) {
    lines.push(`**Runtime:** ${input.runtime_environment}.`);
    if (input.runtime_environment.includes("alpine")) {
      lines.push(
        "- Alpine uses musl, not glibc — verify every native addon publishes a musl-compatible prebuilt.",
      );
    }
    if (input.runtime_environment.includes("lambda")) {
      lines.push(
        "- Lambda — measure cold start; the 250 MB unzipped layer limit constrains native dependencies.",
      );
    }
  }
  if (input.deployment_model) {
    lines.push(`**Deployment model:** ${input.deployment_model}.`);
  }

  return lines.length === 0 ? "_No constraints provided._" : lines.join("\n");
}

function buildComplianceBlock(input: AnalyzeFeasibilityInput): string {
  if (!input.compliance_requirements || input.compliance_requirements.length === 0) {
    return "_No compliance frameworks declared._";
  }
  const guidance: Record<string, string> = {
    gdpr: "**GDPR** — implement right-to-erasure and data minimisation. Audit every PII field for purpose limitation.",
    pci_dss:
      "**PCI-DSS** — tokenise cardholder data at the boundary. Never store PAN/CVV in application databases.",
    hipaa: "**HIPAA** — encrypt PHI at rest and in transit; maintain access logs for ≥ 6 years.",
    sox: "**SOX** — segregation of duties between dev and prod; all production changes go through review.",
    iso27001:
      "**ISO 27001** — formal risk register, asset inventory, and incident-response plan required.",
  };
  return input.compliance_requirements.map((c) => `- ${guidance[c] ?? c}`).join("\n");
}

function buildRecommendations(
  input: AnalyzeFeasibilityInput,
  findings: PackageFinding[],
  scores: DimensionScore[],
): string[] {
  const recs: string[] = [];
  const security = scores.find((s) => s.dimension === "security");
  if (security && security.score >= 4) {
    recs.push(
      "Run an SBOM scan (`npm audit --omit=dev`, `osv-scanner`) and gate the CI pipeline on critical CVEs.",
    );
  }
  if (scores.find((s) => s.dimension === "cloud_lockin" && s.score >= 5)) {
    recs.push(
      "Wrap each cloud SDK behind an internal port/adapter so future migration is an implementation swap, not a refactor.",
    );
  }
  if (findings.some((f) => !f.version)) {
    recs.push(
      "Pin every production dependency to an exact version; rely on Dependabot/Renovate for managed bumps.",
    );
  }
  if (input.deployment_model === "serverless") {
    recs.push(
      "Track cold-start latency as a first-class SLO — it is the dominant tail-latency contributor in serverless.",
    );
  }
  recs.push(
    "Capture all decisions above in an Architecture Decision Record (ADR) before implementation begins.",
  );
  return recs;
}

function buildNextSteps(input: AnalyzeFeasibilityInput, scores: DimensionScore[]) {
  const steps = [
    { step: "Open ADRs for each medium/high-severity dimension" },
    { step: "Schedule a security review for any score ≥ 7" },
    { step: "Add CVE & license scanning to CI (`osv-scanner`, `license-checker`)" },
    { step: "Run a load test at 2× target RPS and record the first saturating resource" },
  ];
  if (input.compliance_requirements?.length) {
    steps.push({
      step: "Confirm compliance evidence is collectable (audit trails, encryption posture)",
    });
  }
  if (scores.some((s) => s.dimension === "performance" && s.score >= 5)) {
    steps.push({ step: "Benchmark the hot path with `autocannon` or `k6`; record p50/p95/p99" });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityBadge(score: number): string {
  if (score >= 9) return "🚫 Blocker";
  if (score >= 7) return "🔴 High";
  if (score >= 4) return "🟡 Medium";
  return "🟢 Low";
}

function round(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}
