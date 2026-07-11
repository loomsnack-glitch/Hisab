# Lifecycle-safe configured billing

## What to build

Make configured billing resilient to catalog churn so Draft Sale lines remain stable even when the catalog changes after the line was added.

This slice should ensure:

- inactive Products stop appearing for new plain or customized selection
- inactive Add-Ons stop appearing in new customize flows
- inactive Product/Add-On attachments stop appearing for new customize flows
- already-added configured Draft Sale lines keep their frozen snapshots until removed
- already-added configured Draft Sale lines can still be committed even if the Product, Add-On, or attachment became inactive later

The key behavior is that catalog lifecycle changes affect future selection, not previously captured Draft Sale history.

## Acceptance criteria

- [ ] New billing selections exclude inactive Products, inactive Add-Ons, and inactive Product/Add-On attachments immediately.
- [ ] Existing Draft Sale lines that already captured those Products/Add-Ons/attachments retain their frozen snapshots and remain readable in bill detail.
- [ ] A Draft Sale containing already-frozen configured lines can still be committed successfully after later catalog deactivation of related reference data.
- [ ] Billing and catalog behavior tests cover both "future selection blocked" and "existing draft still valid" scenarios.

## Blocked by

- `Sell a configured Product with trusted snapshots`
