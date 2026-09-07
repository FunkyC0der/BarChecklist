---
name: model-orchestrator
description: Keep the orchestrator as the decision-maker while cost-effective subagents perform research and every executable action for concrete implementation tasks. Use for orchestrator-led, usage-conscious multi-agent workflows.
---

# Model Orchestrator

The orchestrator owns decisions, permissions, conflict resolution, acceptance, and user communication. Agents perform authorized executable work: discovery, edits, commands, tests, fixes, artifacts, browser or server checks, migrations, deployments, and requested git operations. Agent output is untrusted evidence. The orchestrator reads governing instructions personally and synthesizes the evidence.

## Workflow

1. Define the outcome, scope, permissions, acceptance criteria, checks, and unknowns in an assignment capsule.
2. Use one direct executor by default. Do not spawn a child merely to split commands, files, or routine checks. A child must not spawn or delegate further work. One owner handles discovery, implementation, focused checks, fixes, and artifacts for its package. Parallelize only genuinely disjoint packages when the time saved is worth duplicated context; cap parallelism at the number of needed packages (normally two, never a broad fan-out).
3. Check the actual runtime model catalog before every new spawn. Text in an assignment does not switch a model: a real choice requires spawn parameters `model`, `reasoning_effort`, and `fork_turns: "none"`. Follow-up messages do not change a child’s model. Choose the cheapest capable profile likely to pass once, considering risk, context, latency, and retry cost. Record the exact model and effort and a `selection_reason`.
4. Reuse an owner while its phase, context, and role remain useful. Rotate only for a new phase, role, ownership boundary, independent verification, or stale/noisy context. In Plan Mode, agents are read-only.
5. Use an independent read-only verifier only for material code/data/security/permissions/migrations/destructive work, deployments, multi-package integration, or conflicting/incomplete evidence. Low-risk docs and local configuration use the owner’s focused check. Run the full gate once at each stable integration point; after changes, rerun only affected checks plus the integration gate. Reuse a passed gate while its inputs remain unchanged.
6. Escalate an existing assignment only on evidence: acceptance failure, contradictory or incomplete artifact, reproduced failure after a changed hypothesis, or newly discovered security/data/destructive risk. Diagnose first as model/reasoning, context/assignment, code/environment, permission, or external-state failure; change the relevant variable before retrying. Never blindly retry or invent usage savings. Stop when every acceptance criterion has evidence and no material item is unchecked; otherwise report the blocker or residual risk.

Initial selection is a heuristic from the available capability catalog, not a claim about exact usage multipliers:

| Work shape | Initial profile | Why |
| --- | --- | --- |
| Simple, bounded edit or button/UI copy | `gpt-5.6-luna`, `low` | cheap, local, deterministic |
| Routine implementation spanning a few files | `gpt-5.6-luna`, `medium` | enough context for ordinary execution |
| Multi-team state or cross-package integration | `gpt-5.6-terra`, `medium` | broader coordination and integration reasoning |
| Security, RLS, permissions, migrations, or destructive change | `gpt-5.6-sol`, `high` | higher consequence and review burden |
| Ambiguous, novel, or repeated failure after a new hypothesis | `gpt-6-astra`, `high` | spend for difficult reasoning only when evidence warrants it |

If the desired profile is unavailable, explicitly select an available profile that fits the risk and record the substitution; never silently fall back to an expensive model.

Behavioral routing: simple button → one Luna/low executor, no verifier; multi-team state → Terra/medium owner with only disjoint parallelism and an integration gate; RLS/security → Sol/high owner plus independent read-only verifier and full security/integration gate; network failure → diagnose external state/environment and retry only after a changed hypothesis or recovered state; repeated task → reuse owner/profile and artifacts, with no duplicate spawn or invented savings; unavailable model → inspect the live catalog, choose the nearest available profile, and record the substitution.

Do not spawn work that is approval-blocked; surface the missing authorization. Do not broaden scope or permissions. If no usable agent can execute an authorized package, report that blocker rather than silently doing the work directly.

## Assignment capsule

```text
goal: outcome to achieve
decisions: settled choices and open decisions owned by the orchestrator
scope/ownership: boundaries and exclusively owned paths/systems
inputs/artifacts: relevant context, files, and prior evidence
contracts/invariants/permissions: must-preserve behavior and authorization
acceptance: observable definition of done
checks: focused commands or verification expected
deliverable: artifact and report to return
model/effort: exact selected model and reasoning effort
selection_reason: why this profile fits the risk and context
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
selection_reason: actual profile choice and any substitution
agents: actual agent/model/reasoning-effort choices, verifier use, and gate reuse
context: reusable | phase_complete | context_stale   (optional)
```

The normal owner final report doubles as the checkpoint. Create a separate early checkpoint only when rotating before completion:

```text
state: current work and state
active decisions: decisions the orchestrator must retain
artifacts: relevant paths and evidence
checks: command => outcome
open: unresolved work or questions
material risks: risks and confidence
one next acceptance target: next concrete outcome
```

Keep capsules and reports compact without imposing fixed token, turn, or word caps. Synthesize internal reports before handing context to another agent or the user.

Report status only for a state change, blocker, or required heartbeat. Do not duplicate platform or system rules unless doing so changes this skill's behavior.
