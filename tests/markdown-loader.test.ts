import { describe, it, expect } from "vitest";
import { loadMarkdown } from "../src/utils/markdown-loader.js";

describe("loadMarkdown", () => {
  it("loads an allowed agent markdown", async () => {
    const content = await loadMarkdown("agents/FeatureArchitect.md");
    expect(content).toMatch(/Principal Feature Architect/);
  });

  it("loads an allowed skill markdown", async () => {
    const content = await loadMarkdown("skills/AnalyzeFeasibility.md");
    expect(content.length).toBeGreaterThan(0);
  });

  it("loads each of the four registered agent personas", async () => {
    const agents = [
      "agents/FeatureArchitect.md",
      "agents/TechResearcher.md",
      "agents/SecurityAuditor.md",
      "agents/DbSchemaDesigner.md",
    ];
    for (const a of agents) {
      const content = await loadMarkdown(a);
      expect(content).toMatch(/^# /);
    }
  });

  it("loads each of the six registered skill docs", async () => {
    const skills = [
      "skills/GenerateEnterpriseApiSpec.md",
      "skills/AnalyzeFeasibility.md",
      "skills/GenerateAdr.md",
      "skills/GenerateThreatModel.md",
      "skills/AnalyzeObservabilityGaps.md",
      "skills/GenerateRunbook.md",
    ];
    for (const s of skills) {
      const content = await loadMarkdown(s);
      expect(content).toMatch(/Tool Name/);
    }
  });

  it("rejects path traversal escapes", async () => {
    await expect(loadMarkdown("agents/../../etc/passwd")).rejects.toThrow(/Access denied/);
  });

  it("rejects absolute paths outside the project", async () => {
    await expect(loadMarkdown("/etc/passwd")).rejects.toThrow(/Access denied/);
  });

  it("rejects sibling-prefix bypass like agents-evil/file", async () => {
    await expect(loadMarkdown("agents-evil/file.md")).rejects.toThrow(/Access denied/);
  });

  it("rejects directories outside the allowlist", async () => {
    await expect(loadMarkdown("src/index.ts")).rejects.toThrow(/Access denied/);
  });
});
