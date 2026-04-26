import type { GenerateThreatModelInput } from "../tools/schemas.js";
import { renderReport, type RiskEntry, type Verdict } from "./template.js";

const SCHEMA_VERSION = "1.0.0";

const STRIDE = [
  "spoofing",
  "tampering",
  "repudiation",
  "info_disclosure",
  "dos",
  "elevation",
] as const;
type StrideCategory = (typeof STRIDE)[number];

const STRIDE_LABEL: Record<StrideCategory, string> = {
  spoofing: "Spoofing (Authentication)",
  tampering: "Tampering (Integrity)",
  repudiation: "Repudiation (Audit)",
  info_disclosure: "Information Disclosure (Confidentiality)",
  dos: "Denial of Service (Availability)",
  elevation: "Elevation of Privilege (Authorization)",
};

interface StrideScore {
  category: StrideCategory;
  score: number;
  notes: string[];
  recommended_controls: string[];
}

/**
 * Produces a STRIDE-based threat model. Heuristics only — no live external
 * data. The report's purpose is to **force the conversation** by enumerating
 * the six STRIDE categories and asking concrete questions per category.
 */
export function generateThreatModel(input: GenerateThreatModelInput): string {
  const scores = STRIDE.map((cat) => scoreCategory(cat, input));
  const overall = scores.reduce((s, c) => s + c.score, 0) / scores.length;
  const risks = collectRisks(input, scores);
  const verdict = pickVerdict(risks);

  return renderReport({
    tool: "generate_threat_model",
    schemaVersion: SCHEMA_VERSION,
    title: `Threat Model: ${input.system_name}`,
    context: {
      system_name: input.system_name,
      authentication: input.authentication,
      handles_pii: input.handles_pii ? "yes" : "no",
      trust_boundaries: input.trust_boundaries.length,
      assets: input.assets.length,
      entry_points: input.entry_points.length,
      compliance_requirements: input.compliance_requirements?.join(", "),
    },
    executiveSummary: buildExecutiveSummary(input, overall, verdict, risks.length),
    verdict,
    findings: [
      { heading: "3.1 STRIDE Scorecard", body: buildScorecard(scores, overall) },
      { heading: "3.2 Trust Boundaries & Entry Points", body: buildBoundariesBlock(input) },
      { heading: "3.3 Assets to Protect", body: buildAssetsBlock(input) },
      { heading: "3.4 Per-Category Findings", body: buildPerCategoryFindings(scores) },
    ],
    risks,
    recommendations: buildRecommendations(input, scores),
    nextSteps: [
      { step: "Walk through each STRIDE finding with the security reviewer" },
      { step: "Open one ticket per recommended control with severity matching the score" },
      { step: "Add abuse-case tests to the test suite for the top 3 risks" },
      { step: "Schedule a re-threat-model 6 months from now or after major architecture change" },
    ],
    reEvaluateIn: "6 months, or when authentication / data classification changes",
    payload: {
      overall_score: round(overall, 2),
      stride_scores: scores.map((s) => ({
        category: s.category,
        score: s.score,
        notes: s.notes,
        recommended_controls: s.recommended_controls,
      })),
      blockers: risks.filter((r) => r.severity === "blocker").map((r) => r.id),
    },
  });
}

// ---------------------------------------------------------------------------
// STRIDE scoring
// ---------------------------------------------------------------------------

function scoreCategory(category: StrideCategory, input: GenerateThreatModelInput): StrideScore {
  switch (category) {
    case "spoofing":
      return scoreSpoofing(input);
    case "tampering":
      return scoreTampering(input);
    case "repudiation":
      return scoreRepudiation(input);
    case "info_disclosure":
      return scoreInfoDisclosure(input);
    case "dos":
      return scoreDos(input);
    case "elevation":
      return scoreElevation(input);
  }
}

