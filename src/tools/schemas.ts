import { z } from 'zod';

// Zod schema for Generate Enterprise API Spec Tool
export const GenerateApiSpecSchema = z.object({
  title: z.string().describe("API Domain Name"),
  version: z.string().describe("Semantic versioning (e.g., 1.0.0)"),
  endpoints: z.array(z.object({
    path: z.string().describe("Lowercase, plural nouns, kebab-case"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    summary: z.string(),
    requires_idempotency: z.boolean(),
    pagination_strategy: z.enum(['cursor', 'offset', 'none']).default('none'),
  }))
});

// Zod schema for Analyze Feasibility Tool
export const AnalyzeFeasibilitySchema = z.object({
  proposed_stack: z.array(z.string()).describe("List of libraries or tools"),
  target_throughput: z.number().optional().describe("Expected RPS"),
  data_consistency: z.enum(["strong", "eventual"]).optional()
});