# Discounts and payments are separate billing concepts

In POS billing, a discount changes Sale pricing before settlement, while a payment records money actually collected against the discounted Sale total. We will model cashier-entered order discounts as part of Sale pricing and keep partial-payment behavior on the existing Payments plus Payment Status flow, so unpaid balance is never represented by a fake discount.
