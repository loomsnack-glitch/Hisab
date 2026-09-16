---
name: phase-loop
description: Execute an approved multi-phase effort one subphase at a time with plan review, documentation, implementation, verification, final review, status tracking, and commits.
---

# Phase Loop

Use this skill when the user wants an approved phase or roadmap completed through a repeatable subphase lifecycle.

The outcome is a completed phase whose subphases are individually planned, reviewed, implemented, verified, documented, and committed. Do not begin the next subphase until the current one reaches its commit gate.

## Authorization boundary

Autonomous progression applies only to the approved scope. It does not authorize:

- inventing or silently changing product, API, security, release, or public-behavior decisions;
- changing unrelated files or overwriting the user's work;
- destructive operations, secret handling, production actions, external messages, or pushing to a remote;
- skipping verification because a change is small or because the phase is nearly complete.

Once the user approves the phase, do not request fresh approval for every unchanged subphase plan. Internal plan review is the normal gate; ask again only when a new decision or scope change is required.

Pause and ask the user when a new decision materially changes the scope or behavior, when required hardware or external state is unavailable, or when safe progress is impossible. Record the blocker and the evidence first.

## Before the loop

1. Identify the phase, its subphases, the approved specification, the status tracker, and the repository's local instructions.
2. Inspect the current branch and worktree. Preserve unrelated changes and establish the fixed point for review.
3. Read the relevant domain context and ADRs. Use the repository's domain vocabulary.
4. Confirm the phase is explicitly approved. If approval is missing or the scope is ambiguous, stop for direction.
5. Build a short phase map: subphase order, dependencies, exit conditions, likely files/modules, verification commands, and known baseline failures.

## Subphase loop

Repeat the following lifecycle for each subphase, in dependency order.

### 1. Re-orient and plan

Read the relevant spec and current status again. Treat this as a fresh context pass: distinguish confirmed decisions, implementation details, open questions, and existing worktree changes.

Write a subphase plan before coding. Include:

- user-facing outcome and exact scope;
- acceptance criteria and non-goals;
- dependencies and public seams;
- data, API, navigation, or module-boundary effects;
- test strategy and expected commands;
- risks, rollback considerations, and unresolved decisions.

Prefer extending an existing boundary over creating a new one. Do not add future-phase behavior merely because the current change makes it convenient.

### 2. Review and record the plan

Review the plan against the spec, domain docs, current implementation, and status tracker. Check for scope creep, contradictions, missing dependencies, unsafe assumptions, and tests that would verify implementation details instead of observable behavior.

Record the approved plan in the related Markdown artifact before implementation. If the plan exposes a genuinely new product or public-interface decision, pause for user approval rather than choosing silently.

### 3. Implement one vertical slice

Use the highest useful public seam. Where practical, follow the red-green-refactor loop:

1. Add one behavior-focused failing test.
2. Make the smallest implementation change that passes it.
3. Refactor only after the behavior is green.

Keep changes inside the subphase scope. Preserve unrelated user changes and do not use broad rewrites or generated artifacts as a shortcut.

### 4. Verify continuously

Run the focused test, typecheck, lint, build, or runtime check appropriate to the changed boundary. Compare failures with the recorded baseline. A baseline failure is not evidence that the subphase passes; it must be reported separately and new failures must be investigated.

For mobile or hardware work, separate static/build validation from emulator, physical-device, printer, or other real-environment validation. Do not claim the latter without running it.

### 5. Review, fix, and re-verify

Review the subphase diff on two axes:

- **Standards:** repository conventions, module boundaries, security rules, and maintainability smells.
- **Spec:** required behavior, exclusions, acceptance criteria, and correct user-facing outcomes.

Fix every actionable finding within scope, then repeat focused verification. If a finding requires a new decision or expands scope, stop and ask.

### 6. Finalize the subphase

Before committing:

- perform a final diff and whitespace review;
- confirm tests and checks have fresh results;
- update the status tracker with the exact subphase state, evidence, remaining follow-ups, and known baseline failures;
- ensure the status does not say Completed when required validation is still pending;
- stage only files belonging to this subphase;
- inspect the staged diff and verify the worktree boundary.

Commit with a focused message. Do not push unless the user explicitly requests it.

## Phase completion gate

After the last subphase:

1. Run the phase-level validation suite and any required build or integration checks.
2. Perform a final standards and spec review across the phase's commits.
3. Update the phase status, exit condition, completed work, deferred work, and verification evidence.
4. Confirm the worktree is clean and report the commit list, test results, baseline failures, and remaining release gates.

Only then report the phase complete. If a release gate remains unverified, report the phase as complete with follow-ups rather than claiming full release readiness.

## Recovery rules

- If a test or build fails, remain on the current subphase until the cause is fixed, explicitly baseline, or blocked by external state.
- If the user changes direction, stop the loop, preserve the current checkpoint, and update status before switching scope.
- If a commit contains unrelated work, do not amend or rewrite history destructively; isolate the intended files and ask before manipulating existing user commits.
- If the next subphase depends on a missing decision, finish the current committed checkpoint and pause at the dependency boundary.
