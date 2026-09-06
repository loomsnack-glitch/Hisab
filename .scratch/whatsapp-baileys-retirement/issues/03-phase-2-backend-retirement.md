# Phase 2 — Remove Baileys backend provider branches

Status: complete

Type: task

## Objective

Remove Baileys-only backend service, repository, worker-client, middleware, route, and provider contract code while keeping Cloud API behavior intact.

## Acceptance criteria

- Backend no longer creates, links, disconnects, or changes numbers through Baileys.
- Worker-only routes and middleware are removed or reduced to an explicitly justified compatibility boundary.
- Cloud API account, template, webhook, send, reconciliation, promotion, invoice, due, and history paths remain available.
- Types no longer advertise a retired provider except where historical read compatibility is explicitly required.
- Focused backend tests and build pass.
- Worker-only account, invoice, and status contracts are removed; generic Cloud webhook/message event contracts remain.
