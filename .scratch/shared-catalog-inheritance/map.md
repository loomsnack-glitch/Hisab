# Shared catalog inheritance map

## Destination

An approved, implementable specification and migration roadmap for shared Catalog Products, Categories, Add-Ons, and Bundle Products: Organization defaults, Store Commercial Overrides, global/local availability, and safe central multi-store changes.

## Notes

Use the vocabulary in [CONTEXT.md](../../CONTEXT.md) and the accepted architectural boundary in [ADR 0045](../../docs/adr/0045-shared-catalog-defaults-with-store-commercial-overrides.md). This map plans the work; it does not implement the catalog changes. Ordinary Organization edits must never overwrite a Store Commercial Override.

## Decisions so far

<!-- Resolved map tickets appear here as one-line links. -->

## Not yet specified

- Whether large organizations eventually need reusable store groups or price books, instead of only explicit multi-store bulk changes.
- Whether central price changes may be scheduled for a future date and what approval/audit history that requires.
- The roles and permissions for Organization-wide catalog publication and override-replacing bulk operations.

## Out of scope

- Inventory, recipes, procurement pricing, supplier contracts, and stock transfers.
- Replacing historical sale, KOT, bill, receipt, or report snapshots after a catalog change.
- Per-Store private products, categories, add-ons, or bundle composition.
