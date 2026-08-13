# 03 — Custom Label Stock and Keep-Outs

**What to build:** Administrators set Label Stock in millimetres (width, height, labels per row, horizontal gap, feed-direction gap, sheet vs roll, and sheet page grid) and mark Keep-Outs so Hisab does not print on pre-printed branding, including a header inset for a 25–30% brand column.

**Blocked by:** 02 — Saved Label Templates replace the layout dropdown

**Status:** ready-for-agent

- [ ] An administrator can save Label Stock millimetres, labels per row, both gaps, and sheet versus roll on a Label Template; sheet stock still supports starting position and page grid.
- [ ] Preview and print page geometry match the saved Label Stock; 1-across and 2-across rows both place labels using the gaps.
- [ ] An administrator can add Keep-Out rectangles and a content-inset helper that creates those rectangles; Keep-Outs show as shaded regions on the preview.
- [ ] The renderer draws nothing inside Keep-Outs; a Label Element that intersects a Keep-Out is rejected on save and print.
- [ ] Seeded A4 and thermal Templates remain valid Label Stock with no Keep-Outs unless the administrator adds them.
- [ ] Tests assert millimetre page size, gap placement, undrawn Keep-Outs, and intersection rejection at the renderer and catalog seams.
