# Vendor and Unit Management

Status: ready-for-agent

## Problem Statement

Organizations need a single place in Ganatri Admin to maintain the businesses they buy from and the goods each business offers. They also need reusable purchase units that can later be shared by Vendor Items, Purchases, and Products. Today, Hisab has no Vendor or Unit model, so administrators cannot establish this purchasing foundation without keeping it outside the system.

## Solution

Add Organization-scoped Vendor, Vendor Item, and Unit management to Ganatri Admin. The sidebar will expose separate Vendors and Units destinations. Vendors will open with a Vendors tab and provide a second Items tab; Units will be its own Organization-wide configuration page.

A Vendor has a name, optional description, and active/inactive status. A Vendor Item belongs to exactly one Vendor and has a name, Unit, default purchase price, and active/inactive status. The same Vendor Item name may exist for different Vendors. Vendors and Vendor Items are retained and controlled by status, never deleted from the Admin UI.

The Units page provides Hisab's predefined, read-only Units alongside Organization-defined Units. An Organization controls whether every Unit is active or inactive; custom Units can be created and edited, but not deleted. Units carry a name and a short label only—there is no conversion logic in this release.

## User Stories

1. As an Organization administrator, I want to open Vendors from the Ganatri Admin sidebar, so that I can manage the businesses from which my Organization buys goods.
2. As an Organization administrator, I want the Vendors tab to be the default Vendors destination, so that the primary supplier list is immediately available.
3. As an Organization administrator, I want to search and filter the Vendor table, so that I can find a Vendor quickly as the list grows.
4. As an Organization administrator, I want to add a Vendor with a name, optional description, and status, so that I can record a supplier used by my Organization.
5. As an Organization administrator, I want to edit a Vendor's details and status, so that I can keep its purchasing information current.
6. As an Organization administrator, I want to deactivate rather than delete a Vendor, so that its Vendor Items and future purchase history remain intelligible.
7. As an Organization administrator, I want a Vendor Item to belong to one Vendor, so that a Vendor-specific item and its price are unambiguous.
8. As an Organization administrator, I want different Vendors to be allowed to offer identically named Vendor Items, so that I can maintain separate supplier catalogues and prices.
9. As an Organization administrator, I want to add and edit a Vendor Item with its name, Unit, non-negative default purchase price, and status, so that future Purchases have reliable defaults.
10. As an Organization administrator, I want the Items tab to group Vendor Items by Vendor and default to active records, so that I can browse the currently usable purchasing catalogue.
11. As an Organization administrator, I want an Item status filter, so that I can find inactive Items and reactivate them when needed.
12. As an Organization administrator, I want an inactive Vendor to make all of its Vendor Items unavailable for new future Purchase selection, so that I do not accidentally buy from an inactive supplier.
13. As an Organization administrator, I want to open a separate Units page, so that shared measurement configuration is not hidden inside the Vendor workflow.
14. As an Organization administrator, I want to see predefined Units such as piece, packet, box, carton, bag, bottle, can, jar, tray, dozen, kilogram, gram, litre, millilitre, metre, and foot, so that I can use common measures without creating them myself.
15. As an Organization administrator, I want to deactivate predefined Units that my Organization does not use, so that Unit pickers stay focused on relevant choices.
16. As an Organization administrator, I want to create and edit custom Units with a name and short label, so that business-specific measures are available everywhere they are needed.
17. As an Organization administrator, I want inactive Units to remain visible on records that already use them but unavailable for new or edited Vendor Items and Products, so that configuration changes do not damage existing data.
18. As an Organization administrator, I want duplicate Unit names and labels prevented, including against inactive and predefined Units, so that people select an unambiguous measure.
19. As a future Purchase user, I want only active Vendors with active Vendor Items to be selectable, so that a Purchase starts from valid defaults.

## Implementation Decisions

