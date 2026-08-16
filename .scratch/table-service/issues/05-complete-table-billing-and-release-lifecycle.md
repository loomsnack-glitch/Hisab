# 05 — Complete the table billing and release lifecycle

**What to build:** Staff can finish the Service Table lifecycle: signal that an Engaged draft is Ready to bill, have a cashier place and print it, collect real payments, and explicitly release either a paid table or a table whose bill remains due.

**Blocked by:** 03 — Run Draft Sales from Engaged tables; 04 — Allow customer-optional Due Sales and later collection.

**Status:** ready-for-agent

- [ ] Mark ready changes an Engaged table to Ready to bill without automatically placing, printing, or collecting a Sale.
- [ ] Editing a Ready to bill Draft Sale returns the table to Engaged, requiring a new explicit mark-ready signal.
- [ ] A cashier can open the Ready to bill draft in the existing composer, place it with Paid, Partial, or Due settlement, and invoke the existing customer-receipt printing workflow.
- [ ] A placed table Sale retains its historical table association and the live table card shows the relevant total and Paid or Payment due state.
- [ ] Collecting the remaining balance through a real Payment changes a fully settled table to Paid; partial collection leaves it Payment due with its remaining balance.
- [ ] A cashier can manually free a Paid table only when the physical table is ready for reuse.
- [ ] Free table with bill due releases a Payment due table for a new allocation while preserving the completed pending/partial Table-Linked Sale, its original table context, and its outstanding balance without voiding or forgiving it.
- [ ] A newly allocated table can start a new Draft Sale after a prior due Sale was released from that same table.
- [ ] End-to-end state-transition, receipt-handoff, payment, release, Store-isolation, and regression tests prove that table physical state never diverges from its current Sale state.
