# 02 — Generate standalone KOTs from Complete order

**What to build:** A direct-POS cashier in a KOT-enabled Store makes the KOT decision in Complete order, then uses the normal Save draft or Place order action to optionally create one standalone Dine-In or Parcel KOT.

**Blocked by:** 01 — Expand KOT fulfillment and batches.

**Status:** ready-for-agent

- [ ] The legacy cart-level Parcel KOT action is absent from direct POS.
- [ ] Complete order shows a Generate KOT toggle only when the device Store enables KOT System, and the toggle starts selected whenever the dialog opens.
- [ ] Save draft and Place order remain available regardless of the toggle state.
- [ ] With Generate KOT selected, either action creates a standalone KOT alongside its normal Sale transition; with it unselected, neither action creates a KOT.
- [ ] The selected Sale Service Mode persists on the direct Sale and labels the newly generated KOT as Dine-In or Parcel.
- [ ] Automated POS and service behavior tests cover enabled and disabled Stores, both final actions, both service modes, and the no-KOT path.
