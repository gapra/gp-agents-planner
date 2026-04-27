# ADR-0012: Adopt event sourcing for the order aggregate

> **Tool:** `generate_adr` · **Schema:** `v1.0.0` · **Generated:** `2026-04-27T00:38:17.760Z` · **Verdict:** ✅ Approve

---

## 1. Context

| Field | Value |
|---|---|
| ADR ID | ADR-0012 |
| Status | proposed |
| Reversibility | one_way_door |
| Options Considered | 3 |
| Consequences Listed | 6 |
| Suggested Filename | docs/adr/0012-adopt-event-sourcing-for-the-order-aggregate.md |

## 2. Executive Summary

ADR for **Adopt event sourcing for the order aggregate** is **ready to commit**. 3 option(s) compared, 6 consequence(s) recorded, reversibility **one way_door**. Decision text references at least one of the considered options.

## 3. Findings

### 3.1 ADR Markdown (commit this file)

```markdown
# ADR-0012: Adopt event sourcing for the order aggregate

- **Status:** Proposed
- **Reversibility:** One-way door (irreversible without significant cost)
- **Date:** 2026-04-27

## Context

The order domain currently stores only the latest state (CRUD model). Three production incidents in the past quarter required forensic reconstruction of how an order reached a disputed state, taking 2–3 days to resolve. The team is also asked to build a real-time activity feed. Both requirements — immutable audit trail and event-driven projections — are natural fits for event sourcing. We evaluated simpler alternatives before committing because event sourcing adds operational complexity.

## Options Considered

### Option: Event Sourcing (EventStoreDB)

**Pros**
  - ✅ Immutable audit log by design — disputes resolved in minutes not days
  - ✅ Temporal queries: reconstruct order state at any point in time
  - ✅ Activity feed is a projection, not extra storage
  - ✅ Decouples read models from write model — each team owns its projection

**Cons**
  - ❌ Eventual consistency between write model and read projections
  - ❌ Event schema versioning discipline required (upcasters)
  - ❌ Snapshot strategy needed once event streams exceed ~1000 events/aggregate
  - ❌ Team has no prior EventStoreDB production experience

### Option: Append-only audit table (PostgreSQL)

**Pros**
  - ✅ No new infrastructure — runs on existing DB
  - ✅ Familiar SQL tooling for queries
  - ✅ Strong consistency with main orders table via transaction

**Cons**
  - ❌ Audit table is a side effect — risk of missing events on code paths that forget to write
  - ❌ Not a first-class event log: projections require custom ETL
  - ❌ Does not solve the activity feed without significant extra work

### Option: Change Data Capture (Debezium + Kafka)

**Pros**
  - ✅ Zero application-level changes to capture state transitions
  - ✅ Kafka topic acts as event stream for downstream consumers

**Cons**
  - ❌ Captures DB state diffs, not business intent — events lack semantic meaning
  - ❌ Schema changes in PostgreSQL can silently break CDC consumers
  - ❌ Two extra infrastructure components to operate

## Decision

We chose Event Sourcing (EventStoreDB) because the immutable audit trail and projection model directly solve our two core pain points. Operational complexity is accepted and mitigated by a 4-week spike before full rollout.

## Consequences

- All writes to the order aggregate go through an append-only event stream — no direct UPDATE or DELETE on order state
- Read models (REST API responses, dashboards) are projections rebuilt from the event stream
- Projection lag communicated to UI team: eventual consistency of up to 500ms is acceptable per product agreement
- Every event type requires schema registration in the event registry before deployment
- Snapshot strategy must be implemented before order event stream reaches 500 events/aggregate in production
- On-call engineers must be trained on EventStoreDB operations before go-live

## Related

_None._
```

### 3.2 Options Comparison

| Option | # Pros | # Cons | Status |
|---|---|---|---|
| **Event Sourcing (EventStoreDB)** | 4 | 4 | ✅ chosen |
| **Append-only audit table (PostgreSQL)** | 3 | 3 | — |
| **Change Data Capture (Debezium + Kafka)** | 2 | 3 | — |

### 3.3 Quality Checklist

- [x] At least 2 options compared
- [x] Decision text names the chosen option
- [x] At least one consequence listed
- [x] If one-way door, ≥ 3 consequences documented
- [x] Every option has at least one pro or con

## 4. Risk Register

_None identified._

## 5. Recommendations

1. For a one-way door decision, add a 'Reversal Cost' subsection estimating effort/time to undo.
2. Link the originating RFC, JIRA epic, or feasibility report so reviewers have full context.
3. Keep this ADR immutable after merge — supersede with a new ADR rather than editing.

## 6. Next Steps

1. [ ] Save the ADR markdown as `docs/adr/0012-adopt-event-sourcing-for-the-order-aggregate.md`
2. [ ] Open a PR and request review from the architecture council
3. [ ] Link this ADR from the implementing JIRA ticket / RFC
4. [ ] Schedule a 30-minute review with at least two senior engineers BEFORE merging

## 7. Re-evaluation

Re-evaluate this report in **12 months, or sooner if any consequence above changes status**, or sooner if any risk above changes severity.

---

<!-- machine-readable envelope: downstream tooling parses this block -->
```json
{
  "tool": "generate_adr",
  "schema_version": "1.0.0",
  "generated_at": "2026-04-27T00:38:17.760Z",
  "verdict": "approve",
  "blockers": [],
  "payload": {
    "adr_id": "ADR-0012",
    "filename": "0012-adopt-event-sourcing-for-the-order-aggregate.md",
    "status": "proposed",
    "reversibility": "one_way_door",
    "chosen_option_present": true,
    "options_count": 3,
    "consequences_count": 6,
    "adr_markdown": "# ADR-0012: Adopt event sourcing for the order aggregate\n\n- **Status:** Proposed\n- **Reversibility:** One-way door (irreversible without significant cost)\n- **Date:** 2026-04-27\n\n## Context\n\nThe order domain currently stores only the latest state (CRUD model). Three production incidents in the past quarter required forensic reconstruction of how an order reached a disputed state, taking 2–3 days to resolve. The team is also asked to build a real-time activity feed. Both requirements — immutable audit trail and event-driven projections — are natural fits for event sourcing. We evaluated simpler alternatives before committing because event sourcing adds operational complexity.\n\n## Options Considered\n\n### Option: Event Sourcing (EventStoreDB)\n\n**Pros**\n  - ✅ Immutable audit log by design — disputes resolved in minutes not days\n  - ✅ Temporal queries: reconstruct order state at any point in time\n  - ✅ Activity feed is a projection, not extra storage\n  - ✅ Decouples read models from write model — each team owns its projection\n\n**Cons**\n  - ❌ Eventual consistency between write model and read projections\n  - ❌ Event schema versioning discipline required (upcasters)\n  - ❌ Snapshot strategy needed once event streams exceed ~1000 events/aggregate\n  - ❌ Team has no prior EventStoreDB production experience\n\n### Option: Append-only audit table (PostgreSQL)\n\n**Pros**\n  - ✅ No new infrastructure — runs on existing DB\n  - ✅ Familiar SQL tooling for queries\n  - ✅ Strong consistency with main orders table via transaction\n\n**Cons**\n  - ❌ Audit table is a side effect — risk of missing events on code paths that forget to write\n  - ❌ Not a first-class event log: projections require custom ETL\n  - ❌ Does not solve the activity feed without significant extra work\n\n### Option: Change Data Capture (Debezium + Kafka)\n\n**Pros**\n  - ✅ Zero application-level changes to capture state transitions\n  - ✅ Kafka topic acts as event stream for downstream consumers\n\n**Cons**\n  - ❌ Captures DB state diffs, not business intent — events lack semantic meaning\n  - ❌ Schema changes in PostgreSQL can silently break CDC consumers\n  - ❌ Two extra infrastructure components to operate\n\n## Decision\n\nWe chose Event Sourcing (EventStoreDB) because the immutable audit trail and projection model directly solve our two core pain points. Operational complexity is accepted and mitigated by a 4-week spike before full rollout.\n\n## Consequences\n\n- All writes to the order aggregate go through an append-only event stream — no direct UPDATE or DELETE on order state\n- Read models (REST API responses, dashboards) are projections rebuilt from the event stream\n- Projection lag communicated to UI team: eventual consistency of up to 500ms is acceptable per product agreement\n- Every event type requires schema registration in the event registry before deployment\n- Snapshot strategy must be implemented before order event stream reaches 500 events/aggregate in production\n- On-call engineers must be trained on EventStoreDB operations before go-live\n\n## Related\n\n_None._"
  }
}
```
