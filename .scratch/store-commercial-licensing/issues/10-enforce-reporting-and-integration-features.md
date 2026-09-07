# 10 — Enforce reporting and integration Features

**What to build:** Reports, WhatsApp, and Google Contacts Synchronization require their matching Store Feature Entitlement on the server, while preserving each integration's existing safety and credential boundaries.

**Blocked by:** 02 — Legacy Store migration grants.

**Status:** resolved

- [x] Reporting requests and covered WhatsApp and Google Contacts Synchronization operations reject unentitled Store use at their server-side boundaries.
- [x] Entitled Stores retain current workflow behavior; the entitlement layer does not disclose or weaken existing credential protections.
- [x] Organization-level integration records remain safe when one Store has access and another does not.
- [x] Behavior tests cover access decisions, grant/expiry transitions, Store isolation, and existing integration authorization safeguards.

## Answer

Reports, WhatsApp, and Google Contacts Synchronization now reject unentitled Store use at their existing service seams. Organization-wide reports include only entitled Stores; WhatsApp Store operations check that Store while org-level Cloud setup requires any entitled Store; Google Contacts management and outbox dispatch skip unentitled Organizations without resolving credentials. Inbound WhatsApp webhooks and public invoices remain ungated. Denial copy stays in Feature Entitlement, not routes or UI.