function scoreSpoofing(input: GenerateThreatModelInput): StrideScore {
  let score = 2;
  const notes: string[] = [];
  const controls: string[] = [];
  if (input.authentication === "none") {
    score = 9;
    notes.push("No authentication scheme declared — every entry point is spoofable.");
    controls.push("Add at least bearer JWT or API key auth before any production exposure.");
  } else if (input.authentication === "api_key") {
    score = 5;
    notes.push("API keys are static and cannot be revoked granularly without rotation.");
    controls.push("Hash API keys at rest (SHA-256), rotate every 90 days, log usage per key.");
  } else if (input.authentication === "bearer_jwt") {
    score = 3;
    controls.push("Validate iss, aud, exp, nbf; reject alg=none explicitly; rotate signing keys.");
  } else if (input.authentication === "mtls") {
    score = 2;
    controls.push("Maintain a CRL / OCSP responder; rotate intermediate CAs annually.");
  } else if (input.authentication === "oauth2") {
    score = 3;
    controls.push("Use PKCE for any human-flow client; short-lived access tokens (≤ 10 min).");
  } else if (input.authentication === "session_cookie") {
    score = 4;
    notes.push(
      "Session cookies require strict SameSite + HttpOnly + Secure or they're spoofable via CSRF/XSS.",
    );
    controls.push("Set SameSite=Strict, HttpOnly, Secure; rotate session ID on auth events.");
  }
  if (input.entry_points.length > 5 && input.authentication !== "mtls") {
    score = Math.min(10, score + 1);
    notes.push(`${input.entry_points.length} entry points — surface area amplifies spoofing risk.`);
  }
  if (notes.length === 0) notes.push("Authentication scheme appears appropriate.");
  return { category: "spoofing", score, notes, recommended_controls: controls };
}

function scoreTampering(input: GenerateThreatModelInput): StrideScore {
  let score = 2;
  const notes: string[] = [];
  const controls: string[] = [
    "Enforce TLS 1.2+ on every transport.",
    "Sign and version every persisted record.",
  ];
  const restricted = input.assets.filter((a) => a.sensitivity === "restricted").length;
  if (restricted > 0) {
    score = 5;
    notes.push(`${restricted} restricted asset(s) — tampering would be high-impact.`);
    controls.push("Add row-level checksums or HMAC-signed payloads for restricted assets.");
  }
  if (input.trust_boundaries.length > 3) {
    score = Math.min(10, score + 1);
    notes.push(
      `${input.trust_boundaries.length} trust boundaries — every crossing is a tampering opportunity.`,
    );
  }
  if (notes.length === 0) notes.push("Tampering surface is contained.");
  return { category: "tampering", score, notes, recommended_controls: controls };
}

function scoreRepudiation(input: GenerateThreatModelInput): StrideScore {
  let score = 4;
  const notes: string[] = ["Without immutable audit logs, users can deny actions they performed."];
  const controls = [
    "Log every state-changing action with: actor (hashed), action, target, timestamp, request_id.",
    "Ship audit logs to an append-only store (e.g., AWS QLDB, immutable S3 bucket with object lock).",
  ];
  if (
    input.compliance_requirements?.includes("sox") ||
    input.compliance_requirements?.includes("hipaa")
  ) {
    score = 7;
    notes.push("Compliance regime mandates non-repudiation — audit gaps are a regulatory finding.");
    controls.push("Retain audit logs for the regime's required period (SOX: 7y, HIPAA: 6y).");
  }
  return { category: "repudiation", score, notes, recommended_controls: controls };
}

function scoreInfoDisclosure(input: GenerateThreatModelInput): StrideScore {
  let score = 3;
  const notes: string[] = [];
  const controls = ["Encrypt sensitive fields at rest (envelope encryption with KMS)."];
  if (input.handles_pii) {
    score = 7;
    notes.push("System handles PII — disclosure is both a security and a regulatory event.");
    controls.push("Implement log scrubbing for PII fields (emails, names, IDs).");
    controls.push("Enforce least-privilege on all read paths; deny by default.");
  }
  if (input.compliance_requirements?.includes("gdpr")) {
    score = Math.max(score, 7);
    controls.push("Implement right-to-erasure flow with audit trail.");
  }
  if (input.compliance_requirements?.includes("pci_dss")) {
    score = Math.max(score, 8);
    controls.push("Tokenise PAN/CVV at the boundary — never store plaintext.");
  }
  if (notes.length === 0) notes.push("Information disclosure surface is bounded.");
  return { category: "info_disclosure", score, notes, recommended_controls: controls };
}

