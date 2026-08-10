# Research: grocery POS barcode scanning and internal label generation

**Date:** 2026-08-10  
**Status:** Research record; final V1 decisions are captured in [the approved implementation plan](../development/2026-08-10-grocery-barcode-mrp-v1-plan.md)  
**Question:** How should Hisab support manufacturer barcodes, multiple barcodes per product, scan-to-cart billing, and store-generated labels for products that have no barcode?

> **Decision note (2026-08-10):** The approved V1 deliberately chooses one optional Product Code per Product, omits aliases/primary codes, enables MRP and scanner settings, and retains whole-count Sale quantities. Variable-measure billing and weighing-scale barcodes are deferred. Where this research note recommends multiple barcode aliases or discusses variable-measure implementation, the final implementation plan supersedes it.

## Executive recommendation

Add a separate `product_barcodes` model with this cardinality:

```text
Product 1 ---- 0..many ProductBarcode
ProductBarcode 1 ---- exactly 1 Product within an Organization
```

The practical policy should be:

1. A Product may have no barcode, one barcode, or several controlled aliases.
2. One barcode value may resolve to only one Product within an Organization.
3. One barcode may be marked primary for display and label-management purposes.
4. Different flavours, sizes, declared weights, or independently sold pack/case quantities should normally be separate Products, not aliases on one Product.
5. Use the manufacturer's existing EAN/UPC barcode whenever one exists. Do not cover it or generate a replacement merely because Hisab can.
6. For a fixed-price product with no usable barcode, generate a store-only 13-digit Restricted Circulation Number beginning with `04`, calculate its GS1 check digit, and render it as EAN-13.
7. Never describe a store-generated code as a globally registered GTIN, never invent a `890...` number, and never use it outside the assigning business as though it were globally unique.
8. Deliver USB/Bluetooth keyboard-wedge scanning first. Add camera scanning and variable-weight scale labels in later phases.

For this grocery client, the most valuable first release is:

```text
bulk barcode onboarding -> scan known code -> local lookup -> add/increment cart item
                                      \-> unknown code -> clear recovery/linking flow
```

## How a retail barcode actually works

A normal manufacturer barcode does not contain the product name or selling price. It normally encodes an identifier, usually a Global Trade Item Number (GTIN). The POS reads that identifier and looks it up in the retailer's own catalog database to retrieve the name, price, tax/inventory data, and other attributes. GS1 explicitly notes that description and price are generally held in a computer database rather than in the barcode itself ([GS1: Get a barcode](https://www.gs1.org/standards/get-barcodes)).

This means Hisab does not need to decode a company name or price from every packet. It needs a reliable mapping:

```text
scanned digits -> organization-scoped barcode record -> product id -> existing cart logic
```

