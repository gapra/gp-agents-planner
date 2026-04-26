import type { GenerateAdrInput } from "../tools/schemas.js";
import { renderReport, type RiskEntry, type Verdict } from "./template.js";

const SCHEMA_VERSION = "1.0.0";

/**
 * Generate an Architecture Decision Record wrapped in the canonical template.
 * The ADR itself is the primary artefact (Findings 3.1); the template adds
 * the standard risk register, recommendations, and machine-readable envelope
 * so downstream tooling can parse the verdict (e.g., ADR pre-merge check).
 */
export function generateAdr(input: GenerateAdrInput): string {
  const adrId = `ADR-${String(input.number).padStart(4, "0")}`;
  const slug = slugify(input.title);
  const filename = `${String(input.number).padStart(4, "0")}-${slug}.md`;

  const optionNames = new Set(input.options_considered.map((o) => o.name.toLowerCase()));
  const decisionMentionsOption = [...optionNames].some((name) =>
    input.decision.toLowerCase().includes(name),
  );

  const risks = collectRisks(input, decisionMentionsOption);
  const verdict = pickVerdict(input, risks, decisionMentionsOption);

  const adrBody = buildAdrMarkdown(input, adrId);

  return renderReport({
    tool: "generate_adr",
    schemaVersion: SCHEMA_VERSION,
    title: `${adrId}: ${input.title}`,
    context: {
      adr_id: adrId,
      status: input.status,
      reversibility: input.reversibility,
      options_considered: input.options_considered.length,
      consequences_listed: input.consequences.length,
      suggested_filename: `docs/adr/${filename}`,
    },
    executiveSummary: buildExecutiveSummary(input, verdict, decisionMentionsOption),
    verdict,
    findings: [
      {
        heading: "3.1 ADR Markdown (commit this file)",
        body: ["```markdown", adrBody, "```"].join("\n"),
      },
      { heading: "3.2 Options Comparison", body: buildOptionsTable(input) },
      { heading: "3.3 Quality Checklist", body: buildChecklist(input, decisionMentionsOption) },
    ],
    risks,
    recommendations: buildRecommendations(input, decisionMentionsOption),
    nextSteps: [
      { step: `Save the ADR markdown as \`docs/adr/${filename}\`` },
      { step: "Open a PR and request review from the architecture council" },
      { step: "Link this ADR from the implementing JIRA ticket / RFC" },
      input.reversibility === "one_way_door"
        ? { step: "Schedule a 30-minute review with at least two senior engineers BEFORE merging" }
        : { step: "Two-way door — reviewers may approve without a sync if reasoning is clear" },
    ],
    reEvaluateIn:
      input.reversibility === "one_way_door"
        ? "12 months, or sooner if any consequence above changes status"
        : "6 months, or when superseded",
    payload: {
      adr_id: adrId,
      filename,
      status: input.status,
      reversibility: input.reversibility,
      chosen_option_present: decisionMentionsOption,
      options_count: input.options_considered.length,
      consequences_count: input.consequences.length,
      adr_markdown: adrBody,
    },
  });
}

// ---------------------------------------------------------------------------
// ADR markdown body — Nygard-style format
// ---------------------------------------------------------------------------

