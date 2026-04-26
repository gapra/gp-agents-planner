import { describe, it, expect } from "vitest";
import { generateRunbook } from "../src/reports/runbook.js";
import { GenerateRunbookSchema } from "../src/tools/schemas.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

const baseInput = {
  service_name: "Payments API",
  owner_team: "payments-platform",
  severity_tiers: ["sev1" as const, "sev2" as const, "sev3" as const],
  known_failure_modes: ["DB outage", "queue backlog", "Stripe 5xx"],
  slo_target: "99.9% availability over 30d",
  upstream_dependencies: ["postgres-primary", "stripe", "kafka"],
  has_tested_rollback: true,
};

describe("generateRunbook", () => {
  it("approves a mature runbook", () => {
    const out = generateRunbook(GenerateRunbookSchema.parse(baseInput));
    const env = parseEnvelope(out);
    expect(env.tool).toBe("generate_runbook");
    expect(env.verdict).toBe("approve");
    expect(env.payload.runbook_markdown).toMatch(/# Runbook: Payments API/);
    expect(env.payload.runbook_markdown).toMatch(/Stripe 5xx/);
  });

  it("rejects when rollback is untested (blocker)", () => {
    const out = generateRunbook(
      GenerateRunbookSchema.parse({ ...baseInput, has_tested_rollback: false }),
    );
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("reject");
    expect(out).toMatch(/RUNBOOK-NO-ROLLBACK-DRILL/);
    expect(env.payload.readiness_blockers).toContain("RUNBOOK-NO-ROLLBACK-DRILL");
  });

  it("flags missing SLO as high risk", () => {
    const { slo_target: _slo, ...rest } = baseInput;
    const out = generateRunbook(GenerateRunbookSchema.parse(rest));
    expect(out).toMatch(/RUNBOOK-NO-SLO/);
  });

  it("flags fewer than 3 failure modes as medium risk", () => {
    const out = generateRunbook(
      GenerateRunbookSchema.parse({ ...baseInput, known_failure_modes: ["DB outage"] }),
    );
    expect(out).toMatch(/RUNBOOK-FEW-FAILURE-MODES/);
  });

  it("warns when no SEV-1 tier is defined", () => {
    const out = generateRunbook(
      GenerateRunbookSchema.parse({ ...baseInput, severity_tiers: ["sev2", "sev3"] }),
    );
    expect(out).toMatch(/RUNBOOK-NO-SEV1/);
  });

  it("includes the suggested filename in the next steps", () => {
    const out = generateRunbook(GenerateRunbookSchema.parse(baseInput));
    expect(out).toMatch(/docs\/runbooks\/payments-api\.md/);
  });
});
