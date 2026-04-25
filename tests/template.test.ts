import { describe, it, expect } from "vitest";
import { renderReport } from "../src/reports/template.js";

describe("renderReport", () => {
  const baseInput = {
    tool: "test_tool",
    schemaVersion: "1.0.0",
    title: "Test Report",
    context: { foo: "bar", baz: 1 },
    executiveSummary: "All good.",
    verdict: "approve" as const,
    findings: [{ heading: "3.1 Section A", body: "Body A" }],
    risks: [],
    recommendations: ["Do X"],
    nextSteps: [{ step: "Do Y" }],
    reEvaluateIn: "6 months",
    payload: { hello: "world" },
  };

  it("renders all 7 canonical sections", () => {
    const out = renderReport(baseInput);
    expect(out).toMatch(/## 1. Context/);
    expect(out).toMatch(/## 2. Executive Summary/);
    expect(out).toMatch(/## 3. Findings/);
    expect(out).toMatch(/## 4. Risk Register/);
    expect(out).toMatch(/## 5. Recommendations/);
    expect(out).toMatch(/## 6. Next Steps/);
    expect(out).toMatch(/## 7. Re-evaluation/);
  });

  it("emits a parseable JSON envelope", () => {
    const out = renderReport(baseInput);
    const match = out.match(/```json\n([\s\S]*?)\n```/);
    expect(match).not.toBeNull();
    const env = JSON.parse(match![1]);
    expect(env.tool).toBe("test_tool");
    expect(env.verdict).toBe("approve");
    expect(env.payload).toEqual({ hello: "world" });
    expect(env.blockers).toEqual([]);
  });

  it("includes risk IDs as blockers in the envelope when severity=blocker", () => {
    const out = renderReport({
      ...baseInput,
      risks: [
        {
          id: "SEC-001",
          severity: "blocker",
          description: "CVE",
          mitigation: "patch",
        },
      ],
    });
    const env = JSON.parse(out.match(/```json\n([\s\S]*?)\n```/)![1]);
    expect(env.blockers).toContain("SEC-001");
  });

  it("renders 'None identified.' when risks is empty", () => {
    const out = renderReport(baseInput);
    expect(out).toMatch(/_None identified\._/);
  });

  it("escapes pipe characters in risk cells", () => {
    const out = renderReport({
      ...baseInput,
      risks: [
        {
          id: "X",
          severity: "low",
          description: "a | b",
          mitigation: "c | d",
        },
      ],
    });
    expect(out).toMatch(/a \\\| b/);
    expect(out).toMatch(/c \\\| d/);
  });
});
