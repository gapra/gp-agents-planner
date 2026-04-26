# Skill: Generate Operational Runbook

## Metadata

**Tool Name:** `generate_runbook`
**Description:** Produces an operational runbook scaffold for a service:
severity tiers, on-call escalation, upstream dependencies, rollback
procedure, and one section per known failure mode (detection + mitigation +
investigation + postmortem template). Verdict reflects production-readiness
based on inputs (rollback tested? SLO defined? failure modes mapped?).

---

## Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `service_name` | `string` | ✅ | Service / feature the runbook covers |
| `owner_team` | `string` | ✅ | Owning team — root of escalation |
| `severity_tiers` | `enum[]` | ✅ | 1–3 of `sev1`, `sev2`, `sev3` |
| `known_failure_modes` | `string[]` | ✅ | 1–20 named failure modes |
| `slo_target` | `string` | ❌ | e.g., `99.9% availability over 30d` |
| `upstream_dependencies` | `string[]` | ❌ | Max 20 |
| `has_tested_rollback` | `boolean` | ❌ | Defaults to `false`. **`false` is a release blocker.** |

---

## Severity Tier Definitions

| Tier | Trigger | Response |
|---|---|---|
| **SEV-1** | Customer-impacting outage, data loss risk, security incident | Page on-call within 5 min, 24/7 |
| **SEV-2** | Significant degradation, partial feature outage | Page within 30 min business hours; ticket overnight |
| **SEV-3** | Cosmetic, intermittent, low-impact | Ticket; address next business day |

---

## Risks Surfaced

| ID | Trigger | Severity |
|---|---|---|
| `RUNBOOK-NO-ROLLBACK-DRILL` | `has_tested_rollback = false` | 🚫 Blocker |
| `RUNBOOK-NO-SLO` | `slo_target` missing | 🔴 High |
| `RUNBOOK-NO-DEPS` | No upstream dependencies declared | 🟡 Medium |
| `RUNBOOK-FEW-FAILURE-MODES` | Fewer than 3 failure modes | 🟡 Medium |
| `RUNBOOK-NO-SEV1` | No SEV-1 tier defined | 🟡 Medium |

---

## Output

Standard 7-section templated report. Findings include:

- **3.1 Runbook Markdown** — ready to commit as `docs/runbooks/<service>.md`. Contains:
  - Severity tier table
  - On-call escalation chain
  - Upstream dependency list
  - Rollback procedure (or warning if untested)
  - One detailed section per known failure mode
  - Useful links checklist
- **3.2 Pre-Production Readiness Checklist** — 6 boolean checks
- **3.3 Failure Mode Map** — drafted sections enumerated

JSON envelope `payload.runbook_markdown` contains the full ready-to-commit
markdown for downstream tooling to write to disk.

---

## When to use

- Before any service goes to production
- After every SEV-1 incident (re-evaluate trigger)
- Quarterly as part of on-call hygiene
- When a service changes ownership
