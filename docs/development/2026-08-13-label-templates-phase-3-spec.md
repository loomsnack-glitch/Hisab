# Label Templates Phase 3: Printer-Language Adapters

**Status:** ready-for-agent

**Phase:** 3 of 3

**Blocked by:** Phase 1 — Label Templates stock, composer, Product Label Profile, and print jobs. The millimetre document and renderer interface must already exist.

**Does not require:** Phase 2. A Template authored with the Phase 1 inspector is enough to compile to TSPL or ZPL.

## Problem Statement

Phase 1 prints Label Templates through the browser using CSS page size. That is enough for A4 sheets and for label printers that appear as ordinary Windows printers. Many Indian packaging counters use dedicated thermal label printers that speak TSPL or ZPL and ignore browser `@page`. On pre-printed rolls, a few millimetres of drift puts the barcode on the brand header or off the holographic strip, which is exactly the failure Laxmi-style stock cannot tolerate. If Hisab only has browser print, the Label Template designer is a preview toy for those stores. Competing POS tools already tell users to "configure labels in Printer Settings as well," which dumps calibration on the shop. Hisab should compile the same millimetre Template to the printer's language so one design prints on browser, TSPL, or ZPL without a per-customer layout fork.

## Solution

Keep the Phase 1 `renderLabel(template, product, job)` document as the source of truth and add output adapters behind it. Each adapter compiles millimetre geometry, Keep-Outs, and Label Elements into one Print Payload: HTML (already shipped), TSPL, or ZPL. Administrators choose a printer family on the Label Template or at Label Job time. The receipt ESC/POS module stays out of this path. Success is: the same Label Template and Label Job produce aligned output on a dedicated label printer, barcodes still encode only the Product Code, Keep-Outs still receive no ink, and adding a future printer language does not change catalog data.

## User Stories

1. As an organization administrator, I want to choose a printer family for a Label Template (browser, TSPL, or ZPL), so that the same design can target the machine actually in the store.
2. As an organization administrator, I want a Label Job to override printer family when needed, so that I can test-print on a desktop printer without changing the Template used on the packing line.
3. As an organization administrator, I want TSPL output to use Label Stock width, height, labels per row, and gaps, so that the printer's label size matches the Template rather than a hidden driver setting.
4. As an organization administrator, I want ZPL output to use the same millimetre Stock, so that a Zebra-class printer does not require a second design.
5. As an organization administrator, I want Keep-Outs to emit no draw commands, so that pre-printed branding is not overprinted in TSPL or ZPL either.
6. As an organization administrator, I want text Label Elements to print at the same millimetre origin and box as the browser preview, so that packed date does not jump between preview and press.
7. As an organization administrator, I want barcode Label Elements to encode the same Product Code payload as Phase 1, so that scan identity does not depend on printer family.
8. As an organization administrator, I want EAN-13 quiet zones and a forced white patch to be preserved in TSPL/ZPL, so that watermarked stock still scans.
9. As an organization administrator, I want barcode rotation 0/90/180/270 to be preserved in TSPL/ZPL, so that a side-column barcode survives the adapter.
10. As an organization administrator, I want Code 128 to remain available for opaque Product Codes such as VR000001, so that packaging SKUs are not forced through EAN-13 on thermal firmware.
11. As an organization administrator, I want nutrition tables to compile to positioned text (and rules/boxes) in TSPL/ZPL, so that a table is not dropped just because the printer has no HTML.
12. As an organization administrator, I want box Label Elements to compile to printer graphic boxes, so that an On-pack MRP frame still prints.
13. As an organization administrator, I want missing optional bindings to omit commands, so that empty ingredients do not print a stray label on the printer language either.
14. As an organization administrator, I want Gujarati text to use a printer-available or downloadable font strategy documented per family, so that names do not become ASCII fallbacks without warning.
15. As an organization administrator, I want a clear error when the selected printer family cannot render a Template feature (unsupported font, oversized bitmap), so that I can simplify the design rather than send a partial pack.
16. As an organization administrator, I want feed-direction gap and labels-per-row to become printer gap/columns commands, so that 2-across rolls are not browser-only.
17. As an organization administrator, I want copy count to become the printer's repeat count rather than N browser pages when using TSPL/ZPL, so that a 200-label job does not open 200 print dialogs.
18. As an organization administrator, I want test-print one copy on the chosen printer family, so that alignment on real stock is validated in the same language as bulk print.
19. As an organization administrator, I want bulk print to stay gated on test-scan confirmation, and I want changing printer family to reset that confirmation, so that a TSPL offset bug cannot ride on a browser-scan success.
20. As an organization administrator, I want to set millimetre print offset (x and y) per Template or per Store Device later if needed, so that a consistently shifted printer can be calibrated without moving every Label Element.
21. As an organization administrator, I want browser HTML output to remain available, so that A4 sheet stores are not forced onto TSPL.
22. As a Hisab maintainer, I want adapters to consume the Phase 1 Label Template document only, so that Phase 2 designer internals never leak into printer code.
23. As a Hisab maintainer, I want a new printer language to be a new adapter at the same seam, so that we never add `if (customer === "laxmi")` in TSPL strings.
24. As a Hisab maintainer, I want the receipt ESC/POS builder unused by label adapters, so that 80mm receipt width wrapping cannot corrupt millimetre label geometry.
25. As a Store Device operator, I still do not want POS billing to own label printers in this phase, unless a later spec explicitly moves administrator print onto a packing terminal. This phase may send bytes to a label printer from the administrator print dialog without coupling that path to sale-complete receipt printing.
26. As a packaging-store owner, I want one Label Template to survive swapping a TSC-class printer for a Zebra-class printer by changing printer family, so that a hardware upgrade is not a redesign.
27. As a scanner operator, I want a label printed via TSPL or ZPL to resolve the same Product as the browser-printed label for the same Product Code, so that checkout does not care which adapter pressed the pack.

