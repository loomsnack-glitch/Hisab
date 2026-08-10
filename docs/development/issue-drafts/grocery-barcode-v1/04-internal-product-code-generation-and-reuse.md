# 04 — Internal Product Code generation and reuse

**What to build:** Administrators can generate store-only codes for eligible uncoded fixed-count Products and deliberately reuse released internal values without automatic sequence recycling.

**Blocked by:** 01 — Product Code catalog lifecycle

**Status:** ready-for-agent

- [ ] An administrator can generate an internal Product Code only for an eligible uncoded fixed-count Product.
- [ ] Generated codes are 13 digits, begin with `04`, and contain a calculated check digit.
- [ ] Concurrent generation is transactional and cannot duplicate a code within an Organization.
- [ ] Automatic generation advances and does not recycle released or exhausted sequence values.
- [ ] Scanning or entering a Manufacturer Product Code never implicitly generates an internal code.
- [ ] A released internal value can be reused only through a dedicated administrator action.
- [ ] Reuse shows an explicit warning that old labels may now identify a different Product.
- [ ] Generated codes are clearly presented as store-only and not globally registered identifiers.
