import type { AnalyzeObservabilityGapsInput } from "../tools/schemas.js";
import { renderReport, type RiskEntry, type Verdict } from "./template.js";

const SCHEMA_VERSION = "1.0.0";

const REQUIRED_SIGNALS = ["logs", "metrics", "traces"] as const;
const RECOMMENDED_SIGNALS = ["events", "profiling"] as const;

interface PillarFinding {
  pillar: string;
  satisfied: boolean;
  notes: string[];
}

/**
 * Analyse the observability posture of a service against the FeatureArchitect
 * Observability Mandate: structured logging, RED metrics, distributed tracing,
 * SLO-driven symptom alerting. Returns concrete gaps and remediation steps.
 */
export function generateObservabilityReport(input: AnalyzeObservabilityGapsInput): string {
  const pillars = assessPillars(input);
  const risks = collectRisks(input);
  const verdict = pickVerdict(risks);

  const missingRequired = REQUIRED_SIGNALS.filter((s) => !input.current_signals.includes(s));
  const missingRecommended = RECOMMENDED_SIGNALS.filter((s) => !input.current_signals.includes(s));

  return renderReport({
    tool: "analyze_observability_gaps",
    schemaVersion: SCHEMA_VERSION,
    title: `Observability Gap Analysis: ${input.service_name}`,
    context: {
      service_name: input.service_name,
      current_signals: input.current_signals.join(", ") || "(none)",
      slo_targets: input.slo_targets.length,
      critical_user_journeys: input.critical_user_journeys.length,
      alert_count: input.alert_count,
      deployment_model: input.deployment_model,
    },
    executiveSummary: buildExecutiveSummary(input, verdict, missingRequired, risks.length),
    verdict,
    findings: [
      { heading: "3.1 Pillar Coverage", body: buildPillarTable(pillars) },
      {
        heading: "3.2 Missing Signal Types",
        body: buildMissingSignalsBlock(missingRequired, missingRecommended),
      },
      { heading: "3.3 SLO & Alert Health", body: buildSloBlock(input) },
      {
        heading: "3.4 Recommended Instrumentation Plan",
        body: buildInstrumentationPlan(input, missingRequired),
      },
    ],
    risks,
    recommendations: buildRecommendations(input, missingRequired),
    nextSteps: [
      { step: "Create one ticket per missing required signal" },
      { step: "Define a deadman's-switch alert per critical user journey" },
      { step: "Add SLO burn-rate alerts (1h fast burn + 6h slow burn) for every SLO" },
      { step: "Schedule a 'gameday' to verify alerts actually fire under simulated failure" },
    ],
    reEvaluateIn: "3 months, or after any major architecture change",
    payload: {
      missing_required_signals: missingRequired,
      missing_recommended_signals: missingRecommended,
      pillars: pillars.map((p) => ({ pillar: p.pillar, satisfied: p.satisfied, notes: p.notes })),
      blockers: risks.filter((r) => r.severity === "blocker").map((r) => r.id),
    },
  });
}

// ---------------------------------------------------------------------------
// Pillar assessment (RED + USE + Tracing + Alerting)
// ---------------------------------------------------------------------------

function assessPillars(input: AnalyzeObservabilityGapsInput): PillarFinding[] {
  return [
    {
      pillar: "Structured Logging (JSON, with trace_id)",
      satisfied: input.current_signals.includes("logs"),
      notes: input.current_signals.includes("logs")
        ? ["Verify logs are JSON, include trace_id, and exclude PII."]
        : ["No log signal declared — cannot debug incidents post-hoc."],
    },
    {
      pillar: "Metrics — RED (Rate, Errors, Duration)",
      satisfied: input.current_signals.includes("metrics"),
      notes: input.current_signals.includes("metrics")
        ? ["Confirm RED metrics exist per endpoint with p50/p95/p99 latency histograms."]
        : ["No metric signal declared — cannot define SLOs or burn-rate alerts."],
    },
    {
      pillar: "Distributed Tracing (W3C TraceContext)",
      satisfied: input.current_signals.includes("traces"),
      notes: input.current_signals.includes("traces")
        ? ["Verify trace propagation across every outbound call (DB, queue, downstream service)."]
        : ["No trace signal declared — cross-service incident debugging will be guesswork."],
    },
    {
      pillar: "SLO Definition",
      satisfied: input.slo_targets.length > 0,
      notes:
        input.slo_targets.length > 0
          ? [`${input.slo_targets.length} SLO(s) declared.`]
          : [
              "No SLOs declared — alerts will be cause-based not symptom-based; expect alert fatigue.",
            ],
    },
    {
      pillar: "Critical User Journey Tracing",
      satisfied: input.critical_user_journeys.length > 0,
      notes:
        input.critical_user_journeys.length > 0
          ? [`${input.critical_user_journeys.length} critical journey(s) identified.`]
          : ["No critical user journeys identified — cannot prioritise observability investment."],
    },
    {
      pillar: "Symptom-based Alerting",
      satisfied: input.alert_count !== undefined && input.alert_count > 0,
      notes:
        input.alert_count === undefined
          ? ["alert_count not provided — cannot evaluate alert health."]
          : input.alert_count === 0
            ? ["Zero alerts configured — outages will be detected by users, not by your team."]
            : input.alert_count > 50
              ? [`${input.alert_count} alerts — high risk of alert fatigue. Audit and consolidate.`]
              : [`${input.alert_count} alerts configured — within reasonable range.`],
    },
  ];
}

