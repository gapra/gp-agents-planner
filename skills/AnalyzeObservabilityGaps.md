# Skill: Analyze Observability Gaps

## Metadata

**Tool Name:** `analyze_observability_gaps`
**Description:** Evaluates a service against the FeatureArchitect Observability
Mandate (structured logs, RED metrics, distributed traces, SLOs, symptom-based
alerting). Identifies missing required signals, alert fatigue risk, and
produces a concrete instrumentation plan ordered by priority.

---

## Input Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `service_name` | `string` | ✅ | Service/component being assessed |
| `current_signals` | `enum[]` | ❌ | Subset of `logs`, `metrics`, `traces`, `events`, `profiling` |
| `slo_targets` | `array` | ❌ | Each: `{ name, target }` (e.g., `availability` → `99.9% over 30d`) |
| `critical_user_journeys` | `string[]` | ❌ | Max 20 |
| `alert_count` | `integer` | ❌ | Approximate number of currently configured alerts |
| `deployment_model` | `enum` | ❌ | `self_hosted`, `managed_cloud`, `serverless`, `edge` |

---

## Required vs Recommended Signals

| Signal | Tier | Why |
|---|---|---|
| `logs` | **Required** | Post-hoc incident analysis is impossible without them |
| `metrics` | **Required** | SLOs and burn-rate alerts cannot be defined without them |
| `traces` | **Required** | Cross-service incident debugging is guesswork without them |
| `events` | Recommended | Business KPIs, security audit trail |
| `profiling` | Recommended | Continuous CPU/memory diagnosis |

---

## Risks Surfaced

| ID | Trigger | Severity |
|---|---|---|
| `OBS-NO-LOGS` | `logs` not in `current_signals` | 🚫 Blocker |
| `OBS-NO-METRICS` | `metrics` not in `current_signals` | 🚫 Blocker |
| `OBS-NO-TRACES` | `traces` not in `current_signals` | 🔴 High |
| `OBS-NO-SLO` | `slo_targets.length === 0` | 🔴 High |
| `OBS-NO-ALERTS` | `alert_count === 0` | 🔴 High |
| `OBS-ALERT-FATIGUE` | `alert_count > 50` | 🟡 Medium |
| `OBS-SERVERLESS-NO-METRICS` | serverless + no metrics | 🔴 High |
| `OBS-JOURNEY-NO-TRACE` | journeys declared, no tracing | 🔴 High |

---

## Output

Standard 7-section templated report. Findings include:

- **3.1 Pillar Coverage** — 6 pillars (logging, metrics, tracing, SLO, journey tracing, alerting) with satisfied/missing status
- **3.2 Missing Signal Types** — required vs recommended split
- **3.3 SLO & Alert Health** — current SLO inventory
- **3.4 Recommended Instrumentation Plan** — concrete, ordered steps

---

## When to use

- Before promoting a service to production
- After a SEV-1 incident where root cause was hard to identify
- Quarterly as part of operational hygiene
- When migrating to serverless / edge (cold-start signals matter)
