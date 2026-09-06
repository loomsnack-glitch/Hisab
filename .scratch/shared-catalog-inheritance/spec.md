# Shared catalog defaults and Store Commercial Overrides

Status: ready-for-agent

## Problem Statement

Hisab currently has Organization-owned Catalog Products but copies each Product's price and discount into every Store Product Offering. Once copied, the Organization cannot tell whether a Store is following the Organization value or has deliberately chosen the same value locally. As a result, changing a Product in the Organization workspace cannot safely raise or reduce prices across ordinary Stores, while the Organization product list still displays a price that looks like a live selling price even though its edit dialog correctly does not edit that value.

The same ownership boundary is incomplete for related catalog concepts. Categories need consistent Organization structure with local menu presentation, Add-Ons need Store-specific commercial settings without duplicated definitions or attachment rules, and Bundle Products (shown as “Combos” in the UI) need Store-specific prices and availability without Store-specific composition. The Organization needs dependable central control and a safe exception path for individual Stores, rather than having to choose between a one-size-fits-all menu and manually maintaining a copied price at every branch.

## Solution

Keep the Organization as the owner of the shared catalog definitions and introduce inheritance for their commercial defaults. A Catalog Product and Add-On have editable Organization default price and default discount. Every Store has a permanent Offering row for every applicable shared definition. Each Offering may independently hold a nullable price override and nullable discount override. A missing override means “inherit the Organization default”; removing an override immediately restores that inheritance.

Organization active/inactive status is the global catalog publication and sellability gate. Store Offering active/inactive status is the local menu gate. A Product or Add-On is sellable at a Store only when both are active. A global pause never rewrites a Store's local status, so reactivation restores only the Stores that had previously enabled it. New Products, Add-Ons, and Bundle Products begin Organization-inactive and require deliberate publication. Existing Stores receive locally active Offering rows for a newly created entry so publication makes it available; a newly created Store receives locally inactive Offering rows for the existing catalog and enables its own menu deliberately.

Categories remain Organization-owned shared structure. Stores receive presentation settings only: whether a Category appears in the Store's browse menu and its local order. This presentation setting never changes Product classification or Product sellability. Bundle Product is the canonical domain term; “Combo” remains a UI label. A Bundle Product's composition stays Organization-owned, while the Bundle Product itself uses the same Store Product Offering price, discount, and availability rules as every other Product.

The Organization workspace exposes central defaults and publication status explicitly. The Store workspace exposes the effective price/discount and clear controls to override or return to Organization defaults. Routine Organization changes update only inheriting Stores. Separate, explicit multi-store actions may create, replace, or clear overrides after a scope preview and confirmation; no normal Organization edit may silently overwrite a Store Commercial Override.

## User Stories

