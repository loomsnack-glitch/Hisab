# 07 — TSPL printer adapter

**What to build:** The same Label Template, Product, and Label Job can compile to TSPL for dedicated thermal printers, with printer family selectable on the Template (overridable on the Job), while browser HTML print remains available and receipt ESC/POS stays unused.

**Blocked by:** 05 — Product Label Profile and Label Job fields

**Status:** ready-for-agent

- [ ] A Label Template stores printer family `html` or `tspl` (ZPL may be present as a reserved value but is not required to compile yet); a Label Job may override family.
- [ ] TSPL payload uses Label Stock millimetres, labels per row, gaps, Keep-Outs as absence of draw commands, native copy quantity for bulk, and a single copy for test print.
- [ ] Barcode commands carry the same Product Code payload as the HTML renderer; EAN-13 versus Code 128 is not substituted; rotation and forced white quiet-zone patch are preserved.
- [ ] Missing optional bindings omit commands; nutrition tables and boxes compile to positioned TSPL drawing rather than being dropped.
- [ ] Changing printer family, dpi, or millimetre print offset resets test-scan confirmation; unsupported font/feature fails the Job with an actionable error rather than silent Element drop.
- [ ] Gujarati that the printer cannot render fails or uses a millimetre-boxed raster fallback; it does not transliterate without warning.
- [ ] Adapter tests use the Phase 1 renderer fixtures and assert payload behaviour; receipt ESC/POS tests remain unchanged and unused by this path.
