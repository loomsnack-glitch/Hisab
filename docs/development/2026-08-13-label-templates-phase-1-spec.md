# Label Templates Phase 1: Stock, Composer, Profile, and Print Jobs

**Status:** ready-for-agent

**Phase:** 1 of 3

**Blocked by:** none. Grocery barcode V1 internal label printing is already in the product and is the starting point this phase replaces.

**Unlocks:** Phase 2 (visual designer polish) and Phase 3 (TSPL/ZPL printer-language adapters).

## Problem Statement

Organizations can print store-only labels today, but only as two hardcoded layouts — an A4 3×8 sheet and a 58×40 mm thermal sticker — with a fixed stack of Internal Product Code barcode, optional Product name, and optional selling price. That cannot serve a packaging store whose roll is already 25–30% pre-printed with branding, and whose remaining area must hold a creative mix of ingredients, On-pack MRP, packed date, expiry, batch number, net weight, nutrition table, and a barcode that may be rotated or small. Competing POS tools such as Vyapar let a store set label width, height, labels per row, and gap, but still lock the printed content to Header / barcode / item code / line 1 / line 2. Hardcoding one customer's layout as a third enum would close one deal and then require a code change for every new roll. Hisab needs Organization-owned designs so any store can compose its own printable area without waiting on a software release.

## Solution

Replace the layout enum with Organization-owned Label Templates. A Label Template stores Label Stock (millimetre size, labels per row, gaps, sheet vs roll), Keep-Outs for pre-printed regions, and freely placed Label Elements bound to Product fields, Product Label Profile fields, Label Job values, or static text. Administrators compose stock and design in label settings — not as a prescribed barcode-heavy default. The existing A4 and thermal layouts become seeded Label Templates so current stores do not regress. Printing from the products list becomes: pick a Label Template, fill Label Job values the design uses, test-print and scan, then bulk print. The renderer stays a separate presentation seam from receipt printing and still emits a browser print document in this phase.

## User Stories

