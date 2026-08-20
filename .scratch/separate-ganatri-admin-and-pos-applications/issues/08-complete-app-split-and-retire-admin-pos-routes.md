# 08 — Complete the application split and retire Admin POS routes

**What to build:** Complete the user-visible separation: Ganatri Admin hands Store Device operators directly to Ganatri POS login, the embedded Admin POS route tree is unavailable without a redirect, and all migrated POS capabilities are served only by Ganatri POS.

**Blocked by:** 03 — Move the POS Tables workflow; 04 — Move the POS Customers workflow; 05 — Move the POS Reports workflow; 06 — Move the POS Purchases workflow; 07 — Move the POS WhatsApp workflow.

**Status:** ready-for-agent

- [ ] Every Admin POS launch or Store Device setup link targets the configured Ganatri POS `/login` origin and includes only non-secret organization/device prefills.
- [ ] No Store Device Secret is exposed in an Admin-to-POS URL, fragment, or browser-visible runtime configuration.
- [ ] Admin `/pos/*` routes are explicitly unavailable and never redirect to POS, Admin home, or another Admin route.
- [ ] Ganatri Admin no longer loads POS layouts, Device Login, POS application metadata, or POS route-detection logic.
- [ ] Both applications independently pass their quality gates, and a concurrent Admin user session plus POS device session remains isolated by application origin.