1. As an Organization administrator, I want a Catalog Product to have one Organization default price and default discount, so that the normal menu price is managed once.
2. As an Organization administrator, I want to change a Product default price, so that every Store inheriting that price changes immediately without opening each Store workspace.
3. As an Organization administrator, I want to change a Product default discount separately from its default price, so that promotions can be centrally maintained without changing price.
4. As a Store administrator, I want to override only a Product's price while continuing to inherit its Organization discount, so that a local price difference does not require copying every commercial value.
5. As a Store administrator, I want to override only a Product's discount while continuing to inherit its Organization price, so that I can run a local promotion without losing the central price.
6. As a Store administrator, I want to override both values when needed, so that my Store can operate a deliberate local exception.
7. As a Store administrator, I want to remove either override, so that the affected value immediately follows the latest Organization default again.
8. As an Organization administrator, I want the Organization Product list and edit dialog to call these values “Organization defaults,” so that I do not mistake them for a copied Store price.
9. As a Store administrator, I want to see whether each effective price and discount is inherited or overridden, so that I know exactly why my Store is charging that amount.
10. As an Organization administrator, I want a new Product to begin unpublished, so that incomplete menu items do not accidentally appear at every Store.
11. As an Organization administrator, I want to publish an Organization Product deliberately, so that eligible current Stores can begin selling a reviewed item.
12. As an Organization administrator, I want to globally pause a Product, so that it cannot be sold at any Store without destroying each Store's local menu choice.
13. As an Organization administrator, I want global reactivation to preserve local inactive Stores, so that a Store that opted out does not resume selling unexpectedly.
14. As a Store administrator, I want to locally activate or deactivate a Product without changing other Stores, so that my Store's live menu reflects local operations.
15. As an Organization administrator, I want every Product × Store pair retained as one Offering, so that no Store creates a private Product or loses commercial history by deleting an Offering.
16. As an Organization administrator, I want a new Store to inherit the shared catalog but start locally inactive, so that a newly opened branch does not accidentally sell the whole menu before it is ready.
17. As a POS operator, I want discovery, search, scanning, cart pricing, and billing to use the effective Store Product Offering values, so that the device cannot sell a product at the wrong Store price.
18. As an Organization administrator, I want completed Sale Items, KOTs, bills, receipts, and reports to preserve their commercial snapshots, so that later default or override changes do not rewrite history.
19. As an Organization administrator, I want one shared Category structure, so that Products use a consistent classification across the Organization.
20. As a Store administrator, I want to hide a Category from my Store's browse menu and choose its local order, so that the menu can be presented differently without copying categories.
21. As a POS operator, I want a hidden Store Category not to appear in category browsing, so that Store menu presentation matches the selected Store.
22. As a POS operator, I want Category presentation not to change an otherwise active Product Offering's price, status, barcode validity, or product classification, so that presentation stays separate from sellability.
23. As an Organization administrator, I want an Add-On to have one shared definition, Product attachment rule, selection cap, Organization default price, and Organization default discount, so that attachments are not duplicated per Store.
24. As a Store administrator, I want an Add-On Offering to inherit or independently override price and discount and control local availability, so that modifier pricing follows the same predictable model as Products.
25. As a POS operator, I want a selectable Add-On to require an active Organization Add-On, active Store Add-On Offering, active Product Add-On Attachment, and an active parent Store Product Offering, so that unavailable extras cannot be sold.
26. As an Organization administrator, I want a new Add-On to begin unpublished and a new Store to begin with its Add-On Offerings locally inactive, so that local menus are prepared deliberately.
27. As an Organization administrator, I want a Bundle Product to retain one shared fixed composition, so that “Burger Meal” means the same thing at every Store.
28. As a Store administrator, I want a Bundle Product to inherit or override its own price and discount and have its own local availability, so that a Combo can be priced differently by Store without changing its components.
29. As a Store administrator, I want locally hiding a component from standalone sale not to silently change an active Bundle Product's fixed composition, so that a component may remain available through a Combo while not being sold alone.
30. As an Organization administrator, I want global Product, Add-On, and attachment dependency protections for active Bundle Products to remain enforced, so that a globally active Combo never refers to globally unavailable internals.
31. As an Organization administrator, I want to make a central default change without overwriting local exceptions, so that Store administrators retain their deliberate decisions.
32. As an Organization administrator, I want a separate multi-store action that can set, replace, or clear selected Store Commercial Overrides, so that I can safely make an exceptional change across selected branches.
33. As an Organization administrator, I want a preview showing selected Stores, affected catalog entries, inherited values, existing overrides, and resulting effective values before a multi-store operation, so that I can catch a costly mistake before saving.
34. As an Organization administrator, I want an explicit confirmation before an operation replaces or clears Store Commercial Overrides, so that central administration never silently destroys local decisions.
35. As an Organization administrator, I want catalog commercial changes to retain actor, timestamp, scope, and before/after values, so that pricing and menu changes can be explained later.
36. As an existing Organization administrator, I want existing Store commercial values migrated without changing effective current prices, discounts, availability, or historical sales, so that this redesign is safe to adopt.
37. As an Organization administrator, I want a validation message and affected-Store preview when a central change would make an effective discount greater than an effective price, so that independent overrides cannot create invalid selling math.

## Implementation Decisions

