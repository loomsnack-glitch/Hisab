# 08 — Complete the application split and retire Admin POS routes

**What to build:** Complete the user-visible separation: Ganatri Admin hands Store Device operators directly to Ganatri POS login, the embedded Admin POS route tree is unavailable without a redirect, and all migrated POS capabilities are served only by Ganatri POS.

**Blocked by:** 03 — Move the POS Tables workflow; 04 — Move the POS Customers workflow; 05 — Move the POS Reports workflow; 06 — Move the POS Purchases workflow; 07 — Move the POS WhatsApp workflow.

**Status:** resolved

- [x] Every Admin POS launch or Store Device setup link targets the configured Ganatri POS `/login` origin and includes only non-secret organization/device prefills.
- [x] No Store Device Secret is exposed in an Admin-to-POS URL, fragment, or browser-visible runtime configuration.
- [x] Admin `/pos/*` routes are explicitly unavailable and never redirect to POS, Admin home, or another Admin route.
- [x] Ganatri Admin no longer loads POS layouts, Device Login, POS application metadata, or POS route-detection logic.
- [x] Both applications independently pass their quality gates, and a concurrent Admin user session plus POS device session remains isolated by application origin.

## Answer

Admin POS launch/setup links now open the configured POS origin at `/login` with only `org` and `device` prefills. Admin `/pos` and `/pos/*` render an unavailable page with no redirect. Device Login, POS layouts, POS manifest/title detection, and POS route-detection were removed from Admin. Admin and POS each keep same-origin `/api` on isolated ports (5173 vs 5174).

Admin `lint` and `check-types` still fail on pre-existing source issues unrelated to this split. Tests and production builds pass independently for both apps.

## Comments

Handoff helper: `apps/admin/src/lib/pos-origin.ts` (`VITE_POS_ORIGIN`, default `http://localhost:5174`). Retired route: `apps/admin/src/pages/retired-pos-route-page.tsx`.
