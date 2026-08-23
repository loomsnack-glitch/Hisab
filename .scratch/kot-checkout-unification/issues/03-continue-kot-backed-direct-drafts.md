# 03 — Continue KOT-backed direct drafts

**What to build:** A cashier reopening a direct Draft Sale with already generated KOTs sees its kitchen history separately and can send only later additions as the next KOT batch.

**Blocked by:** 02 — Generate standalone KOTs from Complete order.

**Status:** ready-for-agent

- [ ] Reopening a KOT-backed Draft Sale displays its existing KOT numbers separately from the product composer.
- [ ] The composer contains only ungenerated additions rather than refilling every item from earlier KOT batches.
- [ ] Adding a new item and generating a KOT creates the next KOT Number with only that new item, never reprinting earlier batches.
- [ ] Explicit correction of a selected existing KOT retains the established KOT-editing behavior and is not confused with creating a new batch.
- [ ] Automated behavior tests cover a draft with KOT #101 followed by a later KOT #102 containing only new items.
