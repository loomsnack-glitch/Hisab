# 08 — ZPL printer adapter

**What to build:** The same millimetre Label Template compiles to ZPL so a store can move from a TSC-class printer to a Zebra-class printer by changing printer family, without redesigning the label or changing scan identity.

**Blocked by:** 07 — TSPL printer adapter

**Status:** ready-for-agent

- [ ] Printer family `zpl` compiles the Phase 1 Label Template document to a ZPL payload tagged distinctly from HTML and TSPL.
- [ ] ZPL uses the same millimetre Stock, gaps, Keep-Outs, bindings, barcode payload, rotation, copy-count rules, print offset, and test-scan reset behaviour as the TSPL adapter.
- [ ] HTML preview encoded code, TSPL encoded code, and ZPL encoded code are equal for the same Label Job.
- [ ] Unsupported ZPL features fail the compile rather than dropping Label Elements silently; receipt ESC/POS remains unused.
- [ ] Swapping family from `tspl` to `zpl` on an otherwise unchanged Template does not require a new design record.
- [ ] Tests assert ZPL payload behaviour at the renderer/adapter seam using the same fixtures as ticket 07.
