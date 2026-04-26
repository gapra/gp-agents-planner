import type { GenerateRunbookInput } from "../tools/schemas.js";
import { renderReport, type RiskEntry, type Verdict } from "./template.js";

const SCHEMA_VERSION = "1.0.0";

const SEV_DEFINITION: Record<string, { label: string; response: string; description: string }> = {
  sev1: {
    label: "SEV-1",
    response: "Page on-call within 5 minutes, 24/7",
    description: "Customer-impacting outage, data loss risk, security incident",
  },
  sev2: {
    label: "SEV-2",
    response: "Page on-call within 30 minutes during business hours; ticket overnight",
    description: "Significant degradation, partial feature outage",
  },
  sev3: {
    label: "SEV-3",
    response: "Ticket; address next business day",
    description: "Cosmetic, intermittent, low-impact",
  },
};

/**
 * Produces an operational runbook scaffold. The runbook itself is the primary
 * artefact (Findings 3.1) — drop into your repo as `docs/runbooks/<service>.md`.
 * The template's verdict surfaces production-readiness based on inputs
 * (rollback tested? SLO defined? upstream deps mapped?).
 */
export function generateRunbook(input: GenerateRunbookInput): string {
  const risks = collectRisks(input);
  const verdict = pickVerdict(risks);
  const runbookBody = buildRunbookMarkdown(input);

  return renderReport({
    tool: "generate_runbook",
    schemaVersion: SCHEMA_VERSION,
    title: `Runbook: ${input.service_name}`,
    context: {
      service_name: input.service_name,
      owner_team: input.owner_team,
      severity_tiers: input.severity_tiers.join(", "),
      known_failure_modes: input.known_failure_modes.length,
      slo_target: input.slo_target,
      upstream_dependencies: input.upstream_dependencies.length,
      has_tested_rollback: input.has_tested_rollback ? "yes" : "no",
    },
    executiveSummary: buildExecutiveSummary(input, verdict, risks.length),
    verdict,
    findings: [
      {
        heading: "3.1 Runbook Markdown (commit this file)",
        body: ["```markdown", runbookBody, "```"].join("\n"),
      },
      { heading: "3.2 Pre-Production Readiness Checklist", body: buildChecklist(input) },
      { heading: "3.3 Failure Mode Map", body: buildFailureModeBlock(input) },
    ],
    risks,
    recommendations: buildRecommendations(input),
    nextSteps: [
      { step: `Save the runbook as \`docs/runbooks/${slugify(input.service_name)}.md\`` },
      { step: "Walk through the runbook with the on-call rotation in a 30-minute review" },
      {
        step: "Run a tabletop exercise simulating each known failure mode",
        owner: input.owner_team,
      },
      input.has_tested_rollback
        ? { step: "Verify the rollback drill is scheduled to repeat every 6 months" }
        : {
            step: "BLOCKER: Run a live rollback drill before production traffic",
            owner: input.owner_team,
          },
    ],
    reEvaluateIn: "6 months, or after every SEV-1 incident",
    payload: {
      service_name: input.service_name,
      owner_team: input.owner_team,
      severity_tiers: input.severity_tiers,
      runbook_markdown: runbookBody,
      readiness_blockers: risks.filter((r) => r.severity === "blocker").map((r) => r.id),
    },
  });
}

// ---------------------------------------------------------------------------
// Runbook markdown body
// ---------------------------------------------------------------------------

