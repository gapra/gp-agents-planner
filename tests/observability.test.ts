import { describe, it, expect } from "vitest";
import { generateObservabilityReport } from "../src/reports/observability.js";
import { AnalyzeObservabilityGapsSchema } from "../src/tools/schemas.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

describe("generateObservabilityReport", () => {
  it("rejects when required signals are missing", () => {
    const out = generateObservabilityReport(
      AnalyzeObservabilityGapsSchema.parse({
        service_name: "PaymentService",
        current_signals: [],
      }),
    );
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("reject");
    expect(env.payload.missing_required_signals).toContain("logs");
    expect(env.payload.missing_required_signals).toContain("metrics");
    expect(env.payload.missing_required_signals).toContain("traces");
    expect(out).toMatch(/OBS-NO-LOGS/);
    expect(out).toMatch(/OBS-NO-METRICS/);
  });

  it("approves with conditions when all required signals present but no SLO", () => {
    const out = generateObservabilityReport(
      AnalyzeObservabilityGapsSchema.parse({
        service_name: "PaymentService",
        current_signals: ["logs", "metrics", "traces"],
      }),
    );
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve_with_conditions");
    expect(out).toMatch(/OBS-NO-SLO/);
  });

  it("flags alert fatigue when alert_count > 50", () => {
    const out = generateObservabilityReport(
      AnalyzeObservabilityGapsSchema.parse({
        service_name: "PaymentService",
        current_signals: ["logs", "metrics", "traces"],
        slo_targets: [{ name: "availability", target: "99.9% over 30d" }],
        alert_count: 120,
      }),
    );
    expect(out).toMatch(/OBS-ALERT-FATIGUE/);
  });

  it("flags serverless without metrics as high risk", () => {
    const out = generateObservabilityReport(
      AnalyzeObservabilityGapsSchema.parse({
        service_name: "PaymentService",
        current_signals: ["logs", "traces"],
        deployment_model: "serverless",
      }),
    );
    expect(out).toMatch(/OBS-SERVERLESS-NO-METRICS/);
  });

  it("approves a mature setup", () => {
    const out = generateObservabilityReport(
      AnalyzeObservabilityGapsSchema.parse({
        service_name: "PaymentService",
        current_signals: ["logs", "metrics", "traces"],
        slo_targets: [{ name: "availability", target: "99.9% over 30d" }],
        critical_user_journeys: ["checkout"],
        alert_count: 12,
        deployment_model: "managed_cloud",
      }),
    );
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve");
  });
});
