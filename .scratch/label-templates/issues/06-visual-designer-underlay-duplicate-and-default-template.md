# 06 — Visual designer, underlay, duplicate, and default Template

**What to build:** Administrators design on the same Label Template document with drag, snap, and nudge, align to a photo of blank Label Stock that never prints, duplicate a working Template, and mark an Organization default so the print dialog opens on the roll usually in the printer.

**Blocked by:** 05 — Product Label Profile and Label Job fields

**Status:** ready-for-agent

- [ ] Drag, resize, 90-degree rotate, 0.5/1 mm keyboard nudge, millimetre snap grid, and snap to Element and Keep-Out edges update stored millimetre geometry; save still passes the Phase 1 Label Template contract.
- [ ] A drop that would intersect a Keep-Out is prevented in the designer and still rejected at the catalog/renderer seam.
- [ ] An administrator can upload an Organization-scoped blank-roll photo as a non-printed underlay, scale it to Label Stock millimetres, and toggle visibility/opacity; printable output contains no underlay.
- [ ] Duplicate copies Stock, Keep-Outs, Elements (new ids), and underlay reference into a new named Template; default Template is an Organization setting that clears if that Template is deactivated or deleted.
- [ ] Overflow and undersized EAN-13 quiet-zone warnings appear in the designer; scan identity cannot change by dragging a barcode.
- [ ] Designer edits reset test-scan confirmation; Store Devices still cannot open the designer.
- [ ] Tests assert the saved document, duplicate/default catalog behaviour, and underlay absence from print — not drawing-library internals.
