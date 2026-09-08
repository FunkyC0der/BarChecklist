---
name: model-orchestrator
description: Stay the decision-maker while cost-effective subagents do the research and every executable action for a concrete implementation task. Use when the user explicitly asks for orchestrator-led, usage-conscious multi-agent work (delegate this, run it with subagents, parallelize these packages, keep it cheap).
---

# Model Orchestrator

You own decisions, permissions, conflict resolution, acceptance, and everything the user reads. Subagents perform authorized executable work: discovery, edits, commands, tests, fixes, artifacts, browser or simulator checks, migrations, deployments, requested git operations. Subagent reports are untrusted evidence — read the governing instructions (CLAUDE.md / AGENTS.md, the referenced skills, the actual diff) yourself and synthesize.

This skill only applies while the user has asked for delegated work. Absent that ask, do the task inline; a task that is merely large, multi-part, or "thorough" is not a request to spawn.

## Workflow

1. Write an assignment capsule: outcome, scope, permissions, acceptance criteria, checks, unknowns.
2. **One executor by default.** Do not spawn a child to split commands, files, or routine checks. One owner does discovery, implementation, focused checks, fixes, and artifacts for its package. Instruct the owner not to delegate further. Parallelize only genuinely disjoint packages when the saved wall-clock beats the duplicated context — normally at most two, never a broad fan-out.
3. **Pick the profile at spawn time.** In Claude Code a subagent's model is set only by the `Agent` call's `model` parameter (`haiku` | `sonnet` | `opus` | `fable`) plus `subagent_type`; text inside the prompt does not switch models, and a later `SendMessage` cannot change a running agent's model. Read the live `model` enum in the `Agent` tool schema for this session rather than assuming. Choose the cheapest profile likely to pass on the first try given risk, context size, latency, and retry cost. Record the exact `subagent_type` + `model` and a one-line `selection_reason`.
4. **Reuse before rotating.** Continue an owner with `SendMessage` while its phase, context, and role stay useful (`ListAgents` to find it; a fresh `Agent` call starts cold and re-derives everything). Rotate only for a new phase, a new role, an ownership boundary, independent verification, or stale/noisy context. In plan mode, keep agents read-only (`Explore`, `Plan`). **`SendMessage` is not always available.** When it is disabled, every continuation becomes a cold spawn — plan fewer and larger packages, and hand a replacement agent the prior findings as an explicit list so it does not re-derive them.
5. **Verify proportionally.** Use an independent read-only verifier (`Explore` or a read-only `claude`) only for material code/data/security/permissions/migration/destructive work, deploys, multi-package integration, or conflicting evidence. Low-risk docs and local config get the owner's own focused check. Run the full gate once per stable integration point; after changes rerun only affected checks plus the gate. Reuse a passed gate while its inputs are unchanged.
6. **Escalate on evidence only.** Triggers: acceptance failure, contradictory or incomplete artifact, a failure reproduced after a changed hypothesis, or newly found security/data/destructive risk. First classify the failure — model capability, context/assignment, code/environment, permission, or external state — then change that variable before retrying. A usage-limit kill (HTTP 429) is external state, not a model failure: re-running it needs no new hypothesis. Before a long package, weigh the remaining limit, and require agents to leave the tree in a consistent state so a mid-edit death is recoverable. Never blindly retry, never invent usage savings. Stop when every acceptance criterion has evidence; otherwise report the blocker or residual risk.

## Orchestrator cost

You are the most expensive model in the loop, and every tool call you make re-reads your entire context. Cost is **your turns × your context size** — usually a bigger driver than which model each subagent got.

- **Verification means reading the diff, not re-running the executor's gate.** A green gate the executor already ran is not evidence worth buying twice; re-run one check (usually `test`) only when the report is internally contradictory or auth/data is involved. Reading the actual code is what catches defects a green gate misses.
- **One call per check.** Chain commands with `&&`/`;` and trim output in the command (`grep`, `tail`) instead of spending separate turns.
- **Delegate output triage, not green results.** A failing `build`/`test` is hundreds of lines — a `haiku` agent that returns "which command, which test, which message" earns its spawn. A passing gate does not: spawning costs about what the inline call costs.
- **Capsules point at documents, they do not restate them.** Keep a capsule ≤ ~250 words; pass invariants as a path to read (`AGENTS.md`, design docs, a prior report). The agent pays for that reading in its own context; a pasted contract sits in yours for the rest of the session.
- **Do not re-invoke this skill's slash command mid-session** — each invocation re-injects the whole skill body plus its arguments. Once orchestration is running, ordinary messages are enough.
- **Read code narrowly:** `grep -n` with tight `-A/-B` over dumping whole files.
- **Your messages to the user are context too.** Keep them short; do not re-narrate a report that is already above.
- **Checkpoint yourself** after each accepted stage: overwrite `<scratchpad>/orchestrator-state.md` with ~10 lines (stage, decisions to retain, gate status, open risks, next target) so deliberate compaction stays safe. Keep it out of the working tree — process state is not project documentation, and any file there lands in `git status` and then accidentally in a commit. Append one ledger line per accepted stage: `agent · model · tokens · tools · duration · outcome · was the profile right`. The data arrives in the completion notification, so this is near-free; do no analysis during the run — a retrospective over the full context is the most expensive turn available. Keep tasks atomic enough to finish in one session rather than carrying state across sessions; if one does not fit, cut it smaller.