- This work follows the terms in `CONTEXT.md` and ADR 0045. It supersedes the copied live-price behavior in ADR 0041; Catalog Product and Store Product Offering remain separate permanent records.
- Treat the existing Product `price` and `discount` fields as editable Organization defaults rather than immutable creation seeds. Product API and UI contracts must name them as defaults in Organization context. The Organization product card must not present a default as a particular Store's live selling price.
- Replace Store Product Offering `price` and `discount` values with nullable `price_override` and `discount_override` values. The externally returned Store Offering DTO must include effective price and effective discount for display/POS use, plus enough explicit inheritance metadata for the Admin UI to show which values are overridden. Do not force clients to reconstruct effective values from stale independent queries.
- The effective price is the Offering price override when present, otherwise the Catalog Product default price. The effective discount follows the same independent rule. Price and discount are non-negative monetary values, and every effective price/discount pair must satisfy the existing rule that discount does not exceed price.
- Organization default edits are logical fan-out: they change one default and immediately affect every inheriting Offering without writing those Offering rows. If a proposed default would create an invalid effective pair because of a Store Commercial Override, reject it with the affected Stores and values; never repair, clear, or overwrite an override implicitly.
- Store Offering update contracts must support independently setting a price override, setting a discount override, or explicitly clearing either override. Sending an effective inherited value is not equivalent to creating an override; the request must make the intent unambiguous.
- Catalog Product `status` is the Organization global publication/sellability status. Store Product Offering `status` is the Store-local menu status. Product effective sellability requires both statuses to be active. Global status transitions do not mutate Offering statuses. Store Product Offerings are retained and never deleted.
- Creating a new plain Product or Bundle Product creates it with Organization status inactive and creates a locally active Store Product Offering for every current Store. Creating a new Store creates a locally inactive Offering for every existing Product. A deliberate Organization publication transition makes the former sellable only at Stores whose local Offering is active.
- Preserve existing active Bundle Product dependency protections: a globally active Bundle Product prevents global inactivation of its required component Product, Add-On, or Product Add-On Attachment. Store-local inactivation of a fixed component or Add-On removes its standalone/customize availability but does not mutate or automatically deactivate the Bundle Product; the Bundle Product's own effective availability controls its sale.
- Add a permanent Store Category Presentation for every Category × Store pair, with local visibility and local sort order. Categories retain one Organization-owned identity, Organization order, and global lifecycle. Store Category Presentation controls category browsing only; a hidden Category does not change Product Offering status, direct product scan behavior, or a Product's category assignment.
- Add a permanent Store Add-On Offering for every Add-On × Store pair, using nullable price and discount overrides plus local status. Add-On default price/discount and global status remain on the Organization Add-On. New Add-Ons are Organization-inactive with locally active rows for current Stores; new Stores receive locally inactive rows for existing Add-Ons.
- POS Add-On discovery and Billing must resolve an Add-On's effective Store Add-On Offering value server-side. Selection requires the Organization Add-On, Store Add-On Offering, Product Add-On Attachment, and parent Product Offering to be active. Sale Item Add-On snapshots remain immutable once recorded.
- Bundle Product is a Product type, not a separate Store commercial model. Its fixed composition remains Organization-owned and it resolves price, discount, global publication, and Store-local availability only through its Store Product Offering. Component prices never recalculate a Bundle Product's selling price.
- Provide Organization workspace operations with distinct purposes: edit Organization defaults; publish/pause an Organization entry; set/replace selected Store overrides; clear selected Store overrides; and change selected Store local statuses. A normal default edit must never act as a hidden bulk override operation.
- Each override-replacing or override-clearing multi-store operation requires an item scope, Store scope, calculated before/after effective values, an explicit confirmation, and an Organization audit record. The audit record retains actor, timestamp, operation type, selected scope, and values before and after the mutation. No generic rollback feature is required; a correction is a new audited operation.
- Migrate existing Products by preserving their current Product price/discount as Organization defaults. For each existing Store Product Offering, convert a field equal to its Product default into a null override and convert a differing field into an explicit override. This preserves current effective values and gives the expected inherited behavior on later Organization default changes. The release must provide an Organization-admin review/export of the inferred inherited versus overridden counts because prior data cannot distinguish a deliberately entered value equal to the old default.
- Migrate Product global status and Offering local status without changing the effective result. Backfill Store Category Presentations from current Category order as visible. Backfill Store Add-On Offerings from each existing Add-On's Organization values and preserve existing effective Add-On behavior. All migrations must retain organization/store composite integrity and protect against concurrent Store, Product, Add-On, and Bundle creation leaving gaps in an Offering matrix.
- Preserve existing Organization authorization and Store/Organization foreign-key validation on every operation. UI visibility and a selected Store route are never sufficient authorization.

