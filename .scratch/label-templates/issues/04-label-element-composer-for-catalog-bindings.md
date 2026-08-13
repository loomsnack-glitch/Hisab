# 04 — Label Element composer for catalog bindings

**What to build:** Administrators compose Label Elements anywhere in the leftover printable area — Product name, selling price, Product Code barcode, static text, and boxes — with millimetre placement, rotation, and EAN-13 or Code 128, so a store is not locked to a barcode-on-top stack. Printing is available for any Product that has a Product Code.

**Blocked by:** 02 — Saved Label Templates replace the layout dropdown

**Status:** ready-for-agent

- [ ] An administrator can add, select, move, resize, rotate (0/90/180/270), and delete Label Elements via click-to-place and a millimetre property inspector; no Element is mandatory.
- [ ] Bindings in this ticket are Product name, selling price (with reprint warning), Product Code barcode, static text, and box; missing optional text is omitted rather than printed as fake data.
- [ ] A barcode Label Element encodes only the Product Code; EAN-13 keeps quiet zones and a forced white patch; Code 128 encodes opaque text such as `VR000001`.
- [ ] EAN-13 print is refused when the Product Code is not a valid EAN-13 value; Code 128 does not silently substitute EAN-13.
- [ ] Print is offered when Barcode Scanning is enabled and the Product has a Product Code of either kind, not only Internal Product Codes.
- [ ] Changing Elements or barcode geometry resets test-scan confirmation; Latin and Gujarati text render with a Gujarati-capable web font.
- [ ] Tests cover rotation with unchanged payload, symbology rejection, opaque Code 128, the lifted print gate, and Keep-Out intersection if a Keep-Out exists from ticket 03.
