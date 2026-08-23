# 01 — Expand KOT fulfillment and batches

**What to build:** KOT records can independently preserve Dine-In or Pick-Up fulfillment and multiple ordered KOT batches can belong to one Sale, while existing standalone and table KOT history remains readable and correct.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A KOT independently records Dine-In or Pick-Up fulfillment, with Pick-Up available for both standalone and table-linked KOTs.
- [ ] One Sale can retain multiple ordered standalone KOT batches without overwriting or duplicating earlier KOTs.
- [ ] Existing table KOT and standalone Parcel KOT records retain their established meaning and KOT Number history after the data-model expansion.
- [ ] KOT read and write contracts expose the needed batch and fulfillment information while server-side Store feature checks remain enforced.
- [ ] Automated behavior tests cover the expanded record shape, Store-local KOT Number allocation, snapshot preservation, and retry safety.