function scoreDos(input: GenerateThreatModelInput): StrideScore {
  let score = 3;
  const notes: string[] = [];
  const controls = [
    "Enforce per-user/per-IP rate limits at the edge.",
    "Set request body size limits (e.g., 1 MB default).",
    "Add timeouts (connect + read separately) on every outbound call.",
  ];
  if (input.entry_points.length >= 5) {
    score = 5;
    notes.push("Multiple entry points — coordinate rate-limit budgets to avoid amplification.");
  }
  if (input.authentication === "none") {
    score = Math.max(score, 7);
    notes.push(
      "Unauthenticated endpoints have no per-caller budget — botnets can saturate trivially.",
    );
    controls.push(
      "Require at least an API key for write paths; reserve unauthenticated reads for static, cacheable content only.",
    );
  }
  if (notes.length === 0) notes.push("DoS resilience appears reasonable.");
  return { category: "dos", score, notes, recommended_controls: controls };
}

function scoreElevation(input: GenerateThreatModelInput): StrideScore {
  let score = 3;
  const notes: string[] = [];
  const controls = [
    "Validate authorization at the resource level (per-record), not just at the route.",
    "Adopt deny-by-default RBAC/ABAC; default routes return 403 unless explicitly allowed.",
  ];
  const restricted = input.assets.filter((a) => a.sensitivity === "restricted").length;
  if (restricted > 0) {
    score = 6;
    notes.push("Restricted assets — IDOR or privilege bugs would be high-impact.");
    controls.push(
      "Add property-based tests asserting that user A cannot read/write user B's restricted resources.",
    );
  }
  if (input.trust_boundaries.length > 3) {
    score = Math.min(10, score + 1);
    notes.push("Many trust boundaries — confused-deputy risk increases at each crossing.");
  }
  if (notes.length === 0) notes.push("Elevation surface is bounded.");
  return { category: "elevation", score, notes, recommended_controls: controls };
}

// ---------------------------------------------------------------------------
// Risk + verdict + sections
// ---------------------------------------------------------------------------

function collectRisks(input: GenerateThreatModelInput, scores: StrideScore[]): RiskEntry[] {
  const risks: RiskEntry[] = [];
  for (const s of scores) {
    if (s.score >= 9) {
      risks.push({
        id: `STRIDE-${s.category.toUpperCase()}-BLOCKER`,
        severity: "blocker",
        description: `${STRIDE_LABEL[s.category]} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: s.recommended_controls.join(" "),
      });
    } else if (s.score >= 7) {
      risks.push({
        id: `STRIDE-${s.category.toUpperCase()}-HIGH`,
        severity: "high",
        description: `${STRIDE_LABEL[s.category]} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: s.recommended_controls.join(" "),
      });
    } else if (s.score >= 4) {
      risks.push({
        id: `STRIDE-${s.category.toUpperCase()}-MED`,
        severity: "medium",
        description: `${STRIDE_LABEL[s.category]} scored ${s.score}/10. ${s.notes.join(" ")}`,
        mitigation: s.recommended_controls.join(" "),
      });
    }
  }
  if (input.handles_pii && !input.compliance_requirements?.length) {
    risks.push({
      id: "PII-NO-COMPLIANCE-DECLARED",
      severity: "high",
      description:
        "System handles PII but no compliance framework is declared — regulatory exposure undefined.",
      mitigation: "Declare applicable frameworks (gdpr/hipaa/etc) and re-run the threat model.",
    });
  }
  return risks;
}

function pickVerdict(risks: RiskEntry[]): Verdict {
  if (risks.some((r) => r.severity === "blocker")) return "reject";
  if (risks.some((r) => r.severity === "high")) return "approve_with_conditions";
  if (risks.some((r) => r.severity === "medium")) return "approve_with_conditions";
  return "approve";
}