function buildRunbookMarkdown(input: GenerateRunbookInput): string {
  const sevTable = input.severity_tiers
    .map((t) => {
      const def = SEV_DEFINITION[t];
      return `| **${def.label}** | ${def.description} | ${def.response} |`;
    })
    .join("\n");

  const failureSections = input.known_failure_modes
    .map(
      (f, i) =>
        `### ${i + 1}. ${f}

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.`,
    )
    .join("\n\n");

  const upstream =
    input.upstream_dependencies.length > 0
      ? input.upstream_dependencies.map((d) => `- \`${d}\``).join("\n")
      : "- _None declared._";

  return [
    `# Runbook: ${input.service_name}`,
    "",
    `**Owner team:** ${input.owner_team}`,
    `**Last reviewed:** ${new Date().toISOString().slice(0, 10)}`,
    input.slo_target
      ? `**SLO:** ${input.slo_target}`
      : "**SLO:** _not defined — define before declaring production-ready_",
    "",
    "## Severity Tiers",
    "",
    "| Severity | Trigger | Response |",
    "|---|---|---|",
    sevTable,
    "",
    "## On-Call Escalation",
    "",
    `1. Primary: ${input.owner_team} on-call (PagerDuty/Opsgenie rotation)`,
    "2. Secondary: Engineering manager",
    "3. Incident commander: assign for any SEV-1",
    "",
    "## Upstream Dependencies",
    "",
    upstream,
    "",
    "## Rollback",
    "",
    input.has_tested_rollback
      ? "✅ Rollback path is tested. Steps:\n\n1. _TODO: command to roll back deployment (helm rollback, kubectl rollout undo, etc.)_\n2. Verify health checks pass.\n3. Notify in #incidents channel."
      : "⚠️ Rollback path is **not tested**. Complete a rollback drill before considering this service production-ready. Steps to draft:\n\n1. _TODO: command to roll back deployment_\n2. _TODO: verification step_\n3. _TODO: communications step_",
    "",
    "## Known Failure Modes",
    "",
    failureSections,
    "",
    "## Useful Links",
    "",
    "- _TODO: dashboard URLs (RED metrics, USE metrics, error budget burn)_",
    "- _TODO: alert configuration repo URL_",
    "- _TODO: code repository URL_",
    "- _TODO: latest postmortem links_",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Risk + verdict
// ---------------------------------------------------------------------------

function collectRisks(input: GenerateRunbookInput): RiskEntry[] {
  const risks: RiskEntry[] = [];
  if (!input.has_tested_rollback) {
    risks.push({
      id: "RUNBOOK-NO-ROLLBACK-DRILL",
      severity: "blocker",
      description:
        "Rollback path has not been tested. Untested rollback = no rollback under stress.",
      mitigation:
        "Run a live rollback drill in staging; document the exact commands; repeat every 6 months.",
    });
  }
  if (!input.slo_target) {
    risks.push({
      id: "RUNBOOK-NO-SLO",
      severity: "high",
      description: "No SLO defined — cannot evaluate whether incidents breach service contract.",
      mitigation:
        "Define an SLO before promoting to production. Even a generous target is better than none.",
    });
  }
  if (input.upstream_dependencies.length === 0) {
    risks.push({
      id: "RUNBOOK-NO-DEPS",
      severity: "medium",
      description:
        "No upstream dependencies declared — most services have at least one (DB, queue, downstream API). Either truly standalone or under-mapped.",
      mitigation:
        "List every external dependency, including platform services (DB, cache, identity provider).",
    });
  }
  if (input.known_failure_modes.length < 3) {
    risks.push({
      id: "RUNBOOK-FEW-FAILURE-MODES",
      severity: "medium",
      description: `${input.known_failure_modes.length} failure mode(s) declared — most production services have ≥ 3 known modes (e.g., DB outage, queue backlog, dependency 5xx).`,
      mitigation:
        "Run a pre-mortem with the team; expand failure modes from the FeatureArchitect Failure Mode Catalog.",
    });
  }
  if (!input.severity_tiers.includes("sev1")) {
    risks.push({
      id: "RUNBOOK-NO-SEV1",
      severity: "medium",
      description:
        "No SEV-1 tier defined — production services need a 'page humans 24/7' escalation path.",
      mitigation: "Add sev1 to severity_tiers and document the on-call rotation.",
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
  input: GenerateRunbookInput,
  verdict: Verdict,
  riskCount: number,
): string {
  const verdictText = {
    approve: "is **production-ready** from a runbook standpoint",
    approve_with_conditions:
      "is **approved with conditions** — address the listed blockers before production exposure",
    reject: "is **not production-ready** — critical readiness gaps remain",
    needs_review: "requires manual SRE review",
  }[verdict];
  return [
    `Runbook for **${input.service_name}** ${verdictText}.`,
    `${input.known_failure_modes.length} failure mode(s) covered, ${input.severity_tiers.length} severity tier(s) defined, owned by **${input.owner_team}**.`,
    riskCount === 0
      ? "No readiness gaps detected."
      : `${riskCount} gap(s) flagged — see Risk Register for remediation steps.`,
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

function buildChecklist(input: GenerateRunbookInput): string {
  const checks = [
    { ok: input.has_tested_rollback, label: "Rollback path tested in staging" },
    { ok: !!input.slo_target, label: "SLO target defined" },
    { ok: input.severity_tiers.includes("sev1"), label: "SEV-1 escalation path defined" },
    { ok: input.upstream_dependencies.length > 0, label: "Upstream dependencies mapped" },
    { ok: input.known_failure_modes.length >= 3, label: "≥ 3 known failure modes documented" },
    { ok: input.owner_team.length > 0, label: "Owner team identified" },
  ];
  return checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.label}`).join("\n");
}

function buildFailureModeBlock(input: GenerateRunbookInput): string {
  return input.known_failure_modes
    .map((f, i) => `${i + 1}. \`${escape(f)}\` — runbook section ${i + 1} drafted`)
    .join("\n");
}

function buildRecommendations(input: GenerateRunbookInput): string[] {
  const recs: string[] = [];
  if (!input.has_tested_rollback) {
    recs.push(
      "Schedule a rollback drill THIS week — untested rollback is the #1 cause of prolonged outages.",
    );
  }
  if (!input.slo_target) {
    recs.push("Adopt an SLO before traffic ramp. Without one, incident severity is subjective.");
  }
  if (input.known_failure_modes.length < 3) {
    recs.push(
      "Hold a 1-hour pre-mortem: 'It's 6 months from now and this service is in a SEV-1 incident — what happened?' Expand failure modes from the answers.",
    );
  }
  recs.push("Date-stamp the runbook on every edit. A 12-month-old runbook is fiction.");
  recs.push(
    "Practise a tabletop exercise per quarter — read failure mode aloud, walk through detection + mitigation steps from memory.",
  );
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