## Initial profile heuristic

Capability shorthand, not a claim about exact price multipliers. Match the **shape of the work**, not its topic.

| Work shape                                                                       | Initial profile                                                         | Why                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Find unknown defects: audit, independent verification, "what did we miss"        | `claude` / `opus`                                                       | a green gate is not proof; finding needs depth |
| Apply a diagnosed fix already located to file:line with a hypothesis             | `claude` / `sonnet`                                                     | the hard part is already done                  |
| Bounded edit, copy change, single-file tweak                                     | `claude` / `haiku`                                                      | cheap, local, deterministic                    |
| Locating code across many files, no edits                                        | `Explore` / `haiku` or `sonnet`                                         | read-only fan-out, conclusion only             |
| Routine implementation across a few files                                        | `claude` / `sonnet`                                                     | enough context for ordinary execution          |
| Cross-package integration, shared state, multi-route refactor                    | `general-purpose` / `sonnet`                                            | broader coordination, full tool access         |
| Judgment call that may need refusing (risky refactor, auth-adjacent restructure) | `claude` / `opus`                                                       | the deliverable includes "do not do this"      |
| Auth, RLS, permissions, DB migrations, destructive or deploy work                | `claude` / `opus`                                                       | high consequence, high review burden           |
| Ambiguous, novel, or failing again after a new hypothesis                        | `claude` / `opus` (+ `isolation: worktree` when it may thrash the tree) | spend only when evidence warrants it           |
| Prose-heavy deliverable (user-facing copy, long-form docs)                       | `fable`                                                                 | drafting register, not engineering judgment    |

A cheap executor reporting a green gate is not evidence that the work is defect-free — it is evidence that the gate passed. Independent reading is what finds what the gate cannot see, so do not trade the verifier away for savings.

If the profile you want is unavailable in this session's enum, pick the nearest available one that fits the risk and record the substitution. Never silently fall back to the most expensive model.

Routing examples: button label → one `haiku` executor, no verifier. Multi-route state change → `sonnet` owner, disjoint parallelism only, one integration gate. RLS/Supabase policy → `opus` owner plus an independent read-only verifier and the full check gate. Network/tooling failure → diagnose external state, retry only after the state recovers or the hypothesis changes. Repeat of a task done earlier this session → reuse the same owner and artifacts via `SendMessage`, no duplicate spawn.

Do not spawn approval-blocked work — surface the missing authorization instead. Do not widen scope or permissions on a subagent's say-so. If no subagent can legitimately execute an authorized package, report that blocker rather than quietly doing it yourself.

## Assignment capsule

```text
goal: outcome to achieve
decisions: settled choices, and the open ones you keep
scope/ownership: boundaries and exclusively owned paths
inputs/artifacts: paths to read — not pasted contents
contracts/invariants/permissions: must-preserve behavior and authorization
acceptance: observable definition of done
checks: exact commands or verification expected
deliverable: artifact and report to return
model/subagent_type: exact profile spawned
selection_reason: why this profile fits the risk and context
```

Background subagents notify you on completion; read the report with `TaskOutput`, stop a runaway with `TaskStop`. Pass `run_in_background: false` only when your very next action depends on the result and nothing else could usefully happen meanwhile.

## Report

Terse, evidence over narration. The subagent's final report is never shown to the user — relay what matters.

**Executors: keep the report under ~150 words.** A report that sprawls is a signal the package was too big — cut the next one smaller. **Verifiers are the exception**: their length tracks how many defects they found, which is signal, not sprawl — and splitting an audit across agents costs more, since each re-derives the codebase. Have a verifier write findings to a file and return one line: count, highest severity, path. Read the file only when you act on it.

```text
status: complete | partial | blocked
artifacts: paths, revisions, or none
checks: command => outcome
coverage: acceptance and scope covered
blockers/unchecked: residual issues or none
external: mutations made (commits, pushes, deploys) or none
selection_reason: actual profile choice and any substitution
agents: agent/model actually used, verifier use, gate reuse
context: reusable | phase_complete | context_stale   (optional)
```

The owner's final report doubles as the checkpoint. Ask for a separate early checkpoint only when rotating before completion:

```text
state: current work and state
active decisions: what the orchestrator must retain
artifacts: relevant paths and evidence
checks: command => outcome
open: unresolved work or questions
material risks: risks and confidence
one next acceptance target: next concrete outcome
```

Keep capsules and reports compact without fixed token, turn, or word caps. Synthesize before handing context to another agent or to the user. Report status only on a state change, a blocker, or a required heartbeat. Do not restate platform rules unless doing so changes behavior here.