1. As an organization administrator, I want Label Templates to belong to my Organization, so that another Organization cannot see or overwrite my roll designs.
2. As an organization administrator, I want to create a Label Template with a name, so that I can tell a kirana sticker apart from a packaging roll.
3. As an organization administrator, I want to set Label Stock width and height in millimetres, so that the print page matches the physical sticker.
4. As an organization administrator, I want to set how many labels print per row, so that 1-across and 2-across rolls both work.
5. As an organization administrator, I want to set horizontal gap in millimetres, so that side-by-side labels on a row land on the cut lines.
6. As an organization administrator, I want to set feed-direction (vertical) gap in millimetres, so that successive labels on a roll or sheet row spacing match the stock.
7. As an organization administrator, I want to mark Label Stock as a sheet or a roll, so that A4-style grids and single-sticker rolls use the correct paging.
8. As an organization administrator, I want sheet Label Stock to define page size and row/column counts, so that partially used A4 sheets still have a starting position.
9. As an organization administrator, I want roll Label Stock to treat each sticker (or each row of stickers) as one print page sized to the stock, so that a thermal printer receives one label at a time.
10. As an organization administrator, I want to add Keep-Out rectangles in millimetres, so that Hisab does not print on pre-printed branding, holograms, or dietary marks.
11. As an organization administrator, I want a convenience inset (top, right, bottom, left millimetres) that creates Keep-Outs, so that a 25–30% branded header is quick to reserve without drawing four rectangles by hand.
12. As an organization administrator, I want the design canvas to show Keep-Outs as shaded regions, so that I can see the leftover printable area before placing content.
13. As an organization administrator, I want no Label Element to be mandatory, so that a store is not forced into a 90% horizontal barcode layout.
14. As an organization administrator, I want to add a Product name Label Element, so that the pack shows the catalog name where I place it.
15. As an organization administrator, I want to add a Product Code barcode Label Element, so that checkout scanning still resolves the Product.
16. As an organization administrator, I want to choose barcode symbology per barcode Label Element, so that an Internal Product Code can print as EAN-13 while an alphanumeric store code can print as Code 128.
17. As an organization administrator, I want to rotate a barcode 0, 90, 180, or 270 degrees, so that a vertical barcode can sit in a side column.
18. As an organization administrator, I want to size a barcode in millimetres, so that it can be large on a simple sticker or small beside a nutrition table.
19. As an organization administrator, I want human-readable digits optionally shown with a barcode, so that staff can recover a code if a scan fails.
20. As an organization administrator, I want EAN-13 barcodes to keep required quiet zones and black bars on a forced white patch, so that watermarked stock still scans.
21. As an organization administrator, I want a barcode Label Element to encode only the Product Code, so that Product text never changes scan identity.
22. As an organization administrator, I want to add bound text for selling price, so that a simple store sticker can still show price.
23. As an organization administrator, I want a warning when selling price or On-pack MRP is on the Label Template, so that I know a later price change requires reprinting.
24. As an organization administrator, I want to add bound text for On-pack MRP, so that packaging labels can show MRP without using Billing selling price.
25. As an organization administrator, I want to add bound text for ingredients, net weight, and unit selling price text, so that FSSAI-style packs can show those facts where I place them.
26. As an organization administrator, I want to add a nutrition table Label Element, so that per-100g rows print as a formatted table rather than a paragraph.
27. As an organization administrator, I want to add Label Job bound text for packed date, expiry date, and batch number, so that values that change every packing run are not frozen on the Product.
28. As an organization administrator, I want to add static text Label Elements, so that phrases such as "Inc. of all Taxes" or "100% NATURAL" can sit on the design without being catalog fields.
29. As an organization administrator, I want to add a box Label Element, so that I can frame On-pack MRP or a nutrition block.
30. As an organization administrator, I want to place, move, resize, and delete any Label Element on a millimetre canvas, so that each store can invent its own pattern in the leftover area.
31. As an organization administrator, I want to set font size, weight, and alignment on text Label Elements, so that a product name can be large while dates stay small.
32. As an organization administrator, I want text Label Elements to support Latin and Gujarati glyphs with a Gujarati-capable web font, so that names such as Jeera Bhakri print rather than tofu.
33. As an organization administrator, I want a missing optional binding to omit that Label Element at print time, so that a Product without ingredients does not print an empty "Ingredients:" block.
34. As an organization administrator, I want the composer to use click-to-place plus a property inspector for x, y, width, height, rotation, and style, so that I can build Laxmi's layout in the app without waiting for a later drag-and-drop studio.
35. As an organization administrator, I want a live preview of the Label Template using sample Product and Label Job values, so that I can see the design before saving.
36. As an organization administrator, I want to save, rename, duplicate-by-editing, deactivate, and delete my Label Templates, so that old rolls can be retired without deleting print history of past jobs in this phase (jobs are not stored as records yet).
37. As an organization administrator, I want my Organization to receive seeded A4 sheet and 58×40 mm thermal Label Templates that match today's printed output, so that existing kirana sticker workflows keep working.
38. As an organization administrator, I want the old layout dropdown of "A4" versus "thermal" to go away in favor of picking a Label Template, so that custom designs appear in the same printer option.
39. As an organization administrator, I want Label Template settings to live in the administrator catalog/organization workspace, so that cashiers cannot change packaging design from a Store Device.
40. As an organization administrator, I want a Product Label Profile on a Product, so that ingredients, nutrition rows, net weight, unit selling price text, shelf life in days, and On-pack MRP can be saved once and reused on every Label Job.
41. As an organization administrator, I want Product Label Profile fields to be optional, so that a Product that only needs a barcode sticker is not blocked.
42. As an organization administrator, I want On-pack MRP to stay off Sale Item snapshots and out of Billing totals, so that packaging text cannot become a cashier-trusted price.
43. As an organization administrator, I want to print a label for any Product that has a Product Code, so that manufacturer codes and Internal Product Codes can both appear on packs.
44. As an organization administrator, I want print to stay unavailable for a Product with no Product Code, so that a pack cannot be printed with an empty barcode identity.
45. As an organization administrator, I want the print dialog to list my Organization's active Label Templates, so that I choose the design that matches the roll currently in the printer.
46. As an organization administrator, I want the print dialog to ask only for Label Job fields that the chosen Label Template actually binds, so that a barcode-only sticker does not demand packed date.
47. As an organization administrator, I want copy count, so that I can print the number of packs I am labelling.
48. As an organization administrator, I want sheet starting position when the chosen Label Template uses sheet Label Stock, so that a partially used A4 sheet is not wasted.
49. As an organization administrator, I want packed date, expiry date, and batch number on the Label Job when bound, so that today's stock does not reprint yesterday's packed date.
50. As an organization administrator, I want expiry date to default from packed date plus Product Label Profile shelf life in days when shelf life is set, so that I can accept or override the date rather than calculate it.
51. As an organization administrator, I want a preview of this Product on the chosen Label Template before printing, so that I can see real name, code, and profile values in the leftover area.
52. As an organization administrator, I want to test-print one label, so that I can check alignment on the real roll, including Keep-Outs versus pre-printed branding.
53. As an organization administrator, I want bulk print disabled until I confirm that the test label scanned on production-like hardware and stock, so that a bad design is not deployed across a batch.
54. As an organization administrator, I want changing Label Template, Keep-Outs-affecting stock, printed bindings, or barcode rotation to reset the test-scan confirmation, so that I cannot bulk-print a design I have not scanned.
55. As an organization administrator, I want an EAN-13 barcode Label Element to refuse print when the Product Code is not a valid EAN-13 value, so that an alphanumeric store code cannot be silently drawn as broken EAN bars.
56. As an organization administrator, I want a Code 128 barcode Label Element to encode the Product Code as stored, so that values such as VR000001 print and scan as the same opaque text Hisab already stores.
57. As an organization administrator, I want label printing to stay separate from receipt printing, so that a packaging-roll experiment cannot break 80mm ESC/POS receipts.
58. As a cashier, I want Billing selling price, discounts, drafts, commits, payments, receipts, bundles, Combos, and Add-Ons unchanged, so that packaging labels are a catalog/print feature rather than a billing change.
59. As a Store Device operator, I want no Label Template editor and no label print dialog on the POS, so that packaging design and bulk label printing remain administrator work in this phase.
60. As a future packaging store, I want to compose a completely different Label Template than Laxmi Foods without a software change, so that a new roll is a saved design rather than a new layout enum.
61. As a Hisab maintainer, I want today's A4 and thermal print behaviour preserved by seeded Label Templates, so that grocery barcode V1 stores do not lose quiet zones, human-readable digits, copy count, starting position, or the selling-price reprint warning.
62. As a Hisab maintainer, I want the renderer to accept a Label Template, Product (including Product Label Profile), and Label Job and return preview SVG plus a printable HTML document, so that UI, tests, and later printer adapters share one interface.
63. As a compliance-aware administrator, I want Hisab to print exactly the facts I configured, so that the product does not claim a pack is FSSAI-complete merely because a nutrition table exists.

