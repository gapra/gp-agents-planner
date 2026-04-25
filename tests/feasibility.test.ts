import { describe, it, expect } from "vitest";
import { generateFeasibilityReport } from "../src/reports/feasibility.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

describe("generateFeasibilityReport", () => {
  it("approves a clean stack", () => {
    const out = generateFeasibilityReport({
      proposed_stack: ["fastify@4.26.0", "pg@8.11.0"],
    });
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve");
    expect(env.payload.dimension_scores).toHaveLength(8);
  });

  it("flags deprecated `request` as high security risk", () => {
    const out = generateFeasibilityReport({ proposed_stack: ["request@2.88.2"] });
    const env = parseEnvelope(out);
    const sec = env.payload.dimension_scores.find(
      (s: { dimension: string }) => s.dimension === "security",
    );
    expect(sec.score).toBeGreaterThanOrEqual(7);
    expect(env.verdict).toBe("approve_with_conditions");
  });

  it("blocks on consistency mismatch (strong + DynamoDB)", () => {
    const out = generateFeasibilityReport({
      proposed_stack: ["@aws-sdk/client-dynamodb@3.0.0"],
      data_consistency: "strong",
    });
    expect(out).toMatch(/CONSISTENCY-MISMATCH/);
  });

  it("flags PCI-DSS + database as high compliance risk", () => {
    const out = generateFeasibilityReport({
      proposed_stack: ["pg@8.11.0"],
      compliance_requirements: ["pci_dss"],
    });
    expect(out).toMatch(/COMPLIANCE-PCI-PII/);
  });

  it("scores cloud lock-in higher when AWS SDK is present", () => {
    const out = generateFeasibilityReport({
      proposed_stack: ["@aws-sdk/client-s3@3.0.0", "@aws-sdk/client-sqs@3.0.0"],
    });
    const env = parseEnvelope(out);
    const lockin = env.payload.dimension_scores.find(
      (s: { dimension: string }) => s.dimension === "cloud_lockin",
    );
    expect(lockin.score).toBeGreaterThanOrEqual(4);
  });

  it("flags pre-1.0 packages as backward compat risk", () => {
    const out = generateFeasibilityReport({ proposed_stack: ["nifty-lib@0.3.0"] });
    const env = parseEnvelope(out);
    const compat = env.payload.dimension_scores.find(
      (s: { dimension: string }) => s.dimension === "backward_compat",
    );
    expect(compat.score).toBeGreaterThanOrEqual(4);
  });

  it("flags ≥ 50k RPS as high performance risk", () => {
    const out = generateFeasibilityReport({
      proposed_stack: ["fastify@4.26.0"],
      target_throughput: 75_000,
    });
    const env = parseEnvelope(out);
    const perf = env.payload.dimension_scores.find(
      (s: { dimension: string }) => s.dimension === "performance",
    );
    expect(perf.score).toBeGreaterThanOrEqual(7);
  });

  it("renders all canonical sections of the template", () => {
    const out = generateFeasibilityReport({ proposed_stack: ["express@4.19.0"] });
    expect(out).toMatch(/## 1\. Context/);
    expect(out).toMatch(/## 2\. Executive Summary/);
    expect(out).toMatch(/## 3\. Findings/);
    expect(out).toMatch(/## 4\. Risk Register/);
    expect(out).toMatch(/## 5\. Recommendations/);
    expect(out).toMatch(/## 6\. Next Steps/);
    expect(out).toMatch(/## 7\. Re-evaluation/);
  });
});