function buildExecutiveSummary(
  input: GenerateThreatModelInput,
  overall: number,
  verdict: Verdict,
  riskCount: number,
): string {
  const verdictText = {
    approve: "passes initial threat review",
    approve_with_conditions: "passes with conditions — implement listed controls before exposure",
    reject: "**fails** initial threat review until blockers are resolved",
    needs_review: "requires manual security review",
  }[verdict];
  return [
    `Threat model for **${input.system_name}** ${verdictText}.`,
    `STRIDE average score is **${round(overall, 2)}/10** across 6 categories.`,
    riskCount === 0
      ? "No risks crossed the medium threshold."
      : `${riskCount} risk(s) require explicit owner and mitigation — see the Risk Register.`,
  ].join(" ");
}

function buildScorecard(scores: StrideScore[], overall: number): string {
  const rows = scores.map(
    (s) => `| ${STRIDE_LABEL[s.category]} | ${s.score}/10 | ${severityBadge(s.score)} |`,
  );
  return [
    "| STRIDE Category | Score | Severity |",
    "|---|---|---|",
    ...rows,
    `| **Average** | **${round(overall, 2)}/10** | **${severityBadge(overall)}** |`,
  ].join("\n");
}

function buildBoundariesBlock(input: GenerateThreatModelInput): string {
  const boundaries = input.trust_boundaries.map((b, i) => `${i + 1}. \`${escape(b)}\``).join("\n");
  const entries = input.entry_points.map((e, i) => `${i + 1}. \`${escape(e)}\``).join("\n");
  return [
    "**Trust Boundaries** _(every crossing is a STRIDE candidate)_",
    "",
    boundaries,
    "",
    "**Entry Points** _(where untrusted input enters)_",
    "",
    entries,
  ].join("\n");
}

function buildAssetsBlock(input: GenerateThreatModelInput): string {
  const rows = input.assets.map(
    (a) => `| \`${escape(a.name)}\` | ${a.sensitivity} | ${sensitivityBadge(a.sensitivity)} |`,
  );
  return ["| Asset | Sensitivity | Handling |", "|---|---|---|", ...rows].join("\n");
}

function buildPerCategoryFindings(scores: StrideScore[]): string {
  return scores
    .map((s) => {
      const notes = s.notes.map((n) => `- ${n}`).join("\n");
      const controls = s.recommended_controls.length
        ? "**Recommended controls:**\n" + s.recommended_controls.map((c) => `  - ${c}`).join("\n")
        : "_No additional controls required._";
      return `#### ${STRIDE_LABEL[s.category]} — ${s.score}/10\n\n${notes}\n\n${controls}`;
    })
    .join("\n\n");
}

function buildRecommendations(input: GenerateThreatModelInput, scores: StrideScore[]): string[] {
  const recs: string[] = [];
  const top = [...scores].sort((a, b) => b.score - a.score)[0];
  if (top && top.score >= 7) {
    recs.push(
      `Address **${STRIDE_LABEL[top.category]}** first — it scored ${top.score}/10 and is the dominant risk.`,
    );
  }
  if (input.handles_pii) {
    recs.push(
      "Adopt a Data Protection Impact Assessment (DPIA) template; re-run quarterly while PII handling exists.",
    );
  }
  if (input.authentication === "api_key") {
    recs.push(
      "Plan migration from API keys to OAuth2 client credentials or mTLS within the next two quarters.",
    );
  }
  recs.push("Add the 3 highest-scoring categories to your security regression test suite.");
  return recs;
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

function sensitivityBadge(s: string): string {
  switch (s) {
    case "restricted":
      return "🔴 Encrypt + audit + least privilege";
    case "confidential":
      return "🟡 Encrypt + access controls";
    case "internal":
      return "🟢 Standard access controls";
    case "public":
      return "⚪ No restrictions";
    default:
      return s;
  }
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function round(n: number, d: number): number {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}
