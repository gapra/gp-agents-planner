# Skill: Generate STRIDE Threat Model

## Metadata

**Tool Name:** `generate_threat_model`
**Description:** Produces a STRIDE-based threat model for a system or feature.
Scores each of the six STRIDE categories 0–10, lists recommended controls per
category, and surfaces compliance/auth/PII interactions as risk register
entries. Heuristic scoring — input drives the answer; this is a forcing
function for the security conversation, not a substitute for a human auditor.

---

## Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `system_name` | `string` | ✅ | Name of the system being modelled |
| `trust_boundaries` | `string[]` | ✅ | 1–20 items. Each crossing is a STRIDE candidate (e.g., `internet → public_api`) |
| `assets` | `array` | ✅ | 1–50 items. Each: `{ name, sensitivity: public/internal/confidential/restricted }` |
| `entry_points` | `string[]` | ✅ | 1–50 items. Where untrusted input enters |
| `authentication` | `enum` | ❌ | `bearer_jwt` (default), `oauth2`, `api_key`, `mtls`, `session_cookie`, `none` |
| `compliance_requirements` | `enum[]` | ❌ | `gdpr`, `pci_dss`, `hipaa`, `sox`, `iso27001`, `soc2` |
| `handles_pii` | `boolean` | ❌ | Defaults to `false`. When `true`, Information Disclosure scoring amplifies |

---

## STRIDE Categories Scored

| Category | What drives the score |
|---|---|
| **Spoofing** | Authentication scheme strength; entry point count |
| **Tampering** | Restricted asset count; trust boundary count |
| **Repudiation** | Compliance regime (SOX/HIPAA → mandatory audit) |
| **Information Disclosure** | PII handling × compliance regime |
| **Denial of Service** | Entry point count; presence of auth |
| **Elevation of Privilege** | Restricted asset presence; trust boundary count |

---

## Risk Mapping

| STRIDE score | Severity in risk register |
|---|---|
| 0–3 | 🟢 Low (no entry) |
| 4–6 | 🟡 Medium |
| 7–8 | 🔴 High |
| 9–10 | 🚫 Blocker |

---

## Output

Standard 7-section templated report. Findings include:

- **3.1 STRIDE Scorecard** — 6-row table + average
- **3.2 Trust Boundaries & Entry Points** — enumerated for review
- **3.3 Assets to Protect** — with handling badge per sensitivity
- **3.4 Per-Category Findings** — notes + recommended controls per STRIDE item

JSON envelope `payload.stride_scores` contains structured per-category data
for downstream tooling.

**Hard rule:** A STRIDE score ≥ 9 forces `verdict: "reject"`.

---

## When to use

- Before any new public API surface ships
- When sensitive data classification changes
- After any change to authentication or authorization
- Quarterly as part of security hygiene
