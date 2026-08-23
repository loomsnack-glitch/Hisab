# 05 — Finalize table checkout under the unified flow

**What to build:** A cashier can complete an Active Table Order with no new items through normal placement only, producing one final Dine-In Table-Linked Sale that aggregates every earlier KOT batch.

**Blocked by:** 04 — Generate mixed-fulfillment table KOTs.

**Status:** ready-for-agent

- [ ] With no new table items, Complete order omits Generate KOT and offers normal final order placement only.
- [ ] Final placement does not create an empty or duplicate KOT.
- [ ] The final Table-Linked Sale aggregates all remaining Dine-In and Pick-Up KOT batches, preserves their linked KOT Numbers, and remains stored as Dine-In.
- [ ] Bill details retain the final Sale's Dine-In Service Mode while KOT history continues to show each batch's own fulfillment label.
- [ ] Automated end-to-end service and POS behavior tests cover empty-composer checkout and final aggregation of mixed-fulfillment table KOTs.
