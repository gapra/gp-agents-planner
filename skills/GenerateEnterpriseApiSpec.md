# Skill: Generate Enterprise REST API Specification (OpenAPI 3.1.0)

## Metadata
**Tool Name:** `generate_enterprise_api_spec`
**Description:** Generates a production-grade OpenAPI 3.1.0 specification enforcing idempotency, structured error formats (RFC 7807), and pagination.

## Logic
The system parses the LLM JSON input, injects global headers (e.g., `X-Request-ID`), enforces `Idempotency-Key` for POST/PUT requests, and returns a valid YAML schema.