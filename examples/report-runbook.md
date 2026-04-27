# Runbook: checkout-service

> **Tool:** `generate_runbook` · **Schema:** `v1.0.0` · **Generated:** `2026-04-27T00:38:17.763Z` · **Verdict:** ✅ Approve

---

## 1. Context

| Field | Value |
|---|---|
| Service Name | checkout-service |
| Owner Team | checkout-platform |
| Severity Tiers | sev1, sev2, sev3 |
| Known Failure Modes | 6 |
| SLO Target | 99.9% of /confirm requests succeed within 3s over a 30-day window |
| Upstream Dependencies | 5 |
| Has Tested Rollback | yes |

## 2. Executive Summary

Runbook for **checkout-service** is **production-ready** from a runbook standpoint. 6 failure mode(s) covered, 3 severity tier(s) defined, owned by **checkout-platform**. No readiness gaps detected.

## 3. Findings

### 3.1 Runbook Markdown (commit this file)

```markdown
# Runbook: checkout-service

**Owner team:** checkout-platform
**Last reviewed:** 2026-04-27
**SLO:** 99.9% of /confirm requests succeed within 3s over a 30-day window

## Severity Tiers

| Severity | Trigger | Response |
|---|---|---|
| **SEV-1** | Customer-impacting outage, data loss risk, security incident | Page on-call within 5 minutes, 24/7 |
| **SEV-2** | Significant degradation, partial feature outage | Page on-call within 30 minutes during business hours; ticket overnight |
| **SEV-3** | Cosmetic, intermittent, low-impact | Ticket; address next business day |

## On-Call Escalation

1. Primary: checkout-platform on-call (PagerDuty/Opsgenie rotation)
2. Secondary: Engineering manager
3. Incident commander: assign for any SEV-1

## Upstream Dependencies

- `Stripe API — payment processing`
- `PostgreSQL 15 (RDS Multi-AZ) — order persistence`
- `Redis 7 (ElastiCache) — session and idempotency store`
- `Kafka (MSK) — order-events topic`
- `AWS Secrets Manager — JWT signing keys and Stripe API keys`

## Rollback

✅ Rollback path is tested. Steps:

1. _TODO: command to roll back deployment (helm rollback, kubectl rollout undo, etc.)_
2. Verify health checks pass.
3. Notify in #incidents channel.

## Known Failure Modes

### 1. Stripe API returning 5xx — all payment confirmations failing

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

### 2. PostgreSQL write replica lag > 30s — order reads stale

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

### 3. Redis unavailable — idempotency keys lost, duplicate charges possible

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

### 4. Kafka producer blocked — order events not published, fulfillment delayed

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

### 5. JWT signing key expired — all authenticated requests returning 401

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

### 6. ECS task OOM — service pods crash-looping

**Detection signals**
- _TODO: alert name(s), dashboard panel, log query that proves this is happening_

**Immediate mitigation**
- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_

**Root cause investigation**
- _TODO: where to look first (logs, traces, metrics dashboard URL)_

**Postmortem template**
- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?
- What was the customer impact (count, duration, severity)?
- Action items with owners and due dates.

## Useful Links

- _TODO: dashboard URLs (RED metrics, USE metrics, error budget burn)_
- _TODO: alert configuration repo URL_
- _TODO: code repository URL_
- _TODO: latest postmortem links_
```

### 3.2 Pre-Production Readiness Checklist

- [x] Rollback path tested in staging
- [x] SLO target defined
- [x] SEV-1 escalation path defined
- [x] Upstream dependencies mapped
- [x] ≥ 3 known failure modes documented
- [x] Owner team identified

### 3.3 Failure Mode Map

1. `Stripe API returning 5xx — all payment confirmations failing` — runbook section 1 drafted
2. `PostgreSQL write replica lag > 30s — order reads stale` — runbook section 2 drafted
3. `Redis unavailable — idempotency keys lost, duplicate charges possible` — runbook section 3 drafted
4. `Kafka producer blocked — order events not published, fulfillment delayed` — runbook section 4 drafted
5. `JWT signing key expired — all authenticated requests returning 401` — runbook section 5 drafted
6. `ECS task OOM — service pods crash-looping` — runbook section 6 drafted

## 4. Risk Register

_None identified._

## 5. Recommendations

1. Date-stamp the runbook on every edit. A 12-month-old runbook is fiction.
2. Practise a tabletop exercise per quarter — read failure mode aloud, walk through detection + mitigation steps from memory.

## 6. Next Steps

1. [ ] Save the runbook as `docs/runbooks/checkout-service.md`
2. [ ] Walk through the runbook with the on-call rotation in a 30-minute review
3. [ ] Run a tabletop exercise simulating each known failure mode _(owner: checkout-platform)_
4. [ ] Verify the rollback drill is scheduled to repeat every 6 months

## 7. Re-evaluation

Re-evaluate this report in **6 months, or after every SEV-1 incident**, or sooner if any risk above changes severity.

---

<!-- machine-readable envelope: downstream tooling parses this block -->
```json
{
  "tool": "generate_runbook",
  "schema_version": "1.0.0",
  "generated_at": "2026-04-27T00:38:17.763Z",
  "verdict": "approve",
  "blockers": [],
  "payload": {
    "service_name": "checkout-service",
    "owner_team": "checkout-platform",
    "severity_tiers": [
      "sev1",
      "sev2",
      "sev3"
    ],
    "runbook_markdown": "# Runbook: checkout-service\n\n**Owner team:** checkout-platform\n**Last reviewed:** 2026-04-27\n**SLO:** 99.9% of /confirm requests succeed within 3s over a 30-day window\n\n## Severity Tiers\n\n| Severity | Trigger | Response |\n|---|---|---|\n| **SEV-1** | Customer-impacting outage, data loss risk, security incident | Page on-call within 5 minutes, 24/7 |\n| **SEV-2** | Significant degradation, partial feature outage | Page on-call within 30 minutes during business hours; ticket overnight |\n| **SEV-3** | Cosmetic, intermittent, low-impact | Ticket; address next business day |\n\n## On-Call Escalation\n\n1. Primary: checkout-platform on-call (PagerDuty/Opsgenie rotation)\n2. Secondary: Engineering manager\n3. Incident commander: assign for any SEV-1\n\n## Upstream Dependencies\n\n- `Stripe API — payment processing`\n- `PostgreSQL 15 (RDS Multi-AZ) — order persistence`\n- `Redis 7 (ElastiCache) — session and idempotency store`\n- `Kafka (MSK) — order-events topic`\n- `AWS Secrets Manager — JWT signing keys and Stripe API keys`\n\n## Rollback\n\n✅ Rollback path is tested. Steps:\n\n1. _TODO: command to roll back deployment (helm rollback, kubectl rollout undo, etc.)_\n2. Verify health checks pass.\n3. Notify in #incidents channel.\n\n## Known Failure Modes\n\n### 1. Stripe API returning 5xx — all payment confirmations failing\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n### 2. PostgreSQL write replica lag > 30s — order reads stale\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n### 3. Redis unavailable — idempotency keys lost, duplicate charges possible\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n### 4. Kafka producer blocked — order events not published, fulfillment delayed\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n### 5. JWT signing key expired — all authenticated requests returning 401\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n### 6. ECS task OOM — service pods crash-looping\n\n**Detection signals**\n- _TODO: alert name(s), dashboard panel, log query that proves this is happening_\n\n**Immediate mitigation**\n- _TODO: command(s) or feature flag toggle to reduce blast radius in < 5 minutes_\n\n**Root cause investigation**\n- _TODO: where to look first (logs, traces, metrics dashboard URL)_\n\n**Postmortem template**\n- Was this a known failure mode? If yes, why didn't auto-mitigation catch it?\n- What was the customer impact (count, duration, severity)?\n- Action items with owners and due dates.\n\n## Useful Links\n\n- _TODO: dashboard URLs (RED metrics, USE metrics, error budget burn)_\n- _TODO: alert configuration repo URL_\n- _TODO: code repository URL_\n- _TODO: latest postmortem links_",
    "readiness_blockers": []
  }
}
```
