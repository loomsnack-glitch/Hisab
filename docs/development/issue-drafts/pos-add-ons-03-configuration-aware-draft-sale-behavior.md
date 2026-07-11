# Configuration-aware Draft Sale behavior

## What to build

Complete the Draft Sale behavior for configured Products so Billing understands configuration identity instead of only Product identity.

This slice should make Draft Sale behavior work end to end for:

- multiple Add-Ons on one configured Product
- whole-count Product and Add-On quantities only
- enforcement of `Add-On Selection Cap`
- normalized `Configured Sale Item Signature` independent of Add-On click order
- merge by identical configuration
- separate lines for different configurations of the same Product
- customize with no selected Add-Ons merging into the plain Product line
- frozen Add-On selection after a configured line has been added
- quantity changes that scale the whole frozen configuration

This slice should also replace the current product-only duplicate-line rule in Billing with configuration-aware identity.

## Acceptance criteria

- [ ] Billing accepts multiple different Add-Ons on one configured Product line and rejects invalid selections atomically when any Add-On is duplicated, over cap, inactive for new selection, or otherwise invalid.
- [ ] Product and Add-On quantities are enforced as whole counts throughout the request contract, backend validation, and persistence rules.
- [ ] Adding the same Product with the same normalized Add-On quantities merges by quantity, while different Add-On configurations stay on separate Draft Sale lines.
- [ ] Once added, a configured line's Add-On selection is frozen: quantity may change, but changing the configuration requires removing and re-adding the line, with behavior covered by billing workflow tests.

## Blocked by

- `Sell a configured Product with trusted snapshots`