## Implementation Decisions

- Add an output adapter behind the existing label renderer seam. Callers still pass Label Template + Product + Label Job. They receive a Print Payload tagged with family: `html` (Phase 1), `tspl`, or `zpl`.
- Do not add a second Template document. Adapters must not invent parallel x/y coordinate systems; convert mm to printer dots using a declared dpi (203 dpi default, override if Label Stock carries dpi later).
- Printer family is stored on the Label Template with an optional Label Job override. Invalid family values are rejected at the contract boundary.
- Keep-Outs compile to absence of draw commands in that rectangle, not to white rectangles that might still flash or darken pre-printed thermal coating unless a white patch is explicitly required (barcode quiet-zone white patch is required).
- Barcode payload generation stays in the shared renderer (EAN-13 module pattern, Code 128 data). Adapters emit native barcode commands where the language can represent the symbology; they must not re-encode a different payload. If a firmware cannot draw the symbology, fail the Job rather than substitute another symbology.
- Copy count: HTML adapter keeps one page per label/row as in Phase 1. TSPL/ZPL adapters should use native print-quantity where safe, still printing only one test copy for test-print.
- Changing printer family, dpi, or print offset resets test-scan confirmation, in addition to Phase 1's Template/geometry key.
- Gujarati: if the printer family cannot rasterize or embed the Phase 1 Gujarati-capable font, the adapter must fail with an actionable error in this phase rather than printing latin transliteration. A rasterized-text fallback (render glyph bitmap from the same font the preview uses) is allowed if it preserves millimetre box and does not change barcode payload.
- Print offset is a pair of millimetre deltas applied at compile time, default 0, 0. It is calibration, not a second layout.
- Do not route label payloads through the 80mm ESC/POS receipt builder, even if a device happens to share a USB vendor with a receipt printer.
- POS sale-complete printing remains receipts only. This phase does not auto-print a packaging label when a Sale is committed.
- Transport (how bytes reach the printer: USB raw, Windows driver, network) should stay behind a small send interface. Prefer: compile payload in tests without requiring hardware; sending to a device is integration. If the administrator session can only reach a printer via the browser, TSPL/ZPL may still be offered as downloadable payload plus a documented send path — but the adapter's contract is the payload bytes, not a particular USB library.
- Phase 2 underlay remains non-printed in every adapter.

Canonical payload tagging (adapters must agree with tests):

```ts
type LabelPrintPayload =
  | { family: "html"; html: string }
  | { family: "tspl"; commands: string }
  | { family: "zpl"; commands: string }
```

## Testing Decisions

- Test at the label renderer/adapter seam: same Label Template + Product + Label Job fixtures produce HTML (already covered in Phase 1) and TSPL/ZPL whose observable properties match.
- Assert on payload behaviour, not on a particular printer SDK:
  - Stock width/height and gaps appear as size/gap commands.
  - Keep-Out rectangles contain no draw commands (text, barcode, or box) whose origin/box intersects the Keep-Out.
  - Barcode commands carry the exact Product Code payload used by the HTML renderer for that Job.
  - EAN-13 versus Code 128 is the Template's symbology; substitution is a failure.
  - Rotation is present in the native command set.
  - Copy count of 1 for test-print; bulk count uses native quantity or repeated jobs as specified, never silent truncation.
  - Missing optional bindings omit commands.
  - Unsupported font/feature fails the compile rather than dropping Elements silently.
  - Print offset shifts all draw origins by the declared millimetres (within dot rounding).
- Round-trip identity test: HTML preview encoded code, TSPL payload encoded code, and ZPL payload encoded code are equal for the same Job.
- Do not parse vendor documentation comments or pretty-print order of commands unless order is required for the language.
- Do not test USB device discovery in unit tests. A send adapter can be faked.
- Prior art: Phase 1 `buildInternalLabelDocument`-style tests that already freeze EAN-13 modules, quiet zones, and page geometry. Reuse those fixtures as adapter inputs.
- Regression: receipt ESC/POS tests still pass unchanged; no receipt test should need a Label Template fixture.
- Hardware acceptance: a TSPL (or ZPL) test label on the store's actual pre-printed stock must scan to the intended Product before bulk print is enabled. Automated tests do not waive that Phase 1 gate.

## Out of Scope

- Phase 2 designer UX. Adapters must not require drag, underlay, or default-Template features.
- New catalog bindings, nutrition schema changes, or On-pack MRP in Billing.
- ESC/POS as a label language, 80mm receipt wrapping, and printing labels at sale commit.
- Inventory batch tracking, automatic expiry writeback, and FSSAI legal engines.
- Printer fleet management, cloud print queues, and multi-store printer routing beyond "this administrator Job compiles to this family."
- Additional families (CPCL, ESC/POS labels, EPL) unless added as extra adapters later; this phase is TSPL and ZPL plus existing HTML.
- Hardcoded per-customer command dumps.

## Further Notes

- If Laxmi's live printer is TSPL-only and ignores browser page size, this phase is a go-live dependency, not polish. Measure that before promising a packing-line date on Phase 1 alone.
- Vyapar's "configure labels in Printer Settings as well" is the failure mode this phase removes: Hisab's Label Stock millimetres should drive the printer language instead of a parallel driver UI that can disagree with the canvas.
- Test seam is still the label renderer, now with multiple adapters. Do not open a billing or receipt seam. Catalog Template contract is unchanged except optional printer-family and offset fields.
