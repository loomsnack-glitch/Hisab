# Store-Scoped Table Service and Table-Linked Billing

Status: ready-for-agent

## Problem Statement

Cafés and stores that serve guests at physical tables cannot presently model their floor or connect a customer’s order to the table where it is being served. Staff must rely on memory to know which tables are seated, taking an order, ready for a bill, awaiting payment, or free. The current POS can save Draft Sales, place Sales, collect Payments, and print receipts, but it has no Service Tables, floor layout, or table-aware way to resume the current bill.

This makes it difficult for waiters and cashiers to coordinate service, find the current Draft Sale for a table, see the amount due, safely release a physical table, and preserve an unpaid bill when a guest leaves without paying.

## Solution

Add a store-scoped table-service capability with two views:

- **Admin → Store workspace → Tables** lets a manager create Service Tables using a required store-unique **Table no** label and optional **Persons no** capacity, then arrange table-shaped boxes in their saved order within a simple grid.
- **POS → Tables** shows the same saved grid order as a live operational view. Each table box shows its label, its optional person count centered beneath the box, the current table state, and the current bill total when one exists. Staff can allocate a free table, start and resume its Draft Sale, mark it ready to bill, place and print the bill, collect its Payment, and manually free the table.

The table lifecycle is explicit:

`Free → Allocated → Engaged → Ready to bill → Payment due or Paid → Free`

An Allocated Service Table has seated guests but no order. Starting an order creates its sole Active Table Sale and makes it Engaged. A waiter marks an Engaged table Ready to bill when guests are finished ordering; this is a manual signal only. A cashier then opens the current bill, places it, and prints the customer receipt. Choosing the existing **Due** settlement option places the Sale with no Payment record and puts the table in Payment due. Collecting the outstanding balance records a real Payment and moves the table to Paid. The cashier explicitly frees a Paid table when it is ready for the next guests.

Cashiers may also use **Free table with bill due** for an unpaid or partially paid bill. This releases the physical table immediately but retains the Table-Linked Sale and its outstanding balance for history and later collection. It never writes off the balance or fabricates an “unpaid” Payment.

## User Stories

