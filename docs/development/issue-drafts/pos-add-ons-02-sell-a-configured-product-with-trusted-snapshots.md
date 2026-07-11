# Sell a configured Product with trusted snapshots

## What to build

Deliver the first end-to-end configurable billing flow for a Product with Add-Ons while preserving the fast plain-product path.

This slice should let a biller:

- tap a Product normally to add the plain Product line
- open a customize flow for that Product
- choose Add-Ons starting from selected quantity `0`
- submit only the selected Product/Add-On ids plus quantities
- create a Draft Sale line whose pricing and discount snapshots are loaded by the backend from trusted catalog data
- view the resulting bill detail with Add-Ons rendered as nested child rows under the parent Product line

This slice should establish the new sale-side storage model:

- parent `sale_items` remain the Product rows
- child `sale_item_add_ons` hold the selected Add-On rows
- parent rows store a persisted `Configured Sale Item Signature`
- parent money stays parent-only
- Add-On child rows carry their own snapshot and totals
- `sales` totals are computed from both layers

This slice does not need to finish advanced merge/frozen-configuration behavior yet beyond supporting one valid configured Product line end to end.

## Acceptance criteria

- [ ] A biller can add a plain Product with a normal tap and can separately add a configured Product with Add-Ons through a customize flow.
- [ ] The billing payload is selection-only: the client sends Product id, parent quantity, and selected Add-On ids plus quantities, while the backend derives trusted pricing and snapshot fields.
- [ ] Billing persists parent Product rows plus child Add-On rows and returns bill details with Add-Ons nested under the parent Product line.
- [ ] Sale `subtotal`, `discount_total`, and `grand_total` correctly include both parent Product rows and child Add-On rows, with behavior covered by billing service/API tests.

## Blocked by

- `Add-On catalog and Product attachment management`
