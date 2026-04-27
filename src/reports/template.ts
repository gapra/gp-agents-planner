/**
 * Report Template Engine
 *
 * Provides a consistent, deterministic output structure for every report
 * produced by an MCP tool. All reports share the same skeleton:
 *
 *   1. Header        — title, generation timestamp, tool name, schema version
 *   2. Context       — inputs summarised for traceability
 *   3. Executive     — 2–3 sentence summary, with overall verdict
 *   4. Findings      — body sections, ordered, each with H3 heading
 *   5. Risks         — explicit risk register (table)
 *   6. Recommendations — numbered, actionable items
 *   7. Next Steps    — ordered checklist
 *   8. Footer        — re-evaluation cadence + machine-readable JSON envelope
 *
 * Why a template engine instead of ad-hoc string concatenation:
 * - Every tool produces the same shape, so LLM consumers and human reviewers
 *   can scan reports identically.
 * - The trailing JSON envelope lets downstream tooling (planners, CI gates)
 *   parse the verdict without re-reading the markdown body.
 * - Centralising layout means a future change (e.g., adding ADR links)
 *   touches one place.
 */

export type Verdict = "approve" | "approve_with_conditions" | "reject" | "needs_review";

export interface ReportSection {
  heading: string;
  body: string;
}

export interface RiskEntry {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "blocker";
  mitigation: string;
}

export interface NextStep {
  step: string;
  owner?: string;
  due?: string;
}

export interface ReportEnvelope {
  tool: string;
  schema_version: string;
  generated_at: string;
  verdict: Verdict;
  blockers: string[];
  /** Free-form structured payload specific to the tool. */
  payload: Record<string, unknown>;
}

export interface ReportInput {
  /** Tool name (e.g., "generate_enterprise_api_spec"). */
  tool: string;
  /** Stable identifier for this report's schema, bumped on breaking changes. */
  schemaVersion: string;
  /** Top-level title (e.g., "Enterprise API Specification: Payment Service API"). */
  title: string;
  /** Map of input field → human-readable value, for the Context section. */
  context: Record<string, string | number | undefined>;
  /** 2–3 sentence summary. The first sentence MUST state the verdict. */
  executiveSummary: string;
  /** Final verdict, also placed in the trailing JSON envelope. */
  verdict: Verdict;
  /** Body sections. Order is preserved. */
  findings: ReportSection[];
  /** Risk register. Empty array → renders "None identified." */
  risks: RiskEntry[];
  /** Numbered, actionable recommendations. */
  recommendations: string[];
  /** Ordered next-step checklist. */
  nextSteps: NextStep[];
  /** When this report should be re-evaluated (e.g., "6 months", "before next release"). */
  reEvaluateIn: string;
  /** Tool-specific structured payload appended to the JSON envelope. */
  payload: Record<string, unknown>;
}

const SEVERITY_BADGE: Record<RiskEntry["severity"], string> = {
  low: "🟢 Low",
  medium: "🟡 Medium",
  high: "🔴 High",
  blocker: "🚫 Blocker",
};

const VERDICT_BADGE: Record<Verdict, string> = {
  approve: "✅ Approve",
  approve_with_conditions: "🟡 Approve with conditions",
  reject: "🚫 Reject",
  needs_review: "🔍 Needs review",
};

/**
 * Render a report into the canonical layout. Pure function, no I/O.
 */
export function renderReport(input: ReportInput): string {
  const generatedAt = new Date().toISOString();

  const blockers = input.risks.filter((r) => r.severity === "blocker").map((r) => r.id);
  const envelope: ReportEnvelope = {
    tool: input.tool,
    schema_version: input.schemaVersion,
    generated_at: generatedAt,
    verdict: input.verdict,
    blockers,
    payload: input.payload,
  };

  const contextRows = Object.entries(input.context)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `| ${humanize(k)} | ${String(v)} |`)
    .join("\n");

  const findingsBody = input.findings
    .map((s) => `### ${s.heading}\n\n${s.body.trim()}`)
    .join("\n\n");

  const riskRows =
    input.risks.length === 0
      ? "_None identified._"
      : [
          "| ID | Severity | Description | Mitigation |",
          "|---|---|---|---|",
          ...input.risks.map(
            (r) =>
              `| \`${r.id}\` | ${SEVERITY_BADGE[r.severity]} | ${escapeCell(r.description)} | ${escapeCell(r.mitigation)} |`,
          ),
        ].join("\n");

  const recsBody =
    input.recommendations.length === 0
      ? "_No additional recommendations._"
      : input.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const stepsBody =
    input.nextSteps.length === 0
      ? "_No follow-up actions required._"
      : input.nextSteps
          .map((s, i) => {
            const owner = s.owner ? ` _(owner: ${s.owner})_` : "";
            const due = s.due ? ` _(due: ${s.due})_` : "";
            return `${i + 1}. [ ] ${s.step}${owner}${due}`;
          })
          .join("\n");

  return [
    `# ${input.title}`,
    "",
    `> **Tool:** \`${input.tool}\` · **Schema:** \`v${input.schemaVersion}\` · **Generated:** \`${generatedAt}\` · **Verdict:** ${VERDICT_BADGE[input.verdict]}`,
    "",
    "---",
    "",
    "## 1. Context",
    "",
    contextRows ? `| Field | Value |\n|---|---|\n${contextRows}` : "_No context provided._",
    "",
    "## 2. Executive Summary",
    "",
    input.executiveSummary.trim(),
    "",
    "## 3. Findings",
    "",
    findingsBody || "_No findings._",
    "",
    "## 4. Risk Register",
    "",
    riskRows,
    "",
    "## 5. Recommendations",
    "",
    recsBody,
    "",
    "## 6. Next Steps",
    "",
    stepsBody,
    "",
    "## 7. Re-evaluation",
    "",
    `Re-evaluate this report in **${input.reEvaluateIn}**, or sooner if any risk above changes severity.`,
    "",
    "---",
    "",
    "<!-- machine-readable envelope: downstream tooling parses this block -->",
    "```json",
    JSON.stringify(envelope, null, 2),
    "```",
    "",
  ].join("\n");
}

const ABBREVIATIONS = new Set(["adr", "api", "slo", "sli", "id", "rps", "url", "jwt", "pci"]);

/** "adr_id" → "ADR ID", "slo_targets" → "SLO Targets", "target_throughput" → "Target Throughput" */
function humanize(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => (ABBREVIATIONS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Pipe and newline characters break markdown tables; replace them. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