1. As an administrator, I want a Tables destination in a selected Store workspace, so that I can configure that Store’s tables.
2. As an administrator, I want each Store workspace to show only its own tables, so that table setup never falls back to Organization-wide data.
3. As an administrator, I want to create a Service Table with a required Table no label, so that staff can identify the physical table.
4. As an administrator, I want the Table no label to accept meaningful short labels such as `1`, `A1`, `Patio-2`, or `Counter`, so that the system reflects the store’s real naming convention.
5. As an administrator, I want duplicate Table no labels rejected within the same Store, so that staff cannot open the wrong table.
6. As an administrator, I want the same label to be allowed in different Stores, so that each branch can use its own layout.
7. As an administrator, I want to optionally record a positive whole-number Persons no capacity, so that staff can see how many guests a table normally seats.
8. As an administrator, I want to leave Persons no blank, so that a useful table can be configured even when its capacity is unknown.
9. As an administrator, I want every configured table rendered as a table-like box in a simple grid, so that the layout is easy to scan.
10. As an administrator, I want the optional person count displayed below the center of the table box, so that capacity is visible without obscuring the table label or status.
11. As an administrator, I want to drag and drop table boxes within their Service Area grid, so that I can set a useful display order.
12. As an administrator, I want saved table and Service Area order to remain after reopening the page, so that the grid stays familiar.
13. As an administrator, I want table configuration to be available only in a selected Store workspace, so that table setup stays scoped to one Store and separate from point-of-sale operations.
14. As a POS operator, I want a Tables destination in the Ganatri POS sidebar, so that I can work from a live table-oriented view.
15. As a POS operator, I want to see every Service Table for my device’s Store, so that I can assess the current service area at a glance.
16. As a POS operator, I want each table to visibly distinguish Free, Allocated, Engaged, Ready to bill, Payment due, and Paid, so that I know the next action without opening every bill.
17. As a POS operator, I want a Free table to have an Allocate action, so that I can reserve it when guests sit down without creating an empty order.
18. As a POS operator, I want to free an Allocated table immediately, so that a group that leaves before ordering does not leave a bill record behind.
19. As a waiter, I want Start order on an Allocated table to create that table’s Draft Sale, so that the table becomes Engaged only once an actual order begins.
20. As a waiter, I want to add products and optional add-ons to the table’s current Draft Sale using the existing bill composer, so that table orders use the same trusted catalog pricing as all other POS orders.
21. As a waiter, I want to save and resume the table’s Draft Sale, so that orders can be taken over multiple visits to the table.
22. As a waiter, I want an Engaged table to have no more than one Active Table Sale, so that two operators cannot accidentally create duplicate current bills for the same guests.
23. As a cashier or waiter, I want clicking an Engaged table to reopen its current Draft Sale in the existing bill composer, so that I can update or continue the order.
24. As a cashier or waiter, I want to cancel an Engaged table’s uncommitted order when guests leave, so that the Draft Sale is discarded and the table becomes Free without creating a financial Sale.
25. As a waiter, I want to mark an Engaged table Ready to bill after confirming the guests are finished ordering, so that the cashier knows a customer bill is needed.
26. As a cashier, I want a Ready to bill table to open its current Draft Sale in the current bill workflow, so that I can verify or update the order before placing it.
27. As a cashier, I want Place order from a table bill to commit the current Draft Sale, assign the normal Sale Number, and print the customer receipt, so that the guest receives a bill through the existing POS printing workflow.
28. As a cashier, I want to use the existing Paid, Partial, or Due settlement choices while placing a table bill, so that table service does not introduce a misleading “unpaid” payment method.
29. As a cashier, I want to place a Due table bill without selecting a Customer, so that guests who will pay at the counter can be billed without forced customer creation.
30. As a cashier, I want to optionally attach a Customer to a Due table bill, so that the customer ledger is updated when the customer is known.
31. As a cashier, I want to optionally attach both a Customer and a Service Table to a Due Sale, so that customer accountability and table context can coexist.
32. As a cashier, I want a Due Sale to be valid when it has no Customer and no Service Table, so that normal non-table walk-in due handling remains available.
33. As a POS operator, I want a table in Payment due to show the outstanding bill total, so that I can identify the amount still owed from the floor view.
34. As a cashier, I want to collect a Payment directly from a Payment due table using a real tender and amount, so that the Sale becomes Paid only after money is actually recorded.
35. As a cashier, I want a partially paid table bill to remain Payment due with its remaining balance shown, so that partial collection does not falsely free or settle the table.
36. As a cashier, I want a fully paid table to remain visibly Paid until I explicitly free it, so that cleaning or guest departure can be confirmed separately from payment.
37. As a cashier, I want to manually free a Paid table, so that it returns to Free only when physically ready for another guest.
38. As a cashier, I want to free a Payment due table while preserving its unpaid or partial Sale, so that a guest who leaves or absconds does not block the physical table.
39. As a cashier, I want the released due bill to keep its original table association in history, so that staff can later trace where the unpaid bill originated.
40. As a POS operator, I want a table released with bill due to accept a new allocation and order, so that an old debt never prevents a new guest from using the physical table.
41. As an administrator, I want historical table-linked sales to retain their original table context after table configuration changes, so that receipt and due-history interpretation remain reliable.
42. As a POS operator, I want all authenticated Store Devices to use the same table workflow, so that waiters and cashiers can cooperate across devices in the same Store.
43. As a store owner, I want no new waiter/cashier permission system in this release, so that existing device-authenticated POS access remains simple.
44. As a store owner, I want admin billing to remain read-only, so that table-service configuration is not mistaken for permission to create or alter Sales from the Admin workspace.
45. As a POS operator, I want table operations to remain confined to my device’s Store, so that tables and their bills never cross Store boundaries.
46. As an administrator, I want to see which Service Tables belong to a selected Service Area, so that I can review that group in the grid.
47. As an administrator, I want to assign Unassigned Service Tables to a Service Area, so that those tables belong to that part of the floor.
48. As an administrator, I want to unassign a table from its Service Area, so that it becomes available for another area.
49. As an administrator, I want to change a live Service Table's Service Area from the table's edit dialog, including Unassigned, so that moving a table does not require a separate unassign-then-assign step.
50. As an administrator, I want deleting a Service Area to unassign its tables rather than delete them, so that the tables remain configured for the Store.
51. As an administrator or POS operator, I want the grid to group tables under their Service Area headings, so that tables are scanned by area rather than as one flat list.
52. As an administrator, I want to rename a Service Table and a Service Area in place, so that the floor labels match the store.
53. As an administrator, I want to delete a Free Service Table from the live floor, so that a removed physical table no longer appears in Admin or POS.
54. As an administrator, I want add, rename, and delete to be available without entering Rearrange, so that creating a table is not gated behind layout edit.
55. As an administrator, I want Rearrange to only change saved order, so that Cancel never undoes a table or area I already created.

## Implementation Decisions

