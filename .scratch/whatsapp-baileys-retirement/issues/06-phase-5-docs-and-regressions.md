# Phase 5 — Cloud-only documentation and regression coverage

Status: complete

Type: task

## Objective

Make setup and operations documentation match the Cloud API-only runtime and add regression coverage for the removal boundary.

## Acceptance criteria

- `.env.example` files contain only required Cloud API setup and clearly named secrets.
- Deployment/runbook docs no longer instruct operators to start or configure Baileys.
- Tests cover retired-provider rejection/compatibility and Cloud API behavior.
- No secret values from local environment files are copied into examples or docs.
- Docs and runtime configuration are reviewed together.
- Cloud setup and local test runbooks no longer start or configure the retired WhatsApp worker.
