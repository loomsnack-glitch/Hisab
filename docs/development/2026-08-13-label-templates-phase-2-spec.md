# Label Templates Phase 2: Visual Designer, Underlay, and Template Reuse

**Status:** ready-for-agent

**Phase:** 2 of 3

**Blocked by:** Phase 1 — Label Templates stock, composer, Product Label Profile, and print jobs. This phase must not introduce a second document model.

**Unlocks:** faster customer self-serve design. Phase 3 printer adapters do not require this phase.

## Problem Statement

Phase 1 gives every Organization a real Label Template — Label Stock, Keep-Outs, and freely placed Label Elements — but the composer only needs click-to-place and a millimetre inspector to be correct. Packaging stores will still struggle to align a design to a pre-printed roll if they cannot drag Elements, snap to a millimetre grid, see a photo of the blank stock under the canvas, duplicate a working Template for a second roll, or mark a default Template for everyday printing. Without that, Hisab still wins on capability versus Vyapar's fixed field stack, but administrators will keep asking Hisab to author layouts for them, which recreates the hardcoded-layout bottleneck in slow motion.

## Solution

Keep the Phase 1 Label Template document unchanged and replace the composer UX with a visual designer on top of it. Administrators drag, resize, and rotate Label Elements on a millimetre canvas, snap to a grid and to other Elements, see Keep-Outs and an optional blank-roll photo as an underlay, duplicate Templates, and choose a default Template for the print dialog. Save still writes the same Label Template data the Phase 1 renderer already prints. This phase is successful when a store can compose a new roll from a photo of blank stock without Hisab editing JSON or millimetre fields by hand, while seeded A4/thermal Templates and print-gating remain intact.

## User Stories

1. As an organization administrator, I want to drag a Label Element across the canvas, so that I can place a barcode beside a nutrition table without typing millimetres first.
2. As an organization administrator, I want drag to update the stored millimetre coordinates, so that what I see is what Phase 1 will print.
3. As an organization administrator, I want resize handles on a selected Label Element, so that I can grow a product name or shrink a barcode visually.
4. As an organization administrator, I want to rotate a selected Label Element in 90-degree steps from the canvas, so that a vertical barcode does not require a dropdown hunt.
5. As an organization administrator, I want a millimetre snap grid I can toggle, so that edges line up on whole millimetres rather than fractional drift.
6. As an organization administrator, I want snap to other Label Element edges and centers, so that a box can hug a nutrition table without guesswork.
7. As an organization administrator, I want snap to Keep-Out edges, so that content can sit flush against a pre-printed brand column without overlapping it.
8. As an organization administrator, I want align and distribute actions for multiple selected Label Elements, so that a stack of packed date, expiry, and batch lines can be evened out.
9. As an organization administrator, I want undo and redo for canvas edits in the current session, so that a bad drag is recoverable before save.
10. As an organization administrator, I want keyboard nudge by 0.5 mm and 1 mm, so that final alignment can be done without a shaky pointer.
11. As an organization administrator, I want zoom and pan on the canvas, so that a large packaging label remains editable on a laptop screen.
12. As an organization administrator, I want Keep-Outs to remain visible while dragging, so that I cannot drop a barcode onto pre-printed branding by accident.
13. As an organization administrator, I want a drag that would intersect a Keep-Out to be rejected or snapped back, so that the Phase 1 intersection rule is enforced in the designer rather than only at save.
14. As an organization administrator, I want to draw or resize Keep-Out rectangles on the canvas, so that a holographic strip can be marked by tracing rather than by inset fields alone.
15. As an organization administrator, I want to upload a photo of the blank Label Stock as an underlay, so that I can align Hisab's print to the real pre-printed header, veg mark, and security strip.
16. As an organization administrator, I want the underlay to scale to Label Stock millimetre width and height, so that the photo is a calibration aid rather than a second layout.
17. As an organization administrator, I want to toggle underlay visibility and opacity, so that I can check contrast of black print against the watermarked stock.
18. As an organization administrator, I want the underlay to never become printed output, so that Hisab does not reprint the brand art that is already on the roll.
19. As an organization administrator, I want a palette of bindings and Element types I can drag onto the printable area, so that adding nutrition or expiry is a placement action rather than a form row.
20. As an organization administrator, I want the property inspector to remain available, so that I can still type exact millimetres when snap is not enough.
21. As an organization administrator, I want a live preview that uses a real Product from my catalog, so that I can proof "BADAM" and its barcode instead of only lorem sample data.
22. As an organization administrator, I want to duplicate a Label Template, so that a second roll size can start from a known-good packaging design.
23. As an organization administrator, I want duplicated Templates to copy Stock, Keep-Outs, Elements, and underlay reference, so that I do not rebuild Keep-Outs by hand.
24. As an organization administrator, I want to rename a duplicate independently, so that "Laxmi 80mm pack" and "Laxmi 50mm pack" can coexist.
25. As an organization administrator, I want to mark one active Label Template as the Organization default, so that the print dialog opens on the roll that is usually in the printer.
26. As an organization administrator, I want the print dialog to still let me pick any other active Label Template, so that a default is a shortcut rather than a lock.
27. As an organization administrator, I want deactivating the default Template to clear default rather than print an inactive design, so that retired rolls disappear from everyday printing.
28. As an organization administrator, I want seeded A4 and thermal Templates to remain editable in the visual designer, so that a kirana store can nudge those designs without losing them as data.
29. As an organization administrator, I want changing the designer layout to reset test-scan confirmation on the next bulk print, so that a dragged barcode cannot skip hardware validation.
30. As an organization administrator, I want to lock a barcode's encoded value to the Product Code while dragging, so that visual design cannot change scan identity.
31. As an organization administrator, I want multi-select copy and paste of Label Elements inside a Template, so that a repeated date block is fast to clone.
32. As an organization administrator, I want delete and hide of Label Elements from the canvas, so that I can drop nutrition from a small sticker without making a new Template from scratch.
33. As an organization administrator, I want the designer to warn when bound text overflows its millimetre box at the current font size, so that Gujarati product names are not silently clipped on press.
34. As an organization administrator, I want the designer to warn when an EAN-13 barcode box is too small for quiet zones, so that I find scan failure before test print.
35. As an organization administrator, I want underlay upload to be Organization-scoped and administrator-only, so that a Store Device cannot change packaging art.
36. As a Hisab maintainer, I want every designer save to pass the Phase 1 Label Template contract, so that Phase 3 printer adapters can ignore the designer entirely.
37. As a Hisab maintainer, I want designer tests to assert the saved document rather than canvas library internals, so that replacing the drawing library does not rewrite the spec.
38. As a packaging-store owner, I want to compose a new roll from a blank-stock photo without asking Hisab to author millimetre JSON, so that the product hook is self-serve design rather than a services queue.

