# Hisab

Hisab is a multi-tenant retail/POS system for managing stores, products, sales, and money movement at the store level.

## Language

**Billing**:
The part of the system that records a sale, its line items, and the payments collected against it. In this project, Billing is modeled through Sales and Payments rather than a separate invoice domain.
_Avoid_: Invoicing, bill book

**Payment Status**:
The settlement state of a Sale based on how much money has been collected against its grand total. A Sale may be pending, partial, or paid.
_Avoid_: Transaction status, order status

**Receivable Sale**:
A Sale whose payment status is pending or partial, and therefore still has money owed by a Customer. A Receivable Sale must belong to a specific Customer.
_Avoid_: Open bill, unpaid order

**Customer Ledger**:
The append-only history of balance-changing entries for a Customer, including sales, payments, void reversals, and manual adjustments. It exists to explain why the Customer's running balance is what it is.
_Avoid_: Balance cache, statement total

**Draft Sale**:
A Sale that is being assembled but has not yet been committed as a receivable or completed sale. Draft Sales may change freely without affecting customer balances.
_Avoid_: Temporary invoice, cart

**Payment**:
A record of money collected against a Sale. A Sale may have many Payments across different methods or points in time.
_Avoid_: Settlement row, transaction row

**Sale Number**:
A human-friendly bill identifier assigned when a Sale is committed. It is unique within a Store.
_Avoid_: UUID, internal id

**Sale Status**:
The lifecycle state of a Sale. In billing v1, a Sale may be draft, completed, or voided.
_Avoid_: Payment status, order state

**Walk-in Sale**:
A completed and fully paid Sale that does not belong to a specific Customer. Walk-in Sales are allowed in billing v1.
_Avoid_: Anonymous receivable, guest credit sale

**Sale Item Snapshot**:
The copy of a product's billing details stored on a Sale Item at billing time, such as product name and price. It preserves the historical bill even if the catalog changes later.
_Avoid_: Live product lookup, dynamic line item

**Discount**:
A reduction applied to a Sale or Sale Item before the final amount is collected. Billing v1 supports simple discounts and does not model tax.
_Avoid_: Offer engine, tax rule

**Catalog-backed Sale Item**:
A Sale Item must reference a Product and also store billing snapshots such as product name and price. Billing v1 does not support manual line items without a Product.
_Avoid_: Ad hoc line item, free-text product row

**Committed Sale**:
A Sale that has left draft and can participate in payment collection and customer balance effects. Payments are not attached to Draft Sales in billing v1.
_Avoid_: Editable paid draft, provisional settlement

**Collected Payment**:
A Payment records money that was actually received against a committed Sale. Unpaid balance is represented by the remaining amount on the Sale, not by a synthetic credit Payment.
_Avoid_: Credit placeholder payment, due row

**Voidable Sale**:
A committed Sale may be voided only if no Payments have been collected against it. Billing v1 does not support voiding paid Sales because refunds are out of scope.
_Avoid_: Post-payment void, accounting erase

**Committed Sale Number**:
A Sale Number is assigned when a Sale is committed, not while it is still a Draft Sale.
_Avoid_: Draft bill number, pre-commit sequence