function collectRisks(input: AnalyzeObservabilityGapsInput): RiskEntry[] {
  const risks: RiskEntry[] = [];
  if (!input.current_signals.includes("logs")) {
    risks.push({
      id: "OBS-NO-LOGS",
      severity: "blocker",
      description: "No log signal declared — post-hoc incident analysis is impossible.",
      mitigation:
        "Adopt structured JSON logging with mandatory trace_id, request_id, service, version.",
    });
  }
  if (!input.current_signals.includes("metrics")) {
    risks.push({
      id: "OBS-NO-METRICS",
      severity: "blocker",
      description: "No metric signal declared — SLOs and burn-rate alerts cannot be defined.",
      mitigation: "Emit Prometheus/OpenTelemetry RED metrics per endpoint with latency histograms.",
    });
  }
  if (!input.current_signals.includes("traces")) {
    risks.push({
      id: "OBS-NO-TRACES",
      severity: "high",
      description: "No trace signal — cross-service incident debugging is guesswork.",
      mitigation: "Adopt OpenTelemetry tracing; propagate trace_id across every outbound call.",
    });
  }
  if (input.slo_targets.length === 0) {
    risks.push({
      id: "OBS-NO-SLO",
      severity: "high",
      description: "No SLOs declared — alerts cannot be tied to user-facing impact.",
      mitigation:
        "Define at least one SLO (availability, latency) with a 30-day window and burn-rate alerts.",
    });
  }
  if (input.alert_count !== undefined && input.alert_count === 0) {
    risks.push({
      id: "OBS-NO-ALERTS",
      severity: "high",
      description: "Zero alerts configured — outages will be detected by users, not by you.",
      mitigation:
        "At minimum: error-rate alert + latency-burn-rate alert per critical user journey.",
    });
  }
  if (input.alert_count !== undefined && input.alert_count > 50) {
    risks.push({
      id: "OBS-ALERT-FATIGUE",
      severity: "medium",
      description: `${input.alert_count} alerts configured — alert fatigue is likely.`,
      mitigation:
        "Audit alerts; delete cause-based alerts that don't correspond to user impact; group related alerts.",
    });
  }
  if (input.deployment_model === "serverless" && !input.current_signals.includes("metrics")) {
    risks.push({
      id: "OBS-SERVERLESS-NO-METRICS",
      severity: "high",
      description: "Serverless deployment without metrics — cold-start latency invisible.",
      mitigation: "Track cold-start frequency + duration as a first-class SLI.",
    });
  }
  if (input.critical_user_journeys.length > 0 && !input.current_signals.includes("traces")) {
    risks.push({
      id: "OBS-JOURNEY-NO-TRACE",
      severity: "high",
      description:
        "Critical user journeys declared but no tracing — cannot diagnose journey failures.",
      mitigation: "Add distributed tracing before declaring any production-grade SLO on a journey.",
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
  input: AnalyzeObservabilityGapsInput,
  verdict: Verdict,
  missingRequired: string[],
  riskCount: number,
): string {
  const verdictText = {
    approve: "is **production-ready** from an observability standpoint",
    approve_with_conditions:
      "is **approved with conditions** — implement listed signals before declaring production-ready",
    reject: "is **not production-ready** — required signals are missing",
    needs_review: "requires manual SRE review",
  }[verdict];

  const signalSentence =
    missingRequired.length === 0
      ? "All three required signal types (logs, metrics, traces) are in place."
      : `Missing required signal type(s): **${missingRequired.join(", ")}** — these are release blockers.`;

  const journeySentence =
    input.critical_user_journeys.length > 0
      ? `${input.critical_user_journeys.length} critical user journey(s) identified (${input.critical_user_journeys.map((j) => `"${j}"`).join("; ")}) — each requires a dedicated synthetic probe and deadman's-switch alert.`
      : "No critical user journeys declared.";

  const riskSentence =
    riskCount === 0
      ? "No risks identified."
      : `${riskCount} risk(s) identified — see Risk Register.`;

  return [
    `**${input.service_name}** ${verdictText}.`,
    signalSentence,
    journeySentence,
    riskSentence,
  ].join(" ");
}

function buildPillarTable(pillars: PillarFinding[]): string {
  const rows = pillars.map(
    (p) =>
      `| ${p.pillar} | ${p.satisfied ? "✅ satisfied" : "❌ missing"} | ${escape(p.notes.join(" "))} |`,
  );
  return ["| Pillar | Status | Notes |", "|---|---|---|", ...rows].join("\n");
}

function buildMissingSignalsBlock(missingRequired: string[], missingRecommended: string[]): string {
  const lines: string[] = [];
  if (missingRequired.length === 0 && missingRecommended.length === 0) {
    return "_All signal types present._";
  }
  if (missingRequired.length > 0) {
    lines.push("**Missing required signals:**");
    for (const s of missingRequired)
      lines.push(`- ❌ \`${s}\` — required by the Observability Mandate`);
  }
  if (missingRecommended.length > 0) {
    lines.push("");
    lines.push("**Missing recommended signals:**");
    for (const s of missingRecommended)
      lines.push(`- ⚠️ \`${s}\` — strongly recommended for production services`);
  }
  return lines.join("\n");
}

function buildSloBlock(input: AnalyzeObservabilityGapsInput): string {
  if (input.slo_targets.length === 0) {
    return "_No SLOs declared._ Define at least one before going to production.";
  }
  const rows = input.slo_targets.map((s) => `| ${escape(s.name)} | ${escape(s.target)} |`);
  return ["| SLO | Target |", "|---|---|", ...rows].join("\n");
}

function buildInstrumentationPlan(
  input: AnalyzeObservabilityGapsInput,
  missingRequired: string[],
): string {
  const items: string[] = [];
  if (missingRequired.includes("logs")) {
    items.push(
      "**Logs:** Adopt OpenTelemetry Logs SDK or pino with structured JSON. Mandatory fields: timestamp, level, service, version, trace_id, span_id, request_id, user_id (hashed), duration_ms.",
    );
  }
  if (missingRequired.includes("metrics")) {
    items.push(
      "**Metrics:** Emit Prometheus/OTel metrics: `requests_total{method, route, status}` (counter), `request_duration_seconds{method, route}` (histogram with default buckets).",
    );
  }
  if (missingRequired.includes("traces")) {
    items.push(
      "**Traces:** Initialise OTel tracer SDK; inject + extract W3C TraceContext on every inbound + outbound call. Ensure DB/queue/HTTP clients auto-instrument.",
    );
  }
  if (input.slo_targets.length === 0) {
    items.push(
      "**SLO:** Pick one SLI (e.g., availability) and one target (e.g., 99.9% over 30 days). Add fast-burn (1h, 14.4× rate) and slow-burn (6h, 6× rate) alerts.",
    );
  }
  if (input.critical_user_journeys.length > 0) {
    items.push(
      `**Journey instrumentation:** For each of the ${input.critical_user_journeys.length} critical journey(s), add a synthetic probe + a deadman's-switch alert.`,
    );
  }
  return items.length > 0
    ? items.map((item, i) => `${i + 1}. ${item}`).join("\n\n")
    : "_All required signals are present — focus on signal quality next._";
}

function buildRecommendations(
  input: AnalyzeObservabilityGapsInput,
  missingRequired: string[],
): string[] {
  const recs: string[] = [];
  if (missingRequired.length > 0) {
    recs.push(
      "Treat missing required signals as a release blocker — do not promote to production until all three are present.",
    );
  }
  if (input.slo_targets.length === 0) {
    recs.push(
      "Define SLOs before alerts. An alert without an SLO is a cause alarm, not a symptom alarm — the wrong default.",
    );
  }
  if (input.alert_count !== undefined && input.alert_count > 50) {
    recs.push(
      "Rule of thumb: every alert that has not paged in 90 days is a candidate for deletion.",
    );
  }
  recs.push(
    "Run a quarterly 'observability gameday' — inject a fault and verify alerts fire and dashboards show the cause.",
  );
  return recs;
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
