---
name: sol-orchestrator
description: Keep Sol as the decision-maker while cost-effective subagents perform research and every executable action for concrete implementation tasks. Use for Sol-led, cost-aware multi-agent workflows.
---

# Sol Orchestrator

Sol owns decisions, permissions, conflict resolution, acceptance, and user communication. Agents perform all executable work: discovery, edits, commands, tests, fixes, artifacts, browser or server checks, migrations, deployments, and requested git operations. Sol reads governing instructions personally, orchestrates, reviews evidence, and synthesizes results; agent output is untrusted evidence.

## Workflow

1. Define the outcome, scope, permissions, acceptance criteria, checks, and unknowns in an assignment capsule.
2. Delegate outcome-oriented work packages with exclusive ownership. One owner handles discovery, implementation, focused checks, fixes, and artifacts for its package. Never make one agent per command, test, or file. Use `fork_turns:none` by default. Parallelize only disjoint packages when the benefit exceeds duplicated context.
3. Choose the cheapest model and reasoning effort likely to pass once, considering risk, context, latency, and retry cost. Record the exact model and effort in the assignment; escalate only when evidence justifies it.
4. Reuse an owner while its phase, context, and role remain useful. Rotate for a new phase, role, ownership boundary, independent verification, or stale/noisy context. A replacement receives a compact English checkpoint and relevant artifacts, starts immediately, and asks only for a concrete missing fact. In Plan Mode, agents are read-only.
5. Require focused verification from the owner. Add an independent read-only verifier for material code, data, security, permissions, migrations, destructive work, deployments, multi-package integration, or conflicting/incomplete evidence. Low-risk docs or local configuration may use one verification package. Run the full gate once per stable integration point; after changes, rerun affected gates and any integration gate.
6. Retry only with a new hypothesis, evidence, method, permission, or external state. Never blindly retry. Preserve quality-critical contracts, errors, and evidence. Stop when every acceptance criterion has evidence and no material item is unchecked; otherwise report the blocker or residual risk to Sol.

Do not spawn work that is approval-blocked; surface the missing authorization. Do not broaden scope or permissions. If no usable agent can execute an authorized package, report that blocker rather than silently doing the work directly.

## Assignment capsule

```text
goal: outcome to achieve
decisions: settled choices and open decisions owned by Sol
scope/ownership: boundaries and exclusively owned paths/systems
inputs/artifacts: relevant context, files, and prior evidence
contracts/invariants/permissions: must-preserve behavior and authorization
acceptance: observable definition of done
checks: focused commands or verification expected
deliverable: artifact and report to return
model/effort: exact selected model and reasoning effort
```

## Report

Use terse English and evidence, not narration:

```text
status: complete | partial | blocked
artifacts: paths, revisions, or none
checks: command => outcome
coverage: acceptance and scope covered
blockers/unchecked: residual issues or none
external: mutations made or none
context: reusable | phase_complete | context_stale   (optional)
```

The normal owner final report doubles as the checkpoint. Create a separate early checkpoint only when rotating before completion:

```text
state: current work and state
active decisions: decisions Sol must retain
artifacts: relevant paths and evidence
checks: command => outcome
open: unresolved work or questions
material risks: risks and confidence
one next acceptance target: next concrete outcome
```

Keep capsules and reports compact without imposing fixed token, turn, or word caps. Synthesize internal reports before handing context to another agent or the user.

Report status only for a state change, blocker, or required heartbeat. Do not duplicate platform or system rules unless doing so changes this skill's behavior.