## Testing Decisions

- Test external behavior through the existing Catalog service/routes, Admin workspace route/page seams, and POS/Billing service integration. Do not test repository helper internals or component implementation structure.
- Extend Catalog service and API tests to prove independently inherited and overridden Product and Add-On price/discount values, explicit override clearing, default fan-out without Offering writes, invalid effective discount rejection, and Organization/Store mismatch rejection.
- Add lifecycle tests for unpublished creation, publication, global pause/reactivation that preserves local status, new-Store local-inactive matrix creation, and the absence of Offering deletes or Store-private catalog creation.
- Add migration tests proving equal legacy Offering values become inherited, differing values become explicit overrides, current effective values are unchanged, matrices are complete, and migration reports accurately count inferred states.
- Extend Store Product workspace tests to verify Organization pages label defaults and central status, Store pages show effective inherited/overridden values, and Store controls expose independent set/clear actions for price and discount. Reuse the existing Store Products page route test as prior art.
- Add Store Category Presentation tests for local browse visibility/order without changes to Category identity, Product classification, Product Offering sellability, or direct scan behavior.
- Extend Add-On catalog and Billing tests to prove Store Add-On Offering eligibility, independent inheritance/overrides, local availability, attachment checks, trusted effective pricing, and immutable Sale Item Add-On snapshots.
- Extend Bundle Product catalog and Billing tests to prove Bundle Products use their own effective Store Offering price and availability; local component unavailability does not silently rewrite a Bundle; and existing global dependency locks remain enforced.
- Add Organization bulk-operation integration tests for item/store scoping, preview calculation, confirmation requirement, override-replacement audit records, safe override clearing, and the guarantee that ordinary default edits never overwrite overrides.
- Retain POS/Billing tests showing devices load only effective active Store Offerings, reject inactive or cross-Store records server-side, and preserve Sale Item, KOT, bill, receipt, and report snapshots after later catalog changes. Use the existing Store Product Offering, Add-On, Bundle Product, and configured Billing test suites as prior art.

## Out of Scope

- Store-private Catalog Products, Categories, Add-Ons, Product Add-On Attachments, or Bundle Product composition.
- Replacing historical Sale, Sale Item, Sale Item Add-On, KOT, bill, receipt, or report snapshots after catalog changes.
- Inventory, recipes, stock transfers, vendor purchasing price design, supplier contracts, or margin calculations.
- Price books, reusable Store groups, scheduled future price changes, approval workflows, and role redesign. The model must leave room for these later without requiring them for the first release.
- Category-specific product availability rules beyond Store Category Presentation, including using a hidden Category as a second product sellability switch.
- Generic rollback of a commercial change; corrections are new, audited catalog operations.

## Further Notes

- The recommended normal Organization workflow is: edit central defaults for inheriting Stores, then use targeted Store Commercial Overrides only for exceptions. This is the scalable path for a chain while preserving local flexibility.
- A future price-book or Store-group feature may layer on top of the explicit inheritance model. It must not erase the distinction between an Organization default, an inherited Store value, and a deliberate Store Commercial Override.
- The current Organization edit dialog's absence of live Store price, discount, and status is directionally correct. This specification changes it into a clear Organization-default and publication editor, while Store workspaces remain the place for local exceptions.
