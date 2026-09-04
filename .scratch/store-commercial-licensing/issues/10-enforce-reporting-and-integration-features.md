# 10 — Enforce reporting and integration Features

**What to build:** Reports, WhatsApp, and Google Contacts Synchronization require their matching Store Feature Entitlement on the server, while preserving each integration's existing safety and credential boundaries.

**Blocked by:** 02 — Legacy Store migration grants.

**Status:** ready-for-agent

- [ ] Reporting requests and covered WhatsApp and Google Contacts Synchronization operations reject unentitled Store use at their server-side boundaries.
- [ ] Entitled Stores retain current workflow behavior; the entitlement layer does not disclose or weaken existing credential protections.
- [ ] Organization-level integration records remain safe when one Store has access and another does not.
- [ ] Behavior tests cover access decisions, grant/expiry transitions, Store isolation, and existing integration authorization safeguards.