- Implement this as a new Organization-scoped procurement configuration capability, with Vendors, Vendor Items, and Units all isolated by Organization and protected by the existing authenticated Organization-administrator authorization boundary.
- Use one public Organization-scoped Admin/API seam for the feature: typed request/response schemas, backend routes and service operations, client services/query keys, and the Admin routes consume the same contracts. Do not expose a separate Store-scoped Vendor catalogue.
- Add persistent Vendor records with Organization ownership, name, optional description, active/inactive status, audit metadata, and a relationship to their Vendor Items. New Vendors default to active.
- Add persistent Vendor Item records with Organization ownership, exactly one Vendor, name, Unit reference, a required non-negative two-decimal default purchase price, active/inactive status, and audit metadata. New Vendor Items default to active.
- The Vendor Item default purchase price is per selected Unit. It is a configurable default only; a future Purchase may override it for its own entry.
- Permit the same normalized Vendor Item name under different Vendors. Do not treat Vendor Items as sellable Catalog Products or inventory records.
- Do not provide Vendor or Vendor Item deletion commands. Status transitions are the lifecycle mechanism.
- An inactive Vendor does not change its Vendor Items' own statuses. A future selector must require both an active Vendor and an active Vendor Item.
- Provide a Vendors Admin route with two tabs: Vendors is the default table view; Items is a grouped-by-Vendor catalogue. Both views include appropriate search, status filtering, loading, empty, and error states. The Items view defaults to active records but permits status filtering so inactive items can be administered.
- Provide a separate Units sidebar destination and Organization-scoped Units route. It presents predefined and Organization-defined Units together, with source and availability clear to the administrator.
- Seed the agreed predefined Unit definitions: piece (pc), packet (pkt), box, carton (ctn), bag, bottle, can, jar, tray, dozen (doz), kilogram (kg), gram (g), litre (L), millilitre (mL), metre (m), and foot (ft).
- Treat predefined Unit definitions as read-only system data, but maintain an Organization-specific availability state for each predefined Unit. New Organizations receive every predefined Unit as active.
- Allow Organization-defined Units with a descriptive name and short label; they are Organization-owned, editable, and controlled through active/inactive status rather than deletion. New custom Units default to active.
- Units do not support scale conversions, dimensions, stock conversion, or price conversion in this release.
- Enforce normalized Unit-name and Unit-label uniqueness across predefined and Organization-defined Units within the Organization, irrespective of active/inactive state. Predefined Unit names and labels are reserved.
- An inactive Unit cannot be selected when creating or editing a Vendor Item or a future Product. Existing records continue to display their assigned inactive Unit.
- Add the Unit selection capability to Product contracts only when the Product feature is separately extended; this feature establishes the shared Unit model and does not modify Product fields or product user flows yet.
- Follow the existing Admin table and dialog patterns for desktop/mobile presentation, search, filters, add/edit actions, and query invalidation.

## Testing Decisions

- Test externally observable behavior rather than component internals, including validation outcomes, authorization, Organization isolation, status availability, API responses, sidebar navigation, and visible table/filter behavior.
- Add type-schema tests for valid and invalid Vendor, Vendor Item, Unit, and Unit-availability payloads; specifically cover required fields, non-negative two-decimal prices, UUID relationships, and duplicate normalized Unit names or labels.
- Add backend service and route tests using the existing catalog service test-harness and Organization-scoped route conventions as prior art. Cover create, read, update, status changes, authentication, membership checks, and cross-Organization access denial.
- Test Vendor Item constraints: exactly one parent Vendor, duplicate names permitted across Vendors, inactive Vendor availability, inactive Vendor Item availability, and unavailable inactive Units.
- Test Unit behavior: seeded predefined definitions, Organization-specific deactivation and reactivation, predefined-definition immutability, custom Unit lifecycle, no deletion command, and existing references continuing to display inactive Units.
- Add Admin behavioral tests following the existing sidebar navigation and table-page test patterns. Verify routes, default tabs, table search and status filters, dialogs, grouped Items output, standard/custom Unit visibility, and loading, empty, and error states.
- Ensure future work adding a Unit to Products verifies that inactive Units cannot be newly assigned while legacy records retain their selected Unit.

## Out of Scope

- Creating Purchase records, purchase lines, purchase totals, payments, vendor balances, accounts where money lives, expenses, or financial reporting.
- Inventory tracking, stock movements, goods receipt, cost of goods sold, batches, expiry, tax, or supplier invoices.
- Store-specific Vendors or Store-specific Vendor Item catalogues.
- Linking a Vendor Item to a sellable Product, automatically creating Products from Vendor Items, or changing existing Product data.
- Unit conversion, equivalent measures, dimensions, fractional-quantity policy, pack-size arithmetic, or automatic price conversion.
- Permanently deleting Vendors, Vendor Items, or Organization-defined Units.
- Editing the name or label of predefined Unit definitions.

## Further Notes

- Terminology follows the shared domain glossary: Ganatri Admin is the Organization administrator application; Ganatri Console remains read-only and is not part of this feature.
- The glossary now defines Vendor, Vendor Item, and Unit, including the status and availability rules that future Purchases must honor.
- This establishes the procurement configuration foundation only. Future purchase design should add immutable snapshots for Vendor, Vendor Item, Unit, and entered price when a Purchase is recorded, so later configuration changes cannot rewrite historical records.
