import { describe, it, expect } from "vitest";
import { GenerateApiSpecSchema, AnalyzeFeasibilitySchema } from "../src/tools/schemas.js";

describe("GenerateApiSpecSchema", () => {
  const baseEndpoint = {
    path: "/payment-methods",
    method: "GET" as const,
    summary: "List payment methods",
    requires_idempotency: false,
    pagination_strategy: "cursor" as const,
  };

  it("accepts a minimal valid spec", () => {
    const parsed = GenerateApiSpecSchema.parse({
      title: "Payment API",
      version: "1.0.0",
      endpoints: [baseEndpoint],
    });
    expect(parsed.endpoints[0].auth_scheme).toBe("bearer_jwt");
    expect(parsed.endpoints[0].rate_limit_tier).toBe("standard");
  });

  it("rejects non-semver versions", () => {
    expect(() =>
      GenerateApiSpecSchema.parse({
        title: "x",
        version: "latest",
        endpoints: [baseEndpoint],
      }),
    ).toThrow(/semantic version/i);
  });

  it("rejects path traversal in API paths", () => {
    expect(() =>
      GenerateApiSpecSchema.parse({
        title: "x",
        version: "1.0.0",
        endpoints: [{ ...baseEndpoint, path: "/../etc/passwd" }],
      }),
    ).toThrow(/lowercase|traversal/i);
  });

  it("rejects uppercase paths", () => {
    expect(() =>
      GenerateApiSpecSchema.parse({
        title: "x",
        version: "1.0.0",
        endpoints: [{ ...baseEndpoint, path: "/PaymentMethods" }],
      }),
    ).toThrow(/lowercase/i);
  });

  it("requires sunset_date when deprecated=true", () => {
    expect(() =>
      GenerateApiSpecSchema.parse({
        title: "x",
        version: "1.0.0",
        endpoints: [{ ...baseEndpoint, deprecated: true }],
      }),
    ).toThrow(/sunset_date is required/);
  });

  it("rejects an impossible sunset_date", () => {
    expect(() =>
      GenerateApiSpecSchema.parse({
        title: "x",
        version: "1.0.0",
        endpoints: [{ ...baseEndpoint, deprecated: true, sunset_date: "2026-02-31" }],
      }),
    ).toThrow(/real calendar date/);
  });

  it("caps endpoints at 100", () => {
    const many = Array.from({ length: 101 }, (_, i) => ({
      ...baseEndpoint,
      path: `/items-${i}`,
    }));
    expect(() =>
      GenerateApiSpecSchema.parse({ title: "x", version: "1.0.0", endpoints: many }),
    ).toThrow(/Maximum of 100/);
  });
});

describe("AnalyzeFeasibilitySchema", () => {
  it("accepts a minimal stack", () => {
    const parsed = AnalyzeFeasibilitySchema.parse({ proposed_stack: ["express@4.19.0"] });
    expect(parsed.proposed_stack).toEqual(["express@4.19.0"]);
  });

  it("rejects empty stack", () => {
    expect(() => AnalyzeFeasibilitySchema.parse({ proposed_stack: [] })).toThrow(/at least one/i);
  });

  it("rejects non-integer throughput", () => {
    expect(() =>
      AnalyzeFeasibilitySchema.parse({ proposed_stack: ["a"], target_throughput: 1.5 }),
    ).toThrow(/integer/);
  });

  it("rejects unknown compliance entries", () => {
    expect(() =>
      AnalyzeFeasibilitySchema.parse({
        proposed_stack: ["a"],
        compliance_requirements: ["fedramp"],
      }),
    ).toThrow();
  });
});