- Introduce a store-owned **Service Table** model. Its required `tableLabel` is trimmed, short, and unique among that Store's live Service Tables; uniqueness is enforced case-insensitively. Retired Service Tables keep their last label for history and do not block reuse of that Table no. Its optional `capacity` is a positive whole number. The model persists its current operational state and its ordinal position within its Service Area or the Unassigned group.
- Persist Service Area order and Service Table order as integer sort values. Render those values as a responsive simple grid; dragging changes order only and never records floor coordinates.
- Give the Service Table a current state: `free`, `allocated`, `engaged`, `ready_to_bill`, `payment_due`, or `paid`. Only explicit table-service commands perform state transitions; a browser client must not be trusted to write an arbitrary state.
- Keep a `currentSaleId` (nullable) on the Service Table for the bill currently occupying that physical table. Keep a nullable `serviceTableId` on Sales as the historical Table-Linked Sale association. Releasing a table clears its `currentSaleId` and changes its state to `free`; it does not erase the Sale’s `serviceTableId`.
- Create a Store-scoped uniqueness safeguard for a table’s draft order, backed by transactional table/sale locking. A table can have one Active Table Sale at most, while previously released due Sales may remain historically linked to the same table.
- Model an Allocated Service Table without a Sale. Start order atomically creates the Draft Sale, assigns it to the table as its current sale, and changes the table to `engaged`.
- Reuse the existing Draft Sale operations and POS bill composer for table orders. Resuming an Engaged or Ready to bill table loads its current Draft Sale into that composer. Editing a Ready to bill draft returns it to `engaged`; it must be marked Ready to bill again before the cashier places it.
- Cancel order reuses Draft Sale deletion only for the table’s current uncommitted Draft Sale. It atomically clears that current sale and frees the table. It must never delete a committed Sale.
- Mark ready is a manual, non-financial transition from `engaged` to `ready_to_bill`; it does not place, print, or collect a bill automatically.
- Place order for a table reuses the existing Draft Sale commit path, normal Sale Number allocation, trusted catalog snapshot pricing, and receipt-printing integration. The table command updates the committed Table-Linked Sale and table state in the same transaction. A Ready to bill table settles as `paid`, `payment_due`, or remains `payment_due` after a partial Payment.
- Retain the existing **Due** settlement option. It means the commit contains no Payment row. Do not add `unpaid` to payment-method types, filters, receipt labels, or reports.
- Relax the current customer-only receivable invariant in database constraints and billing services. A committed pending or partial Sale may have a Customer, a Service Table, both, or neither. Customer ledger entries and customer-balance updates occur only when the Sale has a Customer; unassigned or table-only due Sales create no customer-ledger entry.
- Relax post-commit payment collection accordingly. A Payment on a due Sale without a Customer is allowed and updates the Sale totals/status, but creates no customer-ledger entry. Payments must still record a real positive amount and tender and cannot exceed the remaining balance.
- Collect payment from the table view by delegating to the existing payment contract. A fully collected bill moves the table to `paid`; a partial collection leaves it `payment_due`. “Mark paid” is therefore an operator-facing outcome, not a fabricated payment record.
- Free table with bill due is a deliberate release command for a currently `payment_due` table. It preserves the outstanding Sale, total, payment status, and historical `serviceTableId`; it does not forgive debt, void the Sale, or affect a Customer ledger beyond the normal recorded balance.
- Manually free a `paid` table by clearing its current sale. Do not automatically free a table after payment, because service staff may need to wait for guests to leave or the table to be cleaned.
- Add typed DTOs, request schemas, query keys, client service functions, backend routes, application-service commands, and repositories for the table model and live table view. Admin configuration routes remain user-authenticated and explicitly Store-scoped. POS operational routes derive Store scope from the authenticated Store Device, following the existing device-scoped billing-route rule.
- A Service Table may belong to at most one Service Area through a nullable area association. Changing that membership is a configuration update on the table and may move it directly from one area to another or to Unassigned. Deleting an area unassigns its tables and does not delete the tables. Area assignment is admin configuration only and does not change table operational state. The grid groups tables under each Service Area heading and lists Unassigned tables last.
- Deleting a live Service Table retires it: it leaves Admin and POS permanently, is not restorable, and is kept so Table-Linked Sales and Table Orders retain their original table context. Delete is allowed only while the table is Free. Several retired tables may share a former Table no; only one live Service Table in that Store may hold that label.
- Admin Tables add, rename, and delete persist immediately. Rearrange is a separate exclusive mode whose Confirm/Cancel apply only to drag-order of areas and of tables within an area. Rearrange does not move tables across areas.
- Add **Tables** only to the selected Store workspace route in Admin. POS Tables is a live grid/status screen and hands table drafts into the existing POS composer instead of duplicating product-selection, settlement, invoice, or printing UI.
- Keep access role-neutral: every Active Store Device may allocate, order, mark ready, place, collect, cancel, and release tables. No waiter/cashier role or per-action authorization schema is added.
- Maintain the current read-only Admin Billing boundary. The Admin Tables page manages Service Table configuration and layout only; Sales and Payments remain writable only through device-authenticated POS flows.

