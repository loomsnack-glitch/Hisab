# Basic billing uses sales, payments, and an append-only customer ledger

Billing in Hisab is modeled as committed Sales with Sale Items and collected Payments, not as a separate invoice domain. Receivable balances belong to Customers and are explained through an append-only Customer Ledger; billing v1 deliberately excludes inventory effects and refund flows so the first migration stays focused on billing state and money collection.