## Implementation Decisions

- Deepen the existing internal label printing presentation seam rather than adding a parallel print module. The renderer interface becomes: given a Label Template, a Product with its Product Label Profile, and a Label Job, return a preview and a printable document. Receipt ESC/POS and browser receipt text stay unused by this path.
- Do not introduce a layout enum such as `"a4" | "thermal" | "laxmi"`. A4 and thermal survive only as seeded Label Template records. A packaging-store design is another record in the same table.
- Label Templates are Organization-scoped catalog resources, administrator-only, analogous to how Add-Ons are Organization-scoped and POS devices cannot mutate them.
- Label Stock, Keep-Outs, and Label Elements are stored as structured data on the Label Template (validated JSON), not as generated source code.
- Coordinates and sizes are millimetres. The renderer converts mm to the print document. UI inspectors edit mm, not CSS pixels.
- Keep-Outs are rectangles. A content-inset helper may create those rectangles, but the stored model is rectangles so a right-side brand column and a holographic strip are both representable.
- The renderer must not draw Label Elements that intersect a Keep-Out; save and print validate this and reject the Template or the offending Element.
- Label Element types in this phase: bound text, static text, barcode, nutrition table, box. Image Label Elements are deferred unless a Product already has an image that a store explicitly places; pre-printed logos are Keep-Outs, not images Hisab reprints by default.
- Barcode symbologies in this phase: EAN-13 and Code 128. EAN-13 keeps the existing Internal Product Code rules (13 digits, `04` prefix and check digit when the Product Code kind is `internal_rcn`; otherwise any valid EAN-13 check digit). Code 128 encodes the Product Code as opaque text.
- Barcode rotation is 0 | 90 | 180 | 270 degrees around the Element's millimetre box.
- EAN-13 quiet zones and black-on-forced-white remain mandatory for EAN-13 Elements. Quiet-zone failure is a renderer error, not a visual maybe.
- Bindings allowed in this phase:
  - `product.name`
  - `product.productCode`
  - `product.price` (selling price; reprint warning)
  - `productLabel.mrp` (On-pack MRP; reprint warning)
  - `productLabel.ingredients`
  - `productLabel.netWeight`
  - `productLabel.unitSellingPriceText`
  - `productLabel.nutrition` (table only)
  - `job.packedDate`
  - `job.expiryDate`
  - `job.batchNumber`
  - static text
