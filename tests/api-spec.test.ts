import { describe, it, expect } from "vitest";
import { generateEnterpriseApiSpec } from "../src/reports/api-spec.js";

function parseEnvelope(report: string) {
  const m = report.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("Envelope not found");
  return JSON.parse(m[1]);
}

describe("generateEnterpriseApiSpec", () => {
  it("emits a valid templated report with envelope", () => {
    const out = generateEnterpriseApiSpec({
      title: "Payment API",
      version: "1.0.0",
      endpoints: [
        {
          path: "/payment-methods",
          method: "GET",
          summary: "List methods",
          requires_idempotency: false,
          pagination_strategy: "cursor",
          auth_scheme: "bearer_jwt",
          rate_limit_tier: "standard",
          deprecated: false,
        },
      ],
    });
    expect(out).toMatch(/openapi: 3\.1\.0/);
    expect(out).toMatch(/## 3\. Findings/);
    const env = parseEnvelope(out);
    expect(env.tool).toBe("generate_enterprise_api_spec");
    expect(env.verdict).toBe("approve");
    expect(env.payload.endpoint_count).toBe(1);
    expect(env.payload.openapi_yaml).toMatch(/BearerJWT/);
  });

  it("flags missing idempotency on POST as a medium risk", () => {
    const out = generateEnterpriseApiSpec({
      title: "X",
      version: "1.0.0",
      endpoints: [
        {
          path: "/orders",
          method: "POST",
          summary: "Create order",
          requires_idempotency: false,
          pagination_strategy: "none",
          auth_scheme: "bearer_jwt",
          rate_limit_tier: "standard",
          deprecated: false,
        },
      ],
    });
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve_with_conditions");
    expect(out).toMatch(/IDEMP-/);
  });

  it("flags unauthenticated endpoints as high risk", () => {
    const out = generateEnterpriseApiSpec({
      title: "X",
      version: "1.0.0",
      endpoints: [
        {
          path: "/public",
          method: "GET",
          summary: "Public",
          requires_idempotency: false,
          pagination_strategy: "none",
          auth_scheme: "none",
          rate_limit_tier: "standard",
          deprecated: false,
        },
      ],
    });
    expect(out).toMatch(/AUTH-/);
    const env = parseEnvelope(out);
    expect(env.verdict).toBe("approve_with_conditions");
  });

  it("includes deprecation headers in YAML for deprecated endpoints", () => {
    const out = generateEnterpriseApiSpec({
      title: "X",
      version: "1.0.0",
      endpoints: [
        {
          path: "/legacy",
          method: "GET",
          summary: "Legacy",
          requires_idempotency: false,
          pagination_strategy: "none",
          auth_scheme: "bearer_jwt",
          rate_limit_tier: "standard",
          deprecated: true,
          sunset_date: "2030-01-01",
        },
      ],
    });
    expect(out).toMatch(/Deprecation:/);
    expect(out).toMatch(/Sunset:/);
  });

  it("flags v0 APIs as a low-severity risk", () => {
    const out = generateEnterpriseApiSpec({
      title: "X",
      version: "0.5.0",
      endpoints: [
        {
          path: "/x",
          method: "GET",
          summary: "x",
          requires_idempotency: false,
          pagination_strategy: "none",
          auth_scheme: "bearer_jwt",
          rate_limit_tier: "standard",
          deprecated: false,
        },
      ],
    });
    expect(out).toMatch(/VERSION-PRE-1\.0/);
  });
});