## Implementation Decisions

- Do not change the Phase 1 Label Template document, bindings, Product Label Profile, Label Job payload, renderer interface, or browser print adapter. Phase 2 is a composer UX on the same catalog resource.
- The visual designer reads and writes Label Template millimetre geometry. If the drawing library uses pixels internally, convert at a declared pixels-per-millimetre scale; stored and printed values remain mm.
- Underlay is a Label Template field: an optional Organization-scoped image reference plus opacity. It is preview-only. The renderer must not paint the underlay onto the printable document.
- Default Label Template is an Organization setting pointing at one Label Template id in that Organization, or null. Deleting or deactivating that Template nulls the setting.
- Duplicate is a server-side copy of Stock, Keep-Outs, Elements (new Element ids), and underlay reference, with a new name. It does not copy print-job history because Phase 1 does not persist jobs.
- Snap grid defaults to 1 mm and may offer 0.5 mm. Stored coordinates after snap must remain numbers the Phase 1 contract accepts.
- Keep-Out intersection stays a hard error, identical to Phase 1. The designer should prevent the drop, not only fail save.
- Overflow and quiet-zone warnings are advisory in the designer except where Phase 1 already hard-fails (EAN-13 quiet zones, Keep-Out intersection, invalid binding). Do not silently auto-shrink text in ways that surprise print output; warn, then let the administrator resize.
- Test-scan confirmation key from Phase 1 already includes Template identity and barcode geometry; dragging must change that key so bulk print re-gates.
- Administrator-only, Organization-scoped rules from Phase 1 still apply. POS Store Devices still do not open the designer.
- Seeded A4 and thermal Templates stay ordinary records. Do not special-case them in the designer beyond whatever Phase 1 seeding already did.
- Receipt printing remains unused.

## Testing Decisions

- Do not test the drawing library (drag event plumbing, transformer handles, canvas node types). Test the Label Template document that save produces and the renderer output that document causes.
- Catalog tests must assert duplicate copies Stock, Keep-Outs, Elements, and underlay reference into a new Template id; default Template setting rejects ids from another Organization; deactivating the default clears it.
- Renderer tests from Phase 1 must still pass unchanged against designer-saved documents, including seeded A4/thermal equivalence, quiet zones, Keep-Outs, and rotation.
- Underlay must be absent from printable HTML/SVG while present on the designer canvas representation used for preview-only display.
- A document that would intersect a Keep-Out must still be rejected at the catalog/renderer seam even if a UI bug allowed the drag.
- Overflow and undersized-barcode warnings are UI behaviour; if they are derived by a pure function from Template plus sample text, test that function's warnings, not the toast component.
- Prior art: Phase 1 renderer tests and catalog Label Template contract tests. Extend those; do not add a third "canvas" test seam.
- Regression: print dialog still requires test print and scan; receipts and billing unchanged.

## Out of Scope

- Phase 3 TSPL/ZPL or any change to print transport.
- New bindings, new Element types, QR codes, and image Elements beyond Phase 1's rules, except underlay which is explicitly non-printed.
- Collaborative real-time editing, version history, and a cross-Organization template marketplace.
- Automatic computer-vision detection of Keep-Outs from the blank-roll photo. The photo is an underlay for human tracing, not an ML crop.
- POS-side designer or cashier-authored Templates.
- Inventory batches, FSSAI validation, and On-pack MRP in Billing (still forbidden).
- Rewriting the renderer in a canvas library. Print still goes through the Phase 1 document renderer.

## Further Notes

- If Phase 1 already used drag opportunistically, this phase is the acceptance bar for snap, underlay, duplicate, default Template, overflow/quiet-zone warnings, and keyboard nudge — not a second inventing of drag.
- The unique hook versus Vyapar is still "design in the leftover area." Phase 2 makes that hook usable by the customer without Hisab on the call.
- Test seam remains the Phase 1 pair: renderer document and catalog Template contract. The designer is an adapter onto that contract.