- Product Label Profile is a 1:1 extension of Product, optional fields, Organization-scoped through the Product. It is not inventory, not a batch ledger, and not part of Trusted Catalog Snapshot Pricing. Sale Item snapshots continue to store Product name and selling price only.
- On-pack MRP must not be accepted as a Billing price and must not appear on receipts in this phase.
- Nutrition is an ordered list of `{ name, quantity, unit }` rows. The table Label Element renders those rows; there is no hardcoded nutrient list, so stores can print the rows they actually use.
- Shelf life is an optional whole number of days on the Product Label Profile. The print dialog may default `job.expiryDate` from `job.packedDate + shelfLifeDays`; the stored Label Job values are the dates actually printed.
- Label Job is a print-time payload, not a persisted batch/inventory record in this phase. Packed date, expiry, and batch number are not written back onto the Product unless the administrator edits the Product Label Profile separately.
- Print is offered in the administrator products list when Barcode Scanning is enabled and the Product has a Product Code of either kind. The previous `internal_rcn`-only gate is lifted so packaging SKUs can print.
- Store Devices do not gain Label Template CRUD or label printing in this phase.
- Seeded templates: one A4 sheet Label Template (3 columns × 8 rows, 70×35 mm cells, optional name above barcode, optional selling price below) and one roll Label Template (58×40 mm, 1 per row) that preserve current output, quiet zones, copy count, starting position, and selling-price warning.
- Composer acceptance bar is click-to-place plus property inspector on a scaled millimetre canvas with Keep-Out shading and live preview. Drag-and-drop may be used if it does not delay this phase; it is not required to close Phase 1.
- Browser print remains the only output adapter in this phase: HTML/CSS `@page` sized from Label Stock. TSPL/ZPL are Phase 3.
- Test-print plus successful-scan confirmation remains required before bulk print. The confirmation key includes Label Template identity plus the set of printed bindings and barcode geometry so a design change forces a new test.
- Copy count remains a whole number from 1 to 1000. Sheet starting position remains 1 through sheet capacity.
- Hisab does not assert legal completeness of a pack. UI copy must not say the label is FSSAI-approved.
- Existing whole-count billing, Product lifecycle, Product Code reservation/reuse, and receipt printing rules are unchanged.

Canonical Label Template shape the renderer and catalog contract must agree on:

```ts
type LabelTemplate = {
  name: string
  status: "active" | "inactive"
  stock: {
    widthMm: number
    heightMm: number
    labelsPerRow: number
    horizontalGapMm: number
    verticalGapMm: number
    media: "sheet" | "roll"
    sheet?: {
      pageWidthMm: number
      pageHeightMm: number
      columns: number
      rows: number
    }
  }
  keepOuts: Array<{
    xMm: number
    yMm: number
    widthMm: number
    heightMm: number
  }>
  elements: LabelElement[]
}

type LabelElement =
  | {
      id: string
      type: "text"
      xMm: number
      yMm: number
      widthMm: number
      heightMm: number
      rotationDeg: 0 | 90 | 180 | 270
      text: {
        source: "static" | "binding"
        staticValue?: string
        binding?: string
        fontSizeMm: number
        fontWeight: "normal" | "bold"
        align: "left" | "center" | "right"
      }
    }
  | {
      id: string
      type: "barcode"
      xMm: number
      yMm: number
      widthMm: number
      heightMm: number
      rotationDeg: 0 | 90 | 180 | 270
      barcode: {
        symbology: "ean13" | "code128"
        showHumanDigits: boolean
      }
    }
  | {
      id: string
      type: "table"
      xMm: number
      yMm: number
      widthMm: number
      heightMm: number
      rotationDeg: 0 | 90 | 180 | 270
      table: { binding: "productLabel.nutrition" }
    }
  | {
      id: string
      type: "box"
      xMm: number
      yMm: number
      widthMm: number
      heightMm: number
      rotationDeg: 0 | 90 | 180 | 270
      box: { strokeWidthMm: number }
    }
```

## Testing Decisions

