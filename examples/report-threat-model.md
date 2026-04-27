# Threat Model: checkout-service

> **Tool:** `generate_threat_model` · **Schema:** `v1.0.0` · **Generated:** `2026-04-27T00:38:17.761Z` · **Verdict:** 🟡 Approve with conditions

---

## 1. Context

| Field | Value |
|---|---|
| System Name | checkout-service |
| Authentication | bearer_jwt |
| Handles Pii | no |
| Trust Boundaries | 6 |
| Assets | 5 |
| Entry Points | 5 |

## 2. Executive Summary

Threat model for **checkout-service** passes with conditions — implement listed controls before exposure. STRIDE average score is **4.67/10** across 6 categories. 4 risk(s) require explicit owner and mitigation — see the Risk Register.

## 3. Findings

### 3.1 STRIDE Scorecard

| STRIDE Category | Score | Severity |
|---|---|---|
| Spoofing (Authentication) | 3/10 | 🟢 Low |
| Tampering (Integrity) | 6/10 | 🟡 Medium |
| Repudiation (Audit) | 4/10 | 🟡 Medium |
| Information Disclosure (Confidentiality) | 3/10 | 🟢 Low |
| Denial of Service (Availability) | 5/10 | 🟡 Medium |
| Elevation of Privilege (Authorization) | 7/10 | 🔴 High |
| **Average** | **4.67/10** | **🟡 Medium** |

### 3.2 Trust Boundaries & Entry Points

**Trust Boundaries** _(every crossing is a STRIDE candidate)_

1. `Public internet → API Gateway (TLS termination)`
2. `API Gateway → checkout-service (internal mTLS)`
3. `checkout-service → PostgreSQL (orders DB)`
4. `checkout-service → Stripe API (external payment processor)`
5. `checkout-service → Kafka (order-events topic)`
6. `checkout-service → Redis (session + idempotency store)`

**Entry Points** _(where untrusted input enters)_

1. `POST /v2/checkout/sessions — initiates a checkout session`
2. `POST /v2/checkout/sessions/{id}/confirm — charges card and creates order`
3. `GET /v2/orders/{id} — retrieves order by ID (auth required)`
4. `POST /v2/webhooks/stripe — receives payment events from Stripe (HMAC-signed)`
5. `GET /v2/checkout/sessions/{id}/status — polls session status (public, rate-limited)`

### 3.3 Assets to Protect

| Asset | Sensitivity | Handling |
|---|---|---|
| `Credit card PAN and CVV` | restricted | 🔴 Encrypt + audit + least privilege |
| `Customer PII (name, email, shipping address)` | confidential | 🟡 Encrypt + access controls |
| `Order records and payment amounts` | confidential | 🟡 Encrypt + access controls |
| `Promo codes and discount rules` | internal | 🟢 Standard access controls |
| `Session tokens (JWT)` | confidential | 🟡 Encrypt + access controls |

### 3.4 Per-Category Findings

#### Spoofing (Authentication) — 3/10

- Authentication scheme appears appropriate.

**Recommended controls:**
  - Validate iss, aud, exp, nbf; reject alg=none explicitly; rotate signing keys.

#### Tampering (Integrity) — 6/10

- 1 restricted asset(s) — tampering would be high-impact.
- 6 trust boundaries — every crossing is a tampering opportunity.

**Recommended controls:**
  - Enforce TLS 1.2+ on every transport.
  - Sign and version every persisted record.
  - Add row-level checksums or HMAC-signed payloads for restricted assets.

#### Repudiation (Audit) — 4/10

- Without immutable audit logs, users can deny actions they performed.

**Recommended controls:**
  - Log every state-changing action with: actor (hashed), action, target, timestamp, request_id.
  - Ship audit logs to an append-only store (e.g., AWS QLDB, immutable S3 bucket with object lock).

#### Information Disclosure (Confidentiality) — 3/10

- Information disclosure surface is bounded.

**Recommended controls:**
  - Encrypt sensitive fields at rest (envelope encryption with KMS).

#### Denial of Service (Availability) — 5/10

- Multiple entry points — coordinate rate-limit budgets to avoid amplification.

**Recommended controls:**
  - Enforce per-user/per-IP rate limits at the edge.
  - Set request body size limits (e.g., 1 MB default).
  - Add timeouts (connect + read separately) on every outbound call.

#### Elevation of Privilege (Authorization) — 7/10

- Restricted assets — IDOR or privilege bugs would be high-impact.
- Many trust boundaries — confused-deputy risk increases at each crossing.

**Recommended controls:**
  - Validate authorization at the resource level (per-record), not just at the route.
  - Adopt deny-by-default RBAC/ABAC; default routes return 403 unless explicitly allowed.
  - Add property-based tests asserting that user A cannot read/write user B's restricted resources.

## 4. Risk Register

