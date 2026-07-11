# Add-On sales visibility and rollups

## What to build

Add the read-model and reporting behavior that makes Add-On sales visible both in bill detail and in business analysis.

This slice should deliver:

- nested Add-On display under parent Product rows anywhere sale detail or receipt-style output is shown
- Add-On sales visibility under the parent Product for product-scoped analysis
- Add-On aggregation by Add-On across all Products for overall Add-On performance analysis

The slice should rely on the parent/child billing model already introduced in earlier slices and make the dual reporting requirement explicit in the read path.

## Acceptance criteria

- [ ] Sale detail and receipt-style output show Add-On child rows nested under the parent Product row in a clear, stable format.
- [ ] Reporting or read-model queries can attribute Add-On sales back to their parent Products.
- [ ] Reporting or read-model queries can also aggregate Add-On sales by Add-On across all Products.
- [ ] Behavior tests cover both parent-scoped and add-on-scoped sales visibility using the configured billing data model.

## Blocked by

- `Configuration-aware Draft Sale behavior`
- `Lifecycle-safe configured billing`