## Testing Decisions

- Test observable outcomes at the table-service application-service boundary: returned table state, current-sale linkage, persisted Table-Linked Sale association, Sale status, Payment status, totals, and Customer Ledger effects. Do not assert private helper calls or UI implementation structure.
- Add contract tests for Service Table creation and update payloads: trimmed labels, per-Store live uniqueness behavior, optional positive integer capacity, optional Service Area on create/update, and rejection of invalid states or cross-Store identifiers. Follow the existing Zod billing-contract tests in the types package. Cover Service Area assignment payloads. Cover retiring a Free table, rejecting delete of an occupied table, and reusing a Table no after retire.
- Add service tests following the existing billing service’s repository-mocked test style. Cover allocation with no Sale, freeing allocation with no bill, start order, one-current-draft enforcement, resume/update, ready-to-bill, canceling a draft, commit-and-print handoff, paid, partial, due, collection, manual release, and free-with-bill-due. Cover assigning Unassigned Service Tables to an area, rejecting a table already assigned to another area, and unassigning a table from the selected area.
- Test the receivable-rule change through billing service behavior: committed Due and partial Sales with customer-only, table-only, both, and neither; confirm ledger entries only exist for a Customer-linked Sale; confirm later collection works for a customerless due Sale.
- Add persistence/migration coverage for Store isolation, case-insensitive table-label uniqueness, historical Sale table linkage after release, and a new draft being allowed after an earlier due Sale is released.
- Test concurrent Start order attempts so only one Draft Sale becomes the table’s Active Table Sale, and test concurrent release/payment commands so table state and Sale state cannot diverge.
- Extend the existing Admin Store-workspace and POS route-context/navigation tests for the Tables route, and add user-behavior tests for table card actions and composer handoff. The tests should verify state/action visibility and inputs/outputs, not CSS class names or component internals.
- Preserve and run existing billing tests for trusted snapshot pricing, Draft Sale deletion, commit, payment collection, sale-number assignment, and printing payloads, since table service composes those existing paths.

## Out of Scope

- Waiter/cashier user roles, role-specific permissions, shift assignment, or per-operator identity beyond existing Store Device attribution.
- Automated state changes, automatic receipt printing, auto-freeing after payment, timers, table turnover alerts, or cleaning workflows.
- Kitchen-order tickets, kitchen display integration, table-side printer routing, and restaurant course management.
- Splitting one table bill, merging tables, moving an active order between tables, or multiple simultaneous current orders on one table.
- Coordinate-based floor canvases, custom table shapes, rotation, walls, furniture, seating diagrams beyond the optional capacity number, or multi-floor layout editing.
- Writing off, forgiving, sending reminders for, or reconciling a Released Table Due. The feature only preserves the outstanding Sale and permits ordinary future Payment collection.
- Changing payment-method taxonomy by adding an `unpaid` tender; existing Due settlement remains the representation of no money collected.
- Restoring a Retired Service Table, or retroactively changing historical table associations.
- Changing the existing read-only Admin Billing rules or giving Admin sessions authority to write Sales or Payments.

## Further Notes

- The agreed canonical vocabulary is in `CONTEXT.md`: Service Table, Retired Service Table, Service Area, Unassigned Service Table, Active Table Order, Allocated Service Table, Discarded Table Order, Table-Linked Sale, Released Table Due, Receivable Sale, and Role-Neutral Table Access. Area membership uses assign/unassign/move so it is not confused with allocating a table to seated guests.
- A person count is informational; it does not limit the number of items, require a Customer, or calculate a bill.
- A current table total is the Draft Sale total before placement and the committed Sale’s due/paid amount after placement. Free and Allocated tables have no current bill total.
- Table state is physical-service state, not a replacement for Sale Status or Payment Status. A Released Table Due is Free physically while its historical Sale remains completed and pending or partial financially.
- Existing non-table POS billing continues to work unchanged. It may create a Due Sale with neither a Customer nor a Service Table under the revised receivable rule.
