# Add-On catalog and Product attachment management

## What to build

Introduce `Add-On` as an organization-scoped catalog concept with its own lifecycle, pricing, and discount, and let organization admins attach Add-Ons to eligible Products through a first-class `Product Add-On Attachment` rule.

This slice should deliver an end-to-end management flow where an admin can:

- create, update, and retire Add-Ons
- attach an Add-On to a Product
- set or update the attachment's `Add-On Selection Cap`
- retire an attachment without retiring the Add-On globally
- expose active Add-Ons and active attachments through the catalog/POS read path so future billing slices can consume them

The slice should preserve the agreed domain rules:

- Add-Ons are a flat organization-level catalog
- Add-On price and discount belong to the Add-On itself, not the Product attachment
- each Product/Add-On pair is unique
- `Add-On Selection Cap` defaults to `1`
- Add-On and attachment lifecycle is status-based rather than destructive deletion once history or dependencies exist

## Acceptance criteria

- [ ] Organization admins can create and update Add-Ons with name, price, discount, and active/inactive status.
- [ ] Organization admins can attach an Add-On to a Product exactly once, with a default `Add-On Selection Cap` of `1` and the ability to change that cap later.
- [ ] Organization admins can deactivate an Add-On globally or deactivate a specific Product/Add-On attachment independently, and active catalog/POS reads expose only the currently selectable Add-Ons for future billing use.
- [ ] Validation rejects duplicate Product/Add-On attachments and invalid cap values, and the slice includes behavior tests at the catalog service/API seam.

## Blocked by

None - can start immediately
