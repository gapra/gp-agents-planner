# Skill: Analyze Technical Feasibility

## Metadata

**Tool Name:** `analyze_technical_feasibility`  
**Description:** Evaluates implementation risks, potential tech debt, dependency conflicts, CVE exposure, license compliance, operational complexity, cloud lock-in, and performance characteristics of a proposed feature or library stack. Returns a structured risk report with a scored assessment across 8 dimensions, an executive summary, and concrete architectural recommendations.

---

## Input Contract

All fields are validated against the schema defined in `src/tools/schemas.ts`.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `proposed_stack` | `string[]` | ✅ | 1–50 items; each string 1–200 chars | List of libraries, frameworks, or services to evaluate (e.g., `["prisma@5.0.0", "bull@4.12.0", "aws-s3"]`) |
| `target_throughput` | `number` | ❌ | 1–1,000,000 | Expected Requests Per Second (RPS) at peak load |
| `data_consistency` | `enum` | ❌ | `strong` or `eventual` | Required consistency model for the feature |
| `runtime_environment` | `string` | ❌ | e.g., `"node20-alpine"`, `"lambda"`, `"k8s-x64"` | Target runtime environment; affects native addon and cold start analysis |
| `existing_stack` | `string[]` | ❌ | Max 50 items | Current production stack; used to detect conflicts and duplication |
| `compliance_requirements` | `enum[]` | ❌ | `gdpr`, `pci_dss`, `hipaa`, `sox`, `iso27001` | Applicable compliance frameworks; affects data handling and audit requirements |
| `deployment_model` | `enum` | ❌ | `self_hosted`, `managed_cloud`, `serverless`, `edge` | Target deployment model; affects operational complexity score |

---

## Evaluation Dimensions

The skill evaluates the proposed stack across **8 dimensions**. Each dimension is scored **0–10** (0 = no risk, 10 = critical risk).

### Dimension 1: Security Risk Score (0–10)

**What is evaluated:**
- CVE count and CVSS severity for each library and its transitive dependencies
- Availability of security patches (patched = lower risk than unpatched)
- Security disclosure policy quality (`SECURITY.md` presence, responsible disclosure process)
- Authentication and authorisation implications (e.g., does the library handle auth? Are defaults secure?)

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | No known CVEs; strong security policy; all recent CVEs patched within 48h of disclosure |
| 3–4 | 1–2 low-severity CVEs (CVSS < 4.0) with patches available |
| 5–6 | 1 medium-severity CVE (CVSS 4.0–6.9); patch available |
| 7–8 | 1 high-severity CVE (CVSS 7.0–8.9); or multiple medium CVEs without patches |
| 9–10 | Critical CVE (CVSS ≥ 9.0) without fix; or known active exploitation |

**Hard rule:** A security score ≥ 9 is a **hard blocker**. The component must not be used until the vulnerability is patched.

---

### Dimension 2: License Compatibility Score (0–10)

**What is evaluated:**
- SPDX license identifier for each dependency (direct and transitive)
- Compatibility with the project's license
- Copyleft contamination risk

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0 | All dependencies are permissive (MIT, Apache 2.0, BSD, ISC) |
| 2–3 | MPL 2.0 present (file-level copyleft; manageable) |
| 4–6 | LGPL present (dynamic linking acceptable; static linking is a blocker) |
| 8–9 | GPL 2.0/3.0 present (strong copyleft; proprietary software blocker) |
| 10 | AGPL 3.0 or SSPL present (SaaS blocker); or unlicensed code |

**Hard rule:** A license score ≥ 8 is a **hard blocker** for proprietary or SaaS products.

---

### Dimension 3: Maintenance & Sustainability Score (0–10)

**What is evaluated:**
- Time since last release
- Open critical issues count
- Active maintainer count (bus factor)
- Community health metrics (PR response time, OpenSSF Scorecard)
- Corporate backing vs. individual project

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | Released within 3 months; multiple maintainers; corporate backing; OpenSSF ≥ 7 |
| 3–4 | Released within 6 months; 2+ maintainers |
| 5–6 | Released 6–12 months ago; 1–2 maintainers; declining downloads |
| 7–8 | Released > 12 months ago; 1 maintainer; open critical issues |
| 9–10 | No releases > 24 months; maintainer unresponsive; marked deprecated |

---

### Dimension 4: Performance Risk Score (0–10)

**What is evaluated:**
- Throughput capability vs. `target_throughput` (if provided)
- P99 latency overhead added by the library
- Memory footprint (baseline + per-request)
- GC pressure (for Node.js: event loop blocking, synchronous operations, excessive allocations)
- Startup time impact (critical for serverless/Lambda)

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | No known performance concerns; benchmarks show capability at 2× target RPS |
| 3–4 | Minor overhead; tested capable at target RPS with headroom |
| 5–6 | Benchmarks show capability at target RPS but without headroom; optimisation required |
| 7–8 | Benchmarks indicate the library becomes a bottleneck at target RPS |
| 9–10 | Library is known to be incompatible with the required throughput (e.g., synchronous I/O at 10k RPS) |

---

### Dimension 5: Operational Complexity Score (0–10)

