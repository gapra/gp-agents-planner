import { describe, it, expect } from "vitest";
import { generateAdr } from "../src/reports/adr.js";
import { GenerateAdrSchema } from "../src/tools/schemas.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

const baseInput = {
  number: 42,
  title: "Use cursor pagination for /orders",
  status: "proposed" as const,
  context: "We need a paging strategy for the /orders list endpoint that scales beyond 10k rows.",
  options_considered: [
    { name: "Cursor", pros: ["Stable under writes"], cons: ["No jump-to-page"] },
    { name: "Offset", pros: ["Random page access"], cons: ["Slow at high offsets"] },
  ],
  decision:
    "We chose Cursor because the workload is real-time feed with no need to jump to page N.",
  reversibility: "two_way_door" as const,
  consequences: ["Cannot show 'page 47 of 312' in the UI"],
};

describe("generateAdr", () => {
  it("approves a clean ADR", () => {
    const parsed = GenerateAdrSchema.parse(baseInput);
    const out = generateAdr(parsed);
    const env = parseEnvelope(out);
    expect(env.tool).toBe("generate_adr");
    expect(env.verdict).toBe("approve");
    expect(env.payload.adr_id).toBe("ADR-0042");
    expect(env.payload.filename).toMatch(/^0042-use-cursor-pagination/);
    expect(env.payload.adr_markdown).toMatch(/# ADR-0042/);
  });

  it("flags decision drift when no option name appears in decision text", () => {
    const out = generateAdr(
      GenerateAdrSchema.parse({
        ...baseInput,
        decision: "We picked the more scalable approach because performance matters.",
      }),
    );
    expect(out).toMatch(/ADR-DECISION-DRIFT/);
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve_with_conditions");
    expect(env.payload.chosen_option_present).toBe(false);
  });

  it("flags one-way door with too few consequences as high risk", () => {
    const out = generateAdr(
      GenerateAdrSchema.parse({
        ...baseInput,
        reversibility: "one_way_door",
        consequences: ["Only one consequence listed"],
      }),
    );
    expect(out).toMatch(/ADR-ONEWAY-UNDERDOC/);
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve_with_conditions");
  });

  it("flags status superseded as needs_review", () => {
    const out = generateAdr(GenerateAdrSchema.parse({ ...baseInput, status: "superseded" }));
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("needs_review");
  });

  it("rejects fewer than 2 options at the schema level", () => {
    expect(() =>
      GenerateAdrSchema.parse({
        ...baseInput,
        options_considered: [{ name: "Only one", pros: [], cons: [] }],
      }),
    ).toThrow(/at least two options/i);
  });

  it("renders all canonical template sections", () => {
    const out = generateAdr(GenerateAdrSchema.parse(baseInput));
    for (const section of [
      "## 1. Context",
      "## 2. Executive Summary",
      "## 3. Findings",
      "## 4. Risk Register",
      "## 5. Recommendations",
      "## 6. Next Steps",
      "## 7. Re-evaluation",
    ]) {
      expect(out).toMatch(new RegExp(section.replace(/\./g, "\\.")));
    }
  });
});
