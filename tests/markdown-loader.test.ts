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
