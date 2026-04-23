# Skill: Generate Enterprise REST API Specification (OpenAPI 3.1.0)

## Metadata

**Tool Name:** `generate_enterprise_api_spec`  
**Description:** Generates a production-grade OpenAPI 3.1.0 specification that enforces authentication, idempotency, structured error formats (RFC 7807), rate limiting, API versioning, pagination, deprecation lifecycle, and CORS policies.

---

## Input Contract

All fields are validated against the schema defined in `src/tools/schemas.ts`.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `title` | `string` | ✅ | 1–200 chars | API domain name (e.g., `Payment Service API`) |
| `version` | `string` | ✅ | Must match semver `x.y.z` | Semantic version of the API |
| `endpoints` | `array` | ✅ | 1–100 items | List of endpoint definitions |
| `endpoints[].path` | `string` | ✅ | `/^\/[a-z0-9\-\/{}]+$/` | Lowercase, plural nouns, kebab-case (e.g., `/payment-methods/{id}`) |
| `endpoints[].method` | `enum` | ✅ | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | HTTP method |
| `endpoints[].summary` | `string` | ✅ | 1–300 chars | Short description of the endpoint's purpose |
| `endpoints[].requires_idempotency` | `boolean` | ✅ | — | Enforce `Idempotency-Key` header for this endpoint |
| `endpoints[].pagination_strategy` | `enum` | ✅ | `cursor`, `offset`, `none` | Pagination model for list endpoints |
| `endpoints[].auth_scheme` | `enum` | ❌ | `bearer_jwt`, `api_key`, `oauth2_client_credentials`, `none` | Auth scheme override per endpoint. Defaults to `bearer_jwt`. |
| `endpoints[].rate_limit_tier` | `enum` | ❌ | `standard`, `elevated`, `unlimited` | Rate limit tier. Defaults to `standard`. |
| `endpoints[].deprecated` | `boolean` | ❌ | — | Mark endpoint as deprecated. Will inject `Deprecation` + `Sunset` headers. |
| `endpoints[].sunset_date` | `string` | ❌ | ISO 8601 date (≥ 6 months from today) | Required if `deprecated: true`. |

---

## Enforcement Rules

### 1. Global Headers (Injected on All Endpoints)

| Header | Direction | Description |
|---|---|---|
| `X-Request-ID` | Request + Response | Correlation ID for distributed tracing. UUID v4 format. Required on all requests; echoed on all responses. |
| `X-Response-Time-Ms` | Response | Time taken to process the request in milliseconds. |
| `X-RateLimit-Limit` | Response | Maximum requests allowed in the current window. |
| `X-RateLimit-Remaining` | Response | Requests remaining in the current window. |
| `X-RateLimit-Reset` | Response | Unix timestamp when the rate limit window resets. |

### 2. Idempotency Enforcement

