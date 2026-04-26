import { describe, it, expect } from "vitest";
import { generateThreatModel } from "../src/reports/threat-model.js";
import { GenerateThreatModelSchema } from "../src/tools/schemas.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

const baseInput = {
  system_name: "Payment Service",
  trust_boundaries: ["internet → public_api"],
  assets: [{ name: "payment_method", sensitivity: "confidential" as const }],
  entry_points: ["POST /payments"],
  authentication: "bearer_jwt" as const,
  handles_pii: false,
};

describe("generateThreatModel", () => {
  it("produces 6 STRIDE scores and a summary", () => {
    const out = generateThreatModel(GenerateThreatModelSchema.parse(baseInput));
    const env = parseEnvelope(out);
    expect(env.tool).toBe("generate_threat_model");
    expect(env.payload.stride_scores).toHaveLength(6);
    const cats = env.payload.stride_scores.map((s: { category: string }) => s.category).sort();
    expect(cats).toEqual(
      ["dos", "elevation", "info_disclosure", "repudiation", "spoofing", "tampering"].sort(),
    );
  });

  it("rejects (verdict) when authentication is none", () => {
    const out = generateThreatModel(
      GenerateThreatModelSchema.parse({ ...baseInput, authentication: "none" }),
    );
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("reject");
    expect(out).toMatch(/STRIDE-SPOOFING-BLOCKER/);
  });

  it("amplifies info_disclosure when handling PII without compliance declared", () => {
    const out = generateThreatModel(
      GenerateThreatModelSchema.parse({ ...baseInput, handles_pii: true }),
    );
    expect(out).toMatch(/PII-NO-COMPLIANCE-DECLARED/);
    const env = parseEnvelope(out);
    const info = env.payload.stride_scores.find(
      (s: { category: string }) => s.category === "info_disclosure",
    );
    expect(info.score).toBeGreaterThanOrEqual(7);
  });

  it("scores PCI-DSS handling as a high info-disclosure risk", () => {
    const out = generateThreatModel(
      GenerateThreatModelSchema.parse({
        ...baseInput,
        handles_pii: true,
        compliance_requirements: ["pci_dss"],
      }),
    );
    const env = parseEnvelope(out);
    const info = env.payload.stride_scores.find(
      (s: { category: string }) => s.category === "info_disclosure",
    );
    expect(info.score).toBeGreaterThanOrEqual(8);
  });

  it("renders all canonical template sections", () => {
    const out = generateThreatModel(GenerateThreatModelSchema.parse(baseInput));
    expect(out).toMatch(/## 3\. Findings/);
    expect(out).toMatch(/STRIDE Scorecard/);
  });
});
