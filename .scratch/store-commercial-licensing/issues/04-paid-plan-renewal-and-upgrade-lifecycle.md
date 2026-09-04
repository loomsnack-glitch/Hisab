# 04 — Paid Plan renewal and upgrade lifecycle

**What to build:** An Organization administrator can renew a paid Store License before it ends, choose a lower next-term Plan, or immediately upgrade to a higher Plan with the correct prorated credit and charge. The Store retains a single future term and a clear commercial history.

**Blocked by:** 03 — Paid Plan checkout and verified fulfilment.

**Status:** ready-for-agent

- [ ] A paid early renewal creates at most one Scheduled Store License starting at the active term's exact end, without stacking prepaid years.
- [ ] A downgrade is available only for the next scheduled term and never removes active-term Features.
- [ ] An immediate upgrade preserves the current expiry and charges the exact remaining Asia/Kolkata-term fraction after crediting the original purchased price, rounded to paise.
- [ ] Tests cover successor limits, local-time expiry, leap/calendar boundaries, upgrade price evidence, downgrade behavior, and history shown to the Organization administrator.