When `requires_idempotency: true` (or when method is `POST` or `PUT`):
- `Idempotency-Key` request header is **required** (format: UUID v4).
- The server must store the idempotency key and its associated response for a minimum TTL of **24 hours**.
- If the same `Idempotency-Key` is received within the TTL, return the **original response** (do not re-execute).
- If a different body is sent with an existing `Idempotency-Key`, return `422 Unprocessable Entity` with error code `IDEMPOTENCY_KEY_REUSE`.
- Idempotency keys must be scoped per-user (a key from User A cannot collide with User B's key of the same value).

### 3. Authentication Schemes

| Scheme | Use Case | Notes |
|---|---|---|
| `bearer_jwt` | Default. Human users, server-to-server via OIDC | JWTs must be validated: signature, `exp`, `nbf`, `iss`, `aud`. Reject `alg: none` explicitly. |
| `oauth2_client_credentials` | Machine-to-machine (M2M) | Use when the caller is a service without a human identity. Token endpoint must use mTLS client authentication where possible. |
| `api_key` | Simple integrations, webhooks | API key must be passed via `X-API-Key` header (not query parameter — query params appear in server logs). API keys must be hashed (SHA-256) before storage — never store plaintext. |
| `none` | Public endpoints only | Must be explicitly justified. Public endpoints must still have rate limiting applied. |

### 4. Error Format: RFC 7807 + Machine-Readable Code

All error responses must conform to RFC 7807 (Problem Details for HTTP APIs):

```json
{
  "type": "https://api.yourdomain.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The 'amount' field must be a positive integer.",
  "instance": "/payment-requests/create",
  "error_code": "VALIDATION_FAILED",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-23T14:00:00Z"
}
```

**Mandatory fields:** `type`, `title`, `status`, `detail`, `error_code`, `request_id`, `timestamp`  
**`error_code`** must be UPPER_SNAKE_CASE and machine-parseable by clients for programmatic error handling.

**Standard Error Code Taxonomy:**

| HTTP Status | `error_code` | Scenario |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed syntax |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `UNAUTHORIZED` | Valid token but insufficient permissions |
| 404 | `RESOURCE_NOT_FOUND` | Entity does not exist |
| 409 | `CONFLICT` | Duplicate resource or conflicting state |
| 422 | `VALIDATION_FAILED` | Valid syntax, failed business rule validation |
| 422 | `IDEMPOTENCY_KEY_REUSE` | Same idempotency key with different body |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit hit; include `Retry-After` header |
| 503 | `SERVICE_UNAVAILABLE` | Circuit breaker open; include `Retry-After` header |

### 5. Pagination Contracts

**When to use which strategy:**

| Strategy | Best For | Trade-offs |
|---|---|---|
| `cursor` | High-volume, real-time feeds, infinite scroll | ✅ Consistent results during concurrent writes; ✅ No offset drift; ❌ Cannot jump to page N |
| `offset` | Admin UIs, reports, small datasets | ✅ Random page access; ❌ Drift risk when items inserted/deleted mid-pagination; ❌ DB performance degrades at high offsets (OFFSET 10000 is slow) |
| `none` | Endpoints returning a fixed, small, bounded result | Only acceptable if max result count is hard-limited in the spec (≤ 100 items) |

**Cursor Pagination Response Schema:**
```json
{
  "data": [...],
  "pagination": {
    "has_next_page": true,
    "has_previous_page": false,
    "next_cursor": "eyJpZCI6MTAwMH0=",
    "previous_cursor": null
  }
}
```

**Offset Pagination Response Schema:**
```json
{
  "data": [...],
  "pagination": {
    "total": 1523,
    "page": 3,
    "page_size": 50,
    "total_pages": 31
  }
}
```

**Hard limits:** Always enforce a server-side `max_page_size` (e.g., 100). Never allow the client to request unbounded results.

### 6. API Versioning Strategy

**Default**: URL prefix versioning (`/v1/resources`).  
**Rationale**: URL versioning is explicit, loggable, and proxy-friendly. Header versioning (`Accept-Version`) is harder to cache and debug.

**Breaking vs. Additive changes:**
- Adding new optional fields → additive, no version bump
- Adding new endpoints → additive, no version bump
- Adding new enum values → **breaking** (clients may not handle unknown values); version bump required
- Removing or renaming fields → **breaking**; version bump required
- Changing field types → **breaking**; version bump required

**Deprecation Lifecycle:**
- Minimum sunset period: **6 months** from the `Deprecation` header date.
- Required response headers for deprecated endpoints:
  ```
  Deprecation: true
  Sunset: Sat, 23 Oct 2026 00:00:00 GMT
  Link: <https://api.yourdomain.com/v2/resources>; rel="successor-version"
  ```

### 7. Rate Limiting Policy

| Tier | Requests/min | Burst Allowance | Algorithm |
|---|---|---|---|
| `standard` | 60 | Up to 10 additional | Token bucket |
| `elevated` | 600 | Up to 50 additional | Token bucket |
| `unlimited` | No limit | No limit | Only for internal service accounts |

**Rate limit exceeded response (429):**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1714000000
Retry-After: 47
Content-Type: application/problem+json
```

### 8. CORS Policy

```yaml
# Generated CORS configuration for OpenAPI spec
cors:
  allowedOrigins:
    - "https://app.yourdomain.com"  # Explicit allowlist — never use "*" in production
  allowedMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
  allowedHeaders: [Authorization, Content-Type, X-Request-ID, Idempotency-Key, X-API-Key]
  exposedHeaders: [X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, Deprecation, Sunset]
  allowCredentials: true
  maxAge: 86400  # Preflight cache: 24 hours
```

**Rule**: CORS `allowedOrigins: ["*"]` is a hard blocker in production. It disables cookie-based authentication and exposes APIs to cross-site request forgery risks.

### 9. Webhook Pattern (when applicable)

If the API emits events via webhooks, the spec must include:
- **Delivery guarantee**: At-least-once delivery with idempotent consumers expected.
- **Payload signing**: Each webhook payload must include an `X-Webhook-Signature` header (HMAC-SHA256 of the payload using a per-consumer secret).
- **Retry policy**: Exponential backoff — retry at 30s, 5min, 30min, 2h, 24h. After 24h of failures, mark the endpoint as inactive.
- **Verification endpoint**: Provide a `/webhooks/verify` endpoint for consumers to test their receiving infrastructure.

---

## Output Contract

The skill produces a valid OpenAPI 3.1.0 specification in YAML format, structured as follows:

```
openapi: 3.1.0
info:
  title: [title]
  version: [version]
  description: ...
servers:
  - url: https://api.yourdomain.com/v[major]
security:
  - BearerJWT: []
components:
  securitySchemes: [all schemes from input]
  headers: [X-Request-ID, X-RateLimit-*, Deprecation, Sunset]
  responses: [standardised error responses]
  schemas: [RFC 7807 ProblemDetail schema]
paths:
  [each endpoint with: parameters, requestBody, responses including 200, 400, 401, 403, 422, 429, 503]
```

**Quality gates before the spec is returned:**
- [ ] All paths are unique (no duplicate method+path combinations)
- [ ] All `$ref` references resolve within the document
- [ ] Every `POST`/`PUT` has `Idempotency-Key` in required headers
- [ ] Every list endpoint has a `pagination` response schema
- [ ] Every deprecated endpoint has `Deprecation` + `Sunset` headers
- [ ] `error_code` is defined for all non-2xx responses
- [ ] Rate limit response headers present on all `429` responses