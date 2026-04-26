# Skill: Generate Architecture Decision Record (ADR)

## Metadata

**Tool Name:** `generate_adr`
**Description:** Generates an ADR in Nygard format wrapped in the canonical
templated report. Captures the context that triggered the decision, the
options that were compared, the chosen decision, reversibility classification,
consequences, and links. Surfaces ADR quality issues (missing alternatives,
decision drift, under-documented one-way doors) as risk register entries.

---

## Input Contract

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `number` | `integer` | ✅ | 1–9999 | Sequential ADR number; rendered as `ADR-0042` |
| `title` | `string` | ✅ | 1–200 chars | Decision title in present tense |
| `status` | `enum` | ❌ | `proposed`, `accepted`, `deprecated`, `superseded` | Defaults to `proposed` |
| `context` | `string` | ✅ | 10–5000 chars | Business or technical context that triggered the decision |
| `options_considered` | `array` | ✅ | 2–6 items | Each item: `{ name, pros[], cons[] }` |
| `decision` | `string` | ✅ | 1–2000 chars | Chosen option + rationale, 1–3 sentences |
| `reversibility` | `enum` | ❌ | `one_way_door`, `two_way_door` | Defaults to `two_way_door` |
| `consequences` | `string[]` | ✅ | 1–20 items, each 1–500 chars | Both positive and negative outcomes |
| `related_links` | `string[]` | ❌ | Max 20 items | Links to RFCs, JIRA, related ADRs |

---

## Quality Gates Enforced

| Check | Severity if violated |
|---|---|
| At least 2 options compared | **Schema error** (rejected) |
| Decision text mentions one of the option names | **Medium** risk (`ADR-DECISION-DRIFT`) |
| If `one_way_door`, ≥ 3 consequences listed | **High** risk (`ADR-ONEWAY-UNDERDOC`) |
| Every option has at least one pro or con | **Low** risk (`ADR-EMPTY-OPTION`) |

---

## Output

The standard 7-section templated report. Findings include:

- **3.1 ADR Markdown** — ready to commit as `docs/adr/0042-<slug>.md`
- **3.2 Options Comparison** — table summarising pros/cons counts and the chosen option
- **3.3 Quality Checklist** — 5 boolean checks

The JSON envelope payload includes the full `adr_markdown`, suggested `filename`,
`reversibility`, and `chosen_option_present` flag for downstream pre-merge
gates.

**Verdict mapping:**

- `approve` — all quality checks pass
- `approve_with_conditions` — minor issues (decision drift, missing pros/cons)
- `needs_review` — status is `deprecated` or `superseded`
- `reject` — only on schema validation failure

---

## When to use

- After completing a `<thinking>` decision pass in any of the architect personas
- When the team makes any **one-way door** decision (mandatory)
- When recording any decision that future engineers will ask "why did we do it
  this way?"