| ID | Severity | Description | Mitigation |
|---|---|---|---|
| `STRIDE-TAMPERING-MED` | 🟡 Medium | Tampering (Integrity) scored 6/10. 1 restricted asset(s) — tampering would be high-impact. 6 trust boundaries — every crossing is a tampering opportunity. | Enforce TLS 1.2+ on every transport. Sign and version every persisted record. Add row-level checksums or HMAC-signed payloads for restricted assets. |
| `STRIDE-REPUDIATION-MED` | 🟡 Medium | Repudiation (Audit) scored 4/10. Without immutable audit logs, users can deny actions they performed. | Log every state-changing action with: actor (hashed), action, target, timestamp, request_id. Ship audit logs to an append-only store (e.g., AWS QLDB, immutable S3 bucket with object lock). |
| `STRIDE-DOS-MED` | 🟡 Medium | Denial of Service (Availability) scored 5/10. Multiple entry points — coordinate rate-limit budgets to avoid amplification. | Enforce per-user/per-IP rate limits at the edge. Set request body size limits (e.g., 1 MB default). Add timeouts (connect + read separately) on every outbound call. |
| `STRIDE-ELEVATION-HIGH` | 🔴 High | Elevation of Privilege (Authorization) scored 7/10. Restricted assets — IDOR or privilege bugs would be high-impact. Many trust boundaries — confused-deputy risk increases at each crossing. | Validate authorization at the resource level (per-record), not just at the route. Adopt deny-by-default RBAC/ABAC; default routes return 403 unless explicitly allowed. Add property-based tests asserting that user A cannot read/write user B's restricted resources. |

## 5. Recommendations

1. Address **Elevation of Privilege (Authorization)** first — it scored 7/10 and is the dominant risk.
2. Add the 3 highest-scoring categories to your security regression test suite.

## 6. Next Steps

1. [ ] Walk through each STRIDE finding with the security reviewer
2. [ ] Open one ticket per recommended control with severity matching the score
3. [ ] Add abuse-case tests to the test suite for the top 3 risks
4. [ ] Schedule a re-threat-model 6 months from now or after major architecture change

## 7. Re-evaluation

Re-evaluate this report in **6 months, or when authentication / data classification changes**, or sooner if any risk above changes severity.

---

<!-- machine-readable envelope: downstream tooling parses this block -->
```json
{
  "tool": "generate_threat_model",
  "schema_version": "1.0.0",
  "generated_at": "2026-04-27T00:38:17.761Z",
  "verdict": "approve_with_conditions",
  "blockers": [],
  "payload": {
    "overall_score": 4.67,
    "stride_scores": [
      {
        "category": "spoofing",
        "score": 3,
        "notes": [
          "Authentication scheme appears appropriate."
        ],
        "recommended_controls": [
          "Validate iss, aud, exp, nbf; reject alg=none explicitly; rotate signing keys."
        ]
      },
      {
        "category": "tampering",
        "score": 6,
        "notes": [
          "1 restricted asset(s) — tampering would be high-impact.",
          "6 trust boundaries — every crossing is a tampering opportunity."
        ],
        "recommended_controls": [
          "Enforce TLS 1.2+ on every transport.",
          "Sign and version every persisted record.",
          "Add row-level checksums or HMAC-signed payloads for restricted assets."
        ]
      },
      {
        "category": "repudiation",
        "score": 4,
        "notes": [
          "Without immutable audit logs, users can deny actions they performed."
        ],
        "recommended_controls": [
          "Log every state-changing action with: actor (hashed), action, target, timestamp, request_id.",
          "Ship audit logs to an append-only store (e.g., AWS QLDB, immutable S3 bucket with object lock)."
        ]
      },
      {
        "category": "info_disclosure",
        "score": 3,
        "notes": [
          "Information disclosure surface is bounded."
        ],
        "recommended_controls": [
          "Encrypt sensitive fields at rest (envelope encryption with KMS)."
        ]
      },
      {
        "category": "dos",
        "score": 5,
        "notes": [
          "Multiple entry points — coordinate rate-limit budgets to avoid amplification."
        ],
        "recommended_controls": [
          "Enforce per-user/per-IP rate limits at the edge.",
          "Set request body size limits (e.g., 1 MB default).",
          "Add timeouts (connect + read separately) on every outbound call."
        ]
      },
      {
        "category": "elevation",
        "score": 7,
        "notes": [
          "Restricted assets — IDOR or privilege bugs would be high-impact.",
          "Many trust boundaries — confused-deputy risk increases at each crossing."
        ],
        "recommended_controls": [
          "Validate authorization at the resource level (per-record), not just at the route.",
          "Adopt deny-by-default RBAC/ABAC; default routes return 403 unless explicitly allowed.",
          "Add property-based tests asserting that user A cannot read/write user B's restricted resources."
        ]
      }
    ],
    "blockers": []
  }
}
```
