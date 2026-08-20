# 05 — Move the POS Reports workflow

**What to build:** Make existing device-scoped product-sales reporting available from Ganatri POS `/reports`, while preserving Ganatri Admin's Organization-administrator reporting views.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** ready-for-agent

- [ ] An authenticated Store Device can open POS `/reports` and receive report data scoped by its authenticated Store Device contract.
- [ ] Existing filters, summaries, loading states, and empty states preserve their current observable behavior.
- [ ] Ganatri Admin retains its Organization-administrator reporting view and does not gain device POS write capability.
- [ ] Shared reporting presentation is extracted only where both applications genuinely use it.

