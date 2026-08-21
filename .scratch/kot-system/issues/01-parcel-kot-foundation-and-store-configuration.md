# 01 — Parcel KOT foundation and Store configuration

**What to build:** Organization administrators can configure daily-reset KOT Numbering for each Store. At a KOT-enabled Store, counter staff can generate a Parcel KOT from the POS menu; it retains trusted item snapshots, receives a Store-local KOT Number, and immediately creates the final Sale with a pending payment status.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Store settings expose KOT Number reset-period configuration, defaulting to daily and using the existing supported reset periods and Store time zone.
- [x] Parcel KOT generation is available only when the KOT System Store feature is enabled and creates a KOT Number independent from Sale and token numbers.
- [x] A Parcel KOT retains trusted configured-product, add-on, bundle, price, and discount snapshots; later catalog changes do not change the resulting Sale.
- [x] Parcel KOT generation commits exactly one tableless Sale with a pending payment status, which can later be settled through the existing payment workflow.
- [x] Device-authenticated Store scope, numbering uniqueness, feature gating, snapshots, and payment behavior have external-behavior tests.
