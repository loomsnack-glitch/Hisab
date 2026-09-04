# 09 — Enforce POS and restaurant Features

**What to build:** POS billing, KOT System, and Table Management workflows require the Store's server-side Feature Entitlement while retaining the existing KOT/Table relationship and Store operational configuration checks.

**Blocked by:** 02 — Legacy Store migration grants.

**Status:** ready-for-agent

- [ ] Billing, KOT, and Table Management server operations deny use without their required Feature Entitlement and succeed for an entitled Store.
- [ ] Table Management never enables a KOT-free workflow: existing KOT System requirements and operational Store configuration remain mandatory.
- [ ] POS receives clear commercial access-denied behavior without trusting client-side visibility or bypassing Store isolation.
- [ ] KOT/Table and billing behavior tests cover entitlement, existing operational flags, migration expiry, and two Stores in one Organization with different commercial access.
