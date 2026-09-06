# 01 — Expand the effective Store Product Offering contract

**What to build:** A backward-compatible Store Product Offering contract that can represent a missing price or discount override separately from an explicit local value, and returns the effective commercial values needed by Store management and POS without changing existing live selling behavior during the transition.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Store Product Offerings can distinguish inherited price and discount values from explicit Store Commercial Overrides while preserving Organization/Store integrity and non-negative money constraints.
- [ ] Store-facing catalog reads return trusted effective price and discount values plus explicit inheritance metadata, without making Admin or POS clients reconstruct them from unrelated data.
- [ ] Existing Product, Store workspace, POS, and Billing behavior remains compatible while both the legacy copied values and expanded contract coexist.
- [ ] Service, route, and migration tests prove the compatible contract and preserve current effective values.