- Test externally visible behaviour at the highest existing seams. Prefer one renderer seam and one catalog seam. Do not test private SVG helpers, React tree shape, or CSS class names except where they are part of the printed document contract already asserted by grocery barcode label tests.
- Renderer tests (prior art: existing Internal Product Code label printing tests) must assert:
  - Seeded A4 and thermal Label Templates still render exact Internal Product Code EAN-13 modules, quiet zones, human-readable digits, optional name/price placement, copy count, A4 starting position, selling-price warning, and black bars on white.
  - A custom Label Template with Keep-Outs leaves those rectangles undrawn.
  - A Label Element that intersects a Keep-Out is rejected.
  - Barcode rotation of 90 degrees still encodes the same Product Code.
  - EAN-13 rejects a non-EAN Product Code; Code 128 encodes opaque text such as `VR000001`.
  - Missing optional bindings omit the Element rather than printing blank labels or placeholders that look like data.
  - Page size in the printable document matches Label Stock millimetres; labels-per-row and gaps affect placement.
  - Product text never appears inside the encoded barcode payload.
- Catalog contract and service tests (prior art: Product Code catalog schema/service tests and Add-On organization scoping) must assert:
  - Label Templates are Organization-scoped; another Organization cannot read or mutate them.
  - Administrator-only create/update/deactivate/delete.
  - Invalid millimetre values, empty names, unknown bindings, and intersecting Keep-Outs are rejected at the contract boundary.
  - Product Label Profile optional fields round-trip; clearing them does not require deleting the Product.
  - Updating Product Label Profile does not change Product selling price, discount, Product Code, or Sale Item snapshot behaviour.
  - On-pack MRP is not required for billing and is not copied onto sale snapshots.
- Print-gating tests must assert bulk print is refused until test print and scan confirmation for the current Template and printed-binding signature, and that changing Template or barcode geometry resets confirmation.
- Regression tests must reuse existing catalog, POS, billing, and receipt tests to prove receipts, Trusted Catalog Snapshot Pricing, whole-count quantities, and Product Code scanning are untouched.
- Hardware acceptance remains a human check: a composed packaging Label Template is accepted only after a real scan on production-like printer and the store's actual pre-printed stock. Automated tests cannot replace that gate.

## Out of Scope

- Phase 2 visual-designer polish: drag handles as the acceptance bar, snap-to-millimetre guides, blank-roll photo underlay, align/distribute tools, and "set default Label Template" convenience.
- Phase 3 printer-language adapters: TSPL, ZPL, and any direct-to-device label protocol. Browser print is the only output.
- Inventory, stock deduction, batch ledgers, manufacturing-date tracking as inventory, and treating Label Job batch numbers as stock identity.
- Writing packed date, expiry, or batch number back onto the Product automatically after a Label Job.
- Using On-pack MRP in Billing, cart display, receipts, or reports.
- FSSAI license validation, legal pack completeness, vegetarian-mark generation when it is already pre-printed, and claiming regulatory approval.
- A Product Code becoming globally registered, or presenting Internal Product Codes as GTINs.
- Variable-weight barcodes, price-embedded barcodes, and weighing-scale parsing.
- POS Store Device label printing or Label Template editing.
- Reusing the 80mm ESC/POS receipt module for labels.
- Image/logo upload onto Label Templates beyond optionally placing the existing Product image if implemented as a stretch; default is Keep-Outs for pre-printed art.
- QR codes, additional symbologies beyond EAN-13 and Code 128, and a template marketplace across Organizations.
- Hardcoding any one customer's layout (including Laxmi Foods) as a named software layout.

## Further Notes

- Laxmi Foods is the motivating customer, not a layout identifier. Their 25–30% branded header is a Keep-Out. Their nutrition table, dates, and rotated barcode are Label Elements. The same composer must be able to save a different store's design without a release.
- Vyapar's custom-size modal is the Label Stock subset only. Phase 1 is successful only if a store can change the design pattern in the leftover area, not merely the sticker millimetres.
- Printer brand/model and measured millimetres for Laxmi's blank roll are still unknown. Phase 1 can close the software deal with browser print; if their machine ignores Windows page size, Phase 3 becomes a go-live dependency rather than a later enhancement.
- Grocery barcode V1 explicitly excluded MRP, batches, and expiry. This phase re-introduces On-pack MRP, packed/expiry dates, and batch number only as label-binding data. That does not reopen those items as billing or inventory features.
- Test seams for this phase are exactly two: the label renderer (preview + printable document) and the Organization catalog (Label Template CRUD + Product Label Profile). UI arrangement is not a third test seam.
