# 04 — Generate mixed-fulfillment table KOTs

**What to build:** A cashier with new items in an Active Table Order uses Complete order to generate a mandatory Dine-In or Pick-Up KOT batch, without the legacy cart action or a separate draft action.

**Blocked by:** 01 — Expand KOT fulfillment and batches.

**Status:** ready-for-agent

- [ ] The cart-level Table Generate KOT action is absent.
- [ ] When an Active Table Order has new composer items, Checkout leads to one mandatory Generate KOT final action and does not offer Save draft.
- [ ] The cashier can select Dine-In or Pick-Up for the new KOT batch; only Pick-Up KOTs print as Parcel.
- [ ] Earlier table KOTs retain their own fulfillment labels when a later batch uses the other fulfillment mode.
- [ ] Table KOT generation remains unavailable unless both KOT System and Table Management are enabled for the Store.
- [ ] Automated POS and KOT-service behavior tests cover mixed Dine-In/Pick-Up table batches and their Store-local KOT Numbers.
