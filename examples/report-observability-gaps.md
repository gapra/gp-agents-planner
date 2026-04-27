# Observability Gap Analysis: checkout-service

> **Tool:** `analyze_observability_gaps` · **Schema:** `v1.0.0` · **Generated:** `2026-04-27T00:38:17.758Z` · **Verdict:** 🚫 Reject

---

## 1. Context

| Field | Value |
|---|---|
| Service Name | checkout-service |
| Current Signals | logs |
| SLO Targets | 0 |
| Critical User Journeys | 2 |
| Alert Count | 0 |
| Deployment Model | self_hosted |

## 2. Executive Summary

**checkout-service** is **not production-ready** — required signals are missing. Missing required signal type(s): **metrics, traces** — these are release blockers. 2 critical user journey(s) identified ("Guest adds item to cart → enters payment → order confirmed"; "Logged-in user applies promo code → sees discounted total → completes purchase") — each requires a dedicated synthetic probe and deadman's-switch alert. 5 risk(s) identified — see Risk Register.

## 3. Findings

### 3.1 Pillar Coverage

| Pillar | Status | Notes |
|---|---|---|
| Structured Logging (JSON, with trace_id) | ✅ satisfied | Verify logs are JSON, include trace_id, and exclude PII. |
| Metrics — RED (Rate, Errors, Duration) | ❌ missing | No metric signal declared — cannot define SLOs or burn-rate alerts. |
| Distributed Tracing (W3C TraceContext) | ❌ missing | No trace signal declared — cross-service incident debugging will be guesswork. |
| SLO Definition | ❌ missing | No SLOs declared — alerts will be cause-based not symptom-based; expect alert fatigue. |
| Critical User Journey Tracing | ✅ satisfied | 2 critical journey(s) identified. |
| Symptom-based Alerting | ❌ missing | Zero alerts configured — outages will be detected by users, not by your team. |

### 3.2 Missing Signal Types

**Missing required signals:**
- ❌ `metrics` — required by the Observability Mandate
- ❌ `traces` — required by the Observability Mandate

**Missing recommended signals:**
- ⚠️ `events` — strongly recommended for production services
- ⚠️ `profiling` — strongly recommended for production services

### 3.3 SLO & Alert Health

_No SLOs declared._ Define at least one before going to production.

### 3.4 Recommended Instrumentation Plan

1. **Metrics:** Emit Prometheus/OTel metrics: `requests_total{method, route, status}` (counter), `request_duration_seconds{method, route}` (histogram with default buckets).

2. **Traces:** Initialise OTel tracer SDK; inject + extract W3C TraceContext on every inbound + outbound call. Ensure DB/queue/HTTP clients auto-instrument.

3. **SLO:** Pick one SLI (e.g., availability) and one target (e.g., 99.9% over 30 days). Add fast-burn (1h, 14.4× rate) and slow-burn (6h, 6× rate) alerts.

4. **Journey instrumentation:** For each of the 2 critical journey(s), add a synthetic probe + a deadman's-switch alert.

## 4. Risk Register

| ID | Severity | Description | Mitigation |
|---|---|---|---|
| `OBS-NO-METRICS` | 🚫 Blocker | No metric signal declared — SLOs and burn-rate alerts cannot be defined. | Emit Prometheus/OpenTelemetry RED metrics per endpoint with latency histograms. |
| `OBS-NO-TRACES` | 🔴 High | No trace signal — cross-service incident debugging is guesswork. | Adopt OpenTelemetry tracing; propagate trace_id across every outbound call. |
| `OBS-NO-SLO` | 🔴 High | No SLOs declared — alerts cannot be tied to user-facing impact. | Define at least one SLO (availability, latency) with a 30-day window and burn-rate alerts. |
| `OBS-NO-ALERTS` | 🔴 High | Zero alerts configured — outages will be detected by users, not by you. | At minimum: error-rate alert + latency-burn-rate alert per critical user journey. |
| `OBS-JOURNEY-NO-TRACE` | 🔴 High | Critical user journeys declared but no tracing — cannot diagnose journey failures. | Add distributed tracing before declaring any production-grade SLO on a journey. |

## 5. Recommendations

1. Treat missing required signals as a release blocker — do not promote to production until all three are present.
2. Define SLOs before alerts. An alert without an SLO is a cause alarm, not a symptom alarm — the wrong default.
3. Run a quarterly 'observability gameday' — inject a fault and verify alerts fire and dashboards show the cause.

## 6. Next Steps

1. [ ] Create one ticket per missing required signal
2. [ ] Define a deadman's-switch alert per critical user journey
3. [ ] Add SLO burn-rate alerts (1h fast burn + 6h slow burn) for every SLO
4. [ ] Schedule a 'gameday' to verify alerts actually fire under simulated failure

## 7. Re-evaluation

Re-evaluate this report in **3 months, or after any major architecture change**, or sooner if any risk above changes severity.

---

<!-- machine-readable envelope: downstream tooling parses this block -->
```json
{
  "tool": "analyze_observability_gaps",
  "schema_version": "1.0.0",
  "generated_at": "2026-04-27T00:38:17.758Z",
  "verdict": "reject",
  "blockers": [
    "OBS-NO-METRICS"
  ],
  "payload": {
    "missing_required_signals": [
      "metrics",
      "traces"
    ],
    "missing_recommended_signals": [
      "events",
      "profiling"
    ],
    "pillars": [
      {
        "pillar": "Structured Logging (JSON, with trace_id)",
        "satisfied": true,
        "notes": [
          "Verify logs are JSON, include trace_id, and exclude PII."
        ]
      },
      {
        "pillar": "Metrics — RED (Rate, Errors, Duration)",
        "satisfied": false,
        "notes": [
          "No metric signal declared — cannot define SLOs or burn-rate alerts."
        ]
      },
      {
        "pillar": "Distributed Tracing (W3C TraceContext)",
        "satisfied": false,
        "notes": [
          "No trace signal declared — cross-service incident debugging will be guesswork."
        ]
      },
      {
        "pillar": "SLO Definition",
        "satisfied": false,
        "notes": [
          "No SLOs declared — alerts will be cause-based not symptom-based; expect alert fatigue."
        ]
      },
      {
        "pillar": "Critical User Journey Tracing",
        "satisfied": true,
        "notes": [
          "2 critical journey(s) identified."
        ]
      },
      {
        "pillar": "Symptom-based Alerting",
        "satisfied": false,
        "notes": [
          "Zero alerts configured — outages will be detected by users, not by your team."
        ]
      }
    ],
    "blockers": [
      "OBS-NO-METRICS"
    ]
  }
}
```