The brand owner normally assigns the GTIN. In India, globally usable product identifiers beginning with `890` are issued through GS1 India; Hisab must not manufacture lookalike `890` numbers ([GS1 India: Get a barcode](https://www.gs1india.org/get-a-barcode)).

## Direct answer: one barcode or multiple barcodes per product?

There are two related but different questions.

### Standards view

One defined saleable trade item has one GTIN. A different flavour, size, colour, declared net content, or packaging level that trading partners must distinguish receives a different GTIN. A single bottle, six-pack, and case are separate trade items when they are independently ordered or sold ([GS1 GTIN Management Standard](https://ref.gs1.org/standards/gtin-management/), [GS1 pack/case quantity rule](https://www.gs1.org/1/gtinrules/en/rule/270/packcase-quantity)).

A physical package can carry more than one barcode symbol during the industry's transition from traditional EAN/UPC symbols to 2D symbols, but symbols used for the same retail identity must represent the same GTIN and matching attributes. Multiple printed symbols do not mean the item has several unrelated product identities ([GS1 General Specifications 26.0, sections 4.15.1-4.15.2](https://ref.gs1.org/standards/genspecs/26.0.0/)).

### Hisab database view

Hisab should nevertheless support multiple barcode records per Product as an operational alias mechanism. This helps when the shop must temporarily accept a legacy code and a replacement code, a supplier applies an equivalent controlled label, or the shop has an internal code in addition to a previously recorded code.

This is an architectural convenience, not permission to merge distinct saleable items. The UI should warn the administrator:

> Add another barcode only when it represents the same item, size, pack quantity, price treatment, and stock unit. Create a separate product for a different variant or pack.

Examples:

| Situation | Recommended modeling |
| --- | --- |
| Identical 1-litre milk packets with the same EAN-13 | One Product, one barcode |
| Controlled legacy and replacement identifiers for the same sellable SKU during a transition | One Product, two aliases, one primary |
| 500 ml and 1 litre bottles | Two Products, one or more codes on each |
| One bottle and a sellable case of 12 | Two related Products; do not make the case code a simple alias |
| Same manufacturer GTIN represented by EAN and a GS1 2D carrier | One product identity; avoid adding twice if a scanner reads both |
| Product with no manufacturer code | One Product with one Hisab-generated internal RCN-13 |

## What Hisab does today

The current catalog and billing design makes barcode support a contained extension:

- `packages/types/src/modules/catalog/catalog.schema.ts` defines Product fields for identity, organization/category, name, price, discount, image, type, and status, but no barcode.
- `apps/backend/db/migrations/20260625150000_create_categories_and_products.sql` creates organization-scoped Products with no barcode relation.
- `apps/backend/src/modules/pos/pos.routes.ts` exposes the active organization catalog to the authenticated Store Device.
- `apps/web/src/pages/billing-page.tsx` loads that catalog, filters Products in memory only by name and category, and calls `addProductToBill`/`addPlainProductToBill` to add a line or increment an existing matching line.
- Hisab's domain model in `CONTEXT.md` explicitly defines sale quantities as whole-item counts. Fractional quantities and weight-based sales are not currently supported.

The scanner should therefore resolve a barcode to a current `ProductResponseDTO` and reuse the existing product-card action/cart functions. Barcode work must not create a second cart implementation.

At roughly 650 Products, preloading an organization-scoped barcode lookup map is small and gives instant scanning without a network request per item.

## Recommended domain and data model

Introduce a `product_barcodes` table rather than putting one `barcode` column on `products`.

Suggested first version:

```text
product_barcodes
  id                 uuid primary key
  organization_id    uuid not null
  product_id         uuid not null
  value              varchar(128) not null
  kind               manufacturer_gtin | internal_rcn | other
  symbology           ean_8 | upc_a | ean_13 | gs1_databar | qr | data_matrix | unknown
  is_primary          boolean not null default false
  status              active | inactive
  created_by          uuid not null
  updated_by          uuid null
  created_at          timestamptz not null
  updated_at          timestamptz not null
```

Required invariants:

- Store `value` as text, never a numeric SQL/JavaScript value; leading zeroes are significant.
- Trim scanner suffix/control characters but do not remove meaningful leading zeroes.
- Enforce `UNIQUE (organization_id, value)` in PostgreSQL. Application pre-checks may improve the message, but the database is the race-safe authority.
- Use a composite tenant-scoped foreign key to ensure the barcode and Product belong to the same Organization, following the repository's existing tenant-isolation pattern.
- Enforce at most one active primary barcode per Product with a partial unique index.
- Index `(organization_id, value)` for checkout lookup.
- Prefer retiring a barcode over deleting it after operational use, so mistaken mappings and migrations remain auditable.

Do not add `pack_quantity` to the alias table in the first release. A case barcode that adds 12 units appears convenient, but it mixes product identity, pricing, inventory conversion, returns, and reporting. Model a sellable case as its own Product until Hisab has an explicit packaging hierarchy and stock conversion model.

### Validation and normalization

For numeric GS1-style values:

- Accept the retail formats actually required by the client, initially EAN-8, UPC-A, and EAN-13.
- Validate their lengths and check digit.
- Preserve the exact human-readable value printed on the package.
- Add normalization tests for scanners that transmit UPC/EAN leading zeroes differently. If canonical GTIN-14 comparison is introduced, keep it an internal lookup key and continue to display the original value.
- Treat non-GTIN supplier codes as `other`; do not claim that a length-valid number is necessarily GS1 licensed.

GS1's final check digit protects the number's structure and uses the standard alternating 3/1 weighting algorithm ([GS1 check digit calculator](https://www.gs1.org/services/check-digit-calculator), [GS1 General Specifications 26.0, section 7.9.1](https://ref.gs1.org/standards/genspecs/26.0.0/)). Optional ownership verification can happen during onboarding through Verified by GS1 or GS1 India services, but checkout must use the local Hisab catalog rather than depend on an external API ([Verified by GS1](https://support.gs1.org/support/solutions/articles/43000734070-how-do-i-check-if-a-gs1-gtin-is-valid-)).

## Store-generated barcodes

For a fixed-price/count item without a manufacturer identifier, generate an RCN-13 for company-internal use:

```text
04 + 10-digit organization-local item reference + GS1 check digit
```

Example shape only:

```text
04 0000000123 C
```

GS1 reserves prefix `04` for company-internal RCN-13 numbering. The assigning company controls the item-reference digits, and the number is not guaranteed unique outside that company's restricted environment ([GS1 General Specifications 26.0, section 2.1.11.2](https://ref.gs1.org/standards/genspecs/26.0.0/)).

Implementation rules:

1. Generate the 10-digit reference through an organization-scoped, transaction-safe sequence/counter.
2. Calculate and append the check digit on the server.
3. Re-check the organization-scoped unique constraint before commit.
4. Record `kind = internal_rcn`, not `manufacturer_gtin`.
5. Show the administrator: "Store-only barcode. Not a globally registered GS1 GTIN."
6. Do not generate an internal code when a valid manufacturer code can be scanned, except through an explicit exceptional workflow.
7. Do not place an internal label over an existing manufacturer barcode.

This feature is appropriate for the retailer's own unbranded, locally packed, or otherwise uncoded fixed-count goods. If the client later manufactures goods for sale through other retailers, marketplaces, or exports, they need licensed identifiers from GS1 India rather than Hisab's internal codes.

## Product-management and 650-item onboarding UX

Adding fields to the normal product dialog is insufficient for this client. Include a dedicated onboarding workflow:

### Normal product create/edit

- A "Barcodes" section that lists all codes, source/kind, status, and primary state.
- "Scan/enter manufacturer barcode" action.
- "Generate store-only barcode" action with the internal-use warning.
- Duplicate detection that names the Product already using the code.
- A label preview/print action only after the barcode record is saved.

### Bulk onboarding mode

Support at least one of these in the first rollout and ideally both:

1. **Scan and link:** search/select an existing Product, scan its packet, save, automatically advance to the next unbarcoded Product.
2. **CSV import:** import `product identifier/name, barcode` pairs, preview exact matches, require manual resolution for ambiguous names, and reject duplicates before writing.

For an unknown code found during billing, do not silently create a Product. Show the code, allow manual product search so the sale can continue, and offer a privileged "link this barcode"/admin follow-up. A Store Device should not gain catalog-administration rights merely because it can scan.

## POS scan-to-cart UX

### Hardware approach for phase one

Use a USB or Bluetooth scanner configured as a HID keyboard with an Enter terminator. This mode sends the decoded barcode as keystrokes and works without a vendor SDK; Zebra documents USB HID keyboard output as a supported scanner mode ([Zebra scanner documentation](https://techdocs.zebra.com/dcs/scanners/sdk-linux/about/)). A 2D imager is preferable hardware for future compatibility because it can also read ordinary 1D EAN/UPC symbols, but Hisab's first software scope can remain EAN/UPC-focused.

Provide a visible "Scan or type barcode" input in the Product billing panel. After each result, clear and refocus it. Avoid relying only on timing heuristics that attempt to distinguish a fast scanner from a typist; an Enter suffix gives a deterministic boundary. A later global-capture mode can be added after testing the client's exact scanner.

### Scan behavior

1. Receive and sanitize the complete scanned string.
2. Look it up in an in-memory `Map<barcode, Product>` built from the device-scoped POS catalog.
3. If active and simple, call the existing `addProductToBill` behavior.
4. Repeated hardware scans intentionally increment quantity; do not debounce legitimate separate scans.
5. If the Product needs combo/add-on configuration, open the existing configuration flow rather than silently choosing options.
6. Show immediate visual and audible success feedback with Product name and new quantity.
7. For unknown, inactive, or ambiguous codes, do not change the cart; show a distinct error tone/message and retain the code for recovery.
8. Keep manual search and category browsing available as a fallback.

Camera scanning can follow on mobile/compatible web devices. Camera callbacks often fire repeatedly while the code remains in view, so camera events need a short same-code cooldown; that cooldown should not be applied to discrete HID scans.

## Label printing

Render internal fixed-count codes as EAN-13, with:

- black bars on a white/light background;
- preserved quiet zones around the symbol;
- human-readable 13 digits below the symbol;
- Product name and optional selling price outside the barcode's quiet zone;
- selectable label size, number of copies, and starting position for A4 sheets;
- thermal-label and ordinary browser-print/PDF layouts;
- a mandatory test-print-and-scan step before a bulk run.

If price is printed as visible label text, make clear that the price is not encoded in the barcode and labels may need reprinting after a price change. GS1 recommends EAN/UPC for retail POS, legible human-readable digits, suitable contrast, and protected quiet zones ([GS1: 10 steps to barcode your product](https://www.gs1.org/standards/barcodes/10-steps-to-barcode-your-product/english)). GS1 India also warns that scanning successfully on one device alone does not prove general symbol quality ([GS1 India barcode verification](https://www.gs1india.org/services/barcode-verification)).

Hisab's existing `apps/web/src/lib/pos-printer.ts` is an 80 mm ESC/POS receipt path. Product-label printing should be a separate module/layout rather than being coupled to receipt formatting.

## Variable-weight grocery items

Do not include weighing-scale/price-embedded barcodes in the first barcode release.

GS1 supports variable-measure retail items using GTIN plus weight/count/price attributes or restricted-circulation formats in ranges such as `02` and `20-29`. The exact regional structure is determined by the relevant GS1 Member Organisation; Hisab must not invent its own interpretation of those digits ([GS1 General Specifications 26.0, sections 2.1.12.1-2.1.12.2](https://ref.gs1.org/standards/genspecs/26.0.0/), [GS1 2D barcodes at retail POS guideline](https://ref.gs1.org/guidelines/2d-in-retail/)).

More importantly, Hisab currently enforces whole-count sale quantities. Supporting vegetables, meat, or grains sold as `1.275 kg` first requires a domain decision and coordinated changes to quantities, unit pricing, totals, receipts, returns, and inventory. Until then, loose produce should use manual selection/PLU and the existing whole-count behavior only where that truthfully represents the sale.

## Phased implementation plan

### Phase 1 - Identity model and management

- Add `product_barcodes`, constraints, repository/service/API types, and audit fields.
- Add product barcode list/create/retire/set-primary operations.
- Extend POS catalog responses with active barcode mappings or add one device-scoped bulk barcode endpoint.
- Build product edit and bulk scan/link onboarding.
- Add CSV preview/import if the client's existing software can export barcode mappings.

### Phase 2 - HID scan-to-cart

- Add the dedicated scan input and scanner Enter handling.
- Build the in-memory organization-scoped lookup map.
- Route successful scans through existing product/cart configuration logic.
- Add success, unknown, inactive, and duplicate feedback.
- Test with the client's actual scanner and packets before deployment.

### Phase 3 - Internal generation and labels

- Add the organization-scoped sequence and server-side RCN-13/check-digit generator.
- Add the explicit internal-use warning and generation audit trail.
- Build label preview, copy count, A4/thermal layouts, and test-print workflow.
- Pilot on a small group of unbarcoded products before bulk labeling.

### Phase 4 - Operational hardening

- Add unknown-code reporting and barcode mapping history.
- Add optional manufacturer-GTIN verification during onboarding.
- Add mobile camera scanning if required.
- Measure scan success, unknown scans, duplicate attempts, and time per bill.

### Phase 5 - Packaging and variable measure

- Design related unit/pack/case Products and stock conversions if inventory requires them.
- Decide whether fractional quantity becomes a supported Hisab domain concept.
- Obtain/confirm GS1 India and weighing-scale label conventions.
- Only then implement variable-weight/price barcode parsing.

## Acceptance criteria for the first production release

- A Product can have zero, one, or multiple active barcode records and at most one primary barcode.
- The same active barcode cannot be assigned to two Products in the same Organization, including under concurrent requests.
- The same internal RCN may exist in different Organizations without cross-tenant resolution.
- Leading-zero barcode values survive database, API, UI, printing, and scanning round trips unchanged.
- Valid EAN-8, UPC-A, and EAN-13 check digits are accepted; malformed values receive a useful error.
- Scanning an active simple Product once adds one item; scanning it again increments the matching cart line.
- Configurable Products reuse the existing configuration rules.
- Unknown and inactive codes never mutate the cart.
- One Organization cannot resolve or manage another Organization's barcode.
- Generated internal values always begin with `04`, have the correct length/check digit, and cannot collide inside the Organization.
- A generated label shows the human-readable value and scans successfully on the client's production hardware.
- Rapid sequential HID scans are not lost, reordered, or incorrectly suppressed.
- Manual product search remains usable when the scanner is disconnected.

## Decisions to make before implementation

1. Is the catalog organization-wide permanently, or will barcode/product availability later vary by Store?
2. Can a Store Device only report an unknown barcode, or may a privileged manager link it inside the POS?
3. Does the client have an export from the old software that can seed the initial 650 barcode mappings?
4. Which label stock and printer will be used: A4 sheets, a dedicated label printer, or both?
5. Is camera scanning needed for the first client, or is a USB/Bluetooth HID scanner sufficient?
6. Are any goods sold by weight today? If yes, keep those outside the first release and open a separate quantity/pricing design effort.

## Clarification: Vyapar-style item codes, MRP, and scan settings (2026-08-10)

### Is zero-to-many plus a primary barcode mandatory?

No. It is an extensible Hisab data-model recommendation, not a barcode-standard requirement and not something the first UI must expose in full.

Vyapar's official material documents one unique **Item Code** per item. It permits the user to scan/type the manufacturer's existing barcode into that field or use a Vyapar-recommended code, then prints a barcode encoding that value ([Vyapar barcode guide](https://vyaparapp.in/guides/how-to-generate-a-barcode-in-vyapar), [Vyapar product barcode video](https://vyaparapp.in/videos/how-to-generate-product-barcode)).

Recommended Hisab compromise:

- Keep the database capable of `Product -> 0..many ProductBarcode` so old/new or exceptional aliases do not require a future schema migration.
- Present one simple **Item code / barcode** field in the first product form, like Vyapar.
- Put additional aliases behind an advanced action when needed.
- `is_primary` is not used to find a Product at checkout; every active alias works. It only selects the default code shown in lists, exports, or label printing. It may be deferred while the UI permits only one code.

### Example: `7622202334009`

This value has 13 digits and a valid EAN-13/GTIN check digit of `9`. Hisab should store the exact string `7622202334009`, link it to the correct Dairy Milk Product in that Organization, and resolve it locally during checkout. Structural validity does not itself prove the product name or owner; optional onboarding verification may use [Verified by GS1](https://www.gs1.org/services/verified-by-gs1).

### What Vyapar's assigned code means

Vyapar says every inventory item needs a unique Item Code and that its generated barcode encodes that code. Its public documentation does not state that an assigned value such as `3868105530` is a globally registered GTIN or disclose a worldwide allocation scheme. Vyapar's public generator also accepts arbitrary alphanumeric Item Codes ([Vyapar online barcode generator](https://vyaparapp.in/tools/ns/free-online-barcode-generator)).

The safe interpretation is therefore **business-local identifier**:

- Vyapar can check that `3868105530` is unused inside the current business file.
- It cannot promise that no unrelated shop or manufacturer anywhere uses the same raw value.
- That is acceptable while the label remains inside that business and lookup is tenant-scoped.
- If the same value later appears on a different Product inside the same business, the POS must reject the second mapping and require another internal code.

Hisab can improve this by generating internal EAN-13 RCN values from the reserved `04` company-internal range instead of arbitrary 10-digit numbers. The check digit catches mistyping; it does **not** create uniqueness. A database unique constraint and organization-scoped generator create local uniqueness. GS1 explicitly says these `04` RCN values are controlled by the assigning company and are not unique after leaving it ([GS1 General Specifications, company-internal RCN](https://ref.gs1.org/standards/genspecs/17.1.0/)).

### Should Hisab have an MRP setting?

Yes for grocery/retail businesses, but it is independent of barcode scanning.

MRP means **Maximum Retail Price**, not the normal selling price. The Department of Consumer Affairs defines retail sale price/MRP as the maximum price for a packaged commodity, inclusive of all taxes, and its current FAQ states that packaged goods may not be sold above it ([Department of Consumer Affairs legal-metrology overview](https://consumeraffairs.gov.in/index.php/pages/legal-metrology-overview), [Packaged Commodities FAQ](https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/FAQs_on_Packaged_Commodities%2C_Rules_2011_whatsnews.pdf)).

Example:

```text
Barcode       7622202334009
MRP           Rs 50.00    maximum printed/package price
Selling price Rs 48.00    shop's normal price
Bill price    Rs 48.00    or lower after a permitted discount
```

Recommended Hisab design:

- Organization setting: `Enable MRP`, enabled by default for a grocery-store template and optional for restaurants/services.
- Product field in the first release: nullable `mrp`; retain the existing `price` as selling price and keep discount separate.
- Server validation: when MRP is present, the effective charged price must not exceed MRP.
- Display/receipt: optionally show both MRP and selling price so the saving is clear.
- Historical billing: snapshot MRP onto the Sale Item if receipts/reports must preserve the MRP used at sale time.
- Future inventory phase: move/override MRP at batch level because old and new stock may coexist with different printed MRP, batch number, and expiry. Vyapar also documents batch-level MRP ([Vyapar inventory guide](https://vyaparapp.in/videos/how-to-manage-inventory)).

GS1's open-supply-chain rule says a brand-owner change to a price printed directly in package artwork requires a new GTIN ([GS1 price-on-pack rule](https://www.gs1.org/1/gtinrules/en/rule/272/price-on-pack)). Hisab should still avoid assuming that changing its Product MRP automatically changes the manufacturer's barcode; record what is actually printed/scanned on received stock.

### Barcode Scan versus Direct Barcode Scan

The screenshots match Vyapar's documented separation:

- **Barcode Scan** enables item-code/barcode lookup during transactions.
- **Direct Barcode Scan** starts/captures scanning as soon as the sale form opens ([Vyapar POS guide](https://vyaparapp.in/guides/how-to-do-pos-billing-with-vyapar), [Vyapar grocery workflow](https://vyaparapp.in/blog/grocery-store-business/)).

For Hisab, barcode records should not disappear when a setting is off. Use settings only to control UI behavior:

- Organization setting `Barcode scanning enabled`: exposes barcode management and scan controls.
- Store Device preference `Direct scan enabled`: captures HID scanner input immediately on the billing screen; make it easy to pause so ordinary typing/search is not intercepted.
- A visible focused scan field should remain available as the predictable fallback.

## Final recommendation

Build the barcode identity layer and bulk onboarding first, then connect it to the existing cart function through a HID scan input. Use manufacturer codes directly; generate `04`-prefix internal EAN-13 labels only for fixed-count goods without a code. Model `Product -> many barcode aliases`, but keep variants and sellable pack sizes as separate Products. Explicitly defer scale/variable-weight barcodes until Hisab supports fractional quantities and GS1 India conventions have been confirmed.