function buildAdrMarkdown(input: GenerateAdrInput, adrId: string): string {
  const status = input.status.charAt(0).toUpperCase() + input.status.slice(1);
  const reversibility =
    input.reversibility === "one_way_door"
      ? "One-way door (irreversible without significant cost)"
      : "Two-way door (reversible)";

  const optionsBlock = input.options_considered
    .map((o) => {
      const pros = o.pros.length
        ? o.pros.map((p) => `  - ✅ ${p}`).join("\n")
        : "  - _none recorded_";
      const cons = o.cons.length
        ? o.cons.map((c) => `  - ❌ ${c}`).join("\n")
        : "  - _none recorded_";
      return `### Option: ${o.name}\n\n**Pros**\n${pros}\n\n**Cons**\n${cons}`;
    })
    .join("\n\n");

  const consequences = input.consequences.map((c) => `- ${c}`).join("\n");
  const links =
    input.related_links && input.related_links.length > 0
      ? input.related_links.map((l) => `- ${l}`).join("\n")
      : "_None._";

  return [
    `# ${adrId}: ${input.title}`,
    "",
    `- **Status:** ${status}`,
    `- **Reversibility:** ${reversibility}`,
    `- **Date:** ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Context",
    "",
    input.context.trim(),
    "",
    "## Options Considered",
    "",
    optionsBlock,
    "",
    "## Decision",
    "",
    input.decision.trim(),
    "",
    "## Consequences",
    "",
    consequences,
    "",
    "## Related",
    "",
    links,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Risk + verdict
// ---------------------------------------------------------------------------

function collectRisks(input: GenerateAdrInput, decisionMentionsOption: boolean): RiskEntry[] {
  const risks: RiskEntry[] = [];
  if (input.options_considered.length < 2) {
    // Schema enforces ≥ 2, but defence-in-depth.
    risks.push({
      id: "ADR-NO-ALTERNATIVES",
      severity: "high",
      description: "Only one option considered — the decision is not actually a trade-off.",
      mitigation: "Document at least one alternative even if it was rejected immediately.",
    });
  }
  if (input.reversibility === "one_way_door" && input.consequences.length < 3) {
    risks.push({
      id: "ADR-ONEWAY-UNDERDOC",
      severity: "high",
      description:
        "One-way door decision with fewer than 3 consequences listed — irreversible decisions need disproportionately more documentation.",
      mitigation: "Expand the Consequences section with both positive and negative outcomes.",
    });
  }
  if (!decisionMentionsOption) {
    risks.push({
      id: "ADR-DECISION-DRIFT",
      severity: "medium",
      description:
        "The decision text does not reference any of the option names — readers cannot tell which option was chosen.",
      mitigation: 'Rewrite the Decision section to start with: "We chose <Option Name> because…"',
    });
  }
  if (input.options_considered.some((o) => o.pros.length === 0 && o.cons.length === 0)) {
    risks.push({
      id: "ADR-EMPTY-OPTION",
      severity: "low",
      description: "At least one option has neither pros nor cons recorded.",
      mitigation: "Add at least one pro or con per option to make the comparison meaningful.",
    });
  }
  return risks;
}

function pickVerdict(
  input: GenerateAdrInput,
  risks: RiskEntry[],
  decisionMentionsOption: boolean,
): Verdict {
  if (risks.some((r) => r.severity === "blocker")) return "reject";
  if (input.status === "deprecated" || input.status === "superseded") return "needs_review";
  if (risks.some((r) => r.severity === "high")) return "approve_with_conditions";
  if (!decisionMentionsOption) return "approve_with_conditions";
  return "approve";
}

function buildExecutiveSummary(
  input: GenerateAdrInput,
  verdict: Verdict,
  decisionMentionsOption: boolean,
): string {
  const verdictText = {
    approve: "ready to commit",
    approve_with_conditions: "ready to commit once the listed conditions are addressed",
    reject: "blocked from commit pending fixes",
    needs_review: "requires architecture-council review (status is deprecated/superseded)",
  }[verdict];
  return [
    `ADR for **${input.title}** is **${verdictText}**.`,
    `${input.options_considered.length} option(s) compared, ${input.consequences.length} consequence(s) recorded, reversibility **${input.reversibility.replace("_", " ")}**.`,
    decisionMentionsOption
      ? "Decision text references at least one of the considered options."
      : "⚠️ Decision text does not reference any considered option by name — see risk register.",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

function buildOptionsTable(input: GenerateAdrInput): string {
  const rows = input.options_considered.map(
    (o) =>
      `| **${escape(o.name)}** | ${o.pros.length} | ${o.cons.length} | ${
        input.decision.toLowerCase().includes(o.name.toLowerCase()) ? "✅ chosen" : "—"
      } |`,
  );
  return ["| Option | # Pros | # Cons | Status |", "|---|---|---|---|", ...rows].join("\n");
}

function buildChecklist(input: GenerateAdrInput, decisionMentionsOption: boolean): string {
  const checks = [
    { ok: input.options_considered.length >= 2, label: "At least 2 options compared" },
    { ok: decisionMentionsOption, label: "Decision text names the chosen option" },
    { ok: input.consequences.length >= 1, label: "At least one consequence listed" },
    {
      ok: input.reversibility !== "one_way_door" || input.consequences.length >= 3,
      label: "If one-way door, ≥ 3 consequences documented",
    },
    {
      ok: input.options_considered.every((o) => o.pros.length + o.cons.length > 0),
      label: "Every option has at least one pro or con",
    },
  ];
  return checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.label}`).join("\n");
}

function buildRecommendations(input: GenerateAdrInput, decisionMentionsOption: boolean): string[] {
  const recs: string[] = [];
  if (!decisionMentionsOption) {
    recs.push(
      'Open the Decision paragraph with: "We chose <Option Name> because…" so readers immediately know which option won.',
    );
  }
  if (input.reversibility === "one_way_door") {
    recs.push(
      "For a one-way door decision, add a 'Reversal Cost' subsection estimating effort/time to undo.",
    );
  }
  if (!input.related_links || input.related_links.length === 0) {
    recs.push(
      "Link the originating RFC, JIRA epic, or feasibility report so reviewers have full context.",
    );
  }
  recs.push("Keep this ADR immutable after merge — supersede with a new ADR rather than editing.");
  return recs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|");
}
