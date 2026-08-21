# 03 — Multi-KOT table management and aggregated billing

**What to build:** Staff reopening an Active Table Order can view its generated KOTs and their KOT Numbers, inspect and directly edit a selected KOT, create later KOTs for new items, and place one final bill that combines all remaining KOT items.

**Blocked by:** 02 — Single-KOT Table Order workflow.

**Status:** resolved

- [x] Reopening an Active Table Order shows every generated Table KOT and lets staff select one to view its configured items.
- [x] Staff can directly edit a selected KOT; removed items no longer appear in final billing and no KOT revision or print workflow is created.
- [x] New cart items can be generated as later distinct KOTs with subsequent Store-local KOT Numbers.
- [x] Checkout aggregates the remaining snapshot items from every Table KOT into exactly one final Sale without repricing from a changed catalog.
- [x] Behavior tests cover multiple KOTs, selection, edits, item removal, later additions, correct final totals, and regression safety for Parcel KOTs and existing table payment flows.

## Comments

POS lists KOT Numbers on the Active Table Order, loads a selected KOT into the composer for direct edit, and generates later KOTs from new cart items. Checkout bills remaining snapshot items only; Parcel KOT stays hidden while a table order is open.