**What is evaluated:**
- Configuration surface area (number of required config parameters)
- Infrastructure requirements (does it require a sidecar, a specific managed service, a daemon?)
- Observability support (does it emit metrics, logs, and traces natively?)
- Debugging ergonomics (is the error output actionable? Are there debugging tools?)
- Upgrade path complexity (breaking changes between major versions)

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | Zero infrastructure requirements; minimal config; strong observability out-of-the-box |
| 3–4 | Minor config requirements; basic observability; clean upgrade path |
| 5–6 | Requires a managed service or sidecar; moderate config surface |
| 7–8 | Complex setup; requires specialised operational knowledge; opaque internals |
| 9–10 | Requires deep expertise to operate; poor observability; frequent breaking changes |

---

### Dimension 6: Cloud Lock-in Risk Score (0–10)

**What is evaluated:**
- Is the library tightly coupled to a specific cloud provider's APIs or services?
- Is there a portable alternative with equivalent functionality?
- What is the migration cost if the cloud provider changes pricing or deprecates the service?

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0 | Fully portable; cloud-agnostic; standard protocol (S3-compatible, PostgreSQL, etc.) |
| 2–3 | Primarily one cloud but abstraction layer exists (AWS SDK + LocalStack) |
| 5–6 | Tightly coupled to one cloud; migration requires significant refactoring |
| 8–9 | Vendor lock-in with no viable migration path (proprietary query language, etc.) |
| 10 | Single-vendor with proprietary data format and no export capability |

---

### Dimension 7: Backward Compatibility Risk Score (0–10)

**What is evaluated:**
- How frequently does the library introduce breaking changes between major versions?
- Are breaking changes well-documented with migration guides?
- Does upgrading this library risk breaking downstream consumers?
- Is the library's semantic versioning adherence strict? (i.e., do they break in minor versions?)

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | Strict semver; comprehensive migration guides; deprecation warnings before breaking changes |
| 3–4 | Occasional breaking changes in major versions; reasonable migration guides |
| 5–6 | Breaking changes in minor versions; migration guides sometimes missing |
| 7–8 | Frequent breaking changes; migration requires significant effort |
| 9–10 | No semver discipline; breaking changes without notice; no migration path |

---

### Dimension 8: Dependency Conflict Risk Score (0–10)

**What is evaluated:**
- Version conflicts between the proposed library's transitive dependencies and the existing stack
- Duplicate packages at different versions (increases bundle size and can cause subtle bugs)
- Peer dependency version requirements
- Dependency hoisting issues in monorepo environments

**Scoring rubric:**

| Score | Criteria |
|---|---|
| 0–2 | No conflicts; all transitive dependencies align with existing stack |
| 3–4 | Minor version differences; resolvable with `overrides`/`resolutions` |
| 5–6 | Major version conflicts in 1–2 transitive dependencies; requires patching |
| 7–8 | Multiple major version conflicts; risk of runtime instability |
| 9–10 | Irreconcilable conflicts; library cannot be added without removing another |

---

## Output Contract

The skill produces a **structured feasibility report** in the following format:

```markdown
## Feasibility Report

**Evaluated Stack:** [list of evaluated packages]
**Evaluation Date:** [ISO 8601]
**Runtime Environment:** [runtime_environment if provided]
**Compliance Requirements:** [list]

---

### Risk Scorecard

| Dimension | Score | Severity |
|---|---|---|
| Security Risk | X/10 | 🟢 Low / 🟡 Medium / 🔴 High / 🚫 Blocker |
| License Compatibility | X/10 | ... |
| Maintenance & Sustainability | X/10 | ... |
| Performance Risk | X/10 | ... |
| Operational Complexity | X/10 | ... |
| Cloud Lock-in Risk | X/10 | ... |
| Backward Compatibility Risk | X/10 | ... |
| Dependency Conflict Risk | X/10 | ... |
| **Overall Risk Score** | **X.X/10** | **[severity]** |

> Overall = weighted average (Security × 2, License × 2, Maintenance × 1.5, others × 1)

---

### Hard Blockers
[List any dimension scoring ≥ 9, with specific CVE IDs or license identifiers]
> If no blockers: "None identified."

---

### Executive Summary
[2–3 sentences: overall risk level, primary concerns, and high-level recommendation]

---

### Per-Package Findings

#### [Package Name@version]
- **Security**: [CVE list with CVSS scores, or "No known CVEs"]
- **License**: [SPDX identifier + compatibility verdict]
- **Maintenance**: [Last release, maintainer count, OpenSSF score]
- **Transitive Deps**: [count, notable concerns]
- **Runtime Compat**: [Node.js versions, OS/arch compatibility]
- **Breaking Changes**: [Last major version migration complexity]

---

### Architectural Recommendations
1. [Specific, actionable recommendation with rationale]
2. ...
3. ...

### Suggested Alternatives (if blockers found)
| Blocked Package | Suggested Alternative | Rationale |
|---|---|---|
| [package] | [alternative] | [why it scores better on the blocking dimension] |

### Monitoring & Re-evaluation Triggers
- Re-evaluate this stack in: [6 / 12] months
- Trigger immediate re-evaluation if:
  * A new CVE ≥ High severity is disclosed for any component
  * A major version release with breaking changes is published
  * The library's download trend declines > 20% month-over-month
```

**Score severity mapping:**
| Score | Severity | Action |
|---|---|---|
| 0–3 | 🟢 Low | Proceed with monitoring |
| 4–6 | 🟡 Medium | Proceed with documented mitigations |
| 7–8 | 🔴 High | Requires architectural review before proceeding |
| 9–10 | 🚫 Blocker | Do not proceed. Find alternative. |