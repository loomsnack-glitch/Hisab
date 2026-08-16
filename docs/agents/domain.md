# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area being changed.

If any of these files do not exist, proceed silently. The domain-modeling skill creates them lazily when terms or decisions are resolved.

## File structure

This is a single-context repository with one root `CONTEXT.md` and a root `docs/adr/` directory when ADRs are needed.

## Use the glossary's vocabulary

When naming a domain concept in an issue, specification, test, or proposal, use the term defined in `CONTEXT.md`. If the needed concept is not in the glossary, reconsider whether it is a synonym or note it for domain modeling.

## Flag ADR conflicts

If a proposed change contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
