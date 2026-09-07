# Shared catalog defaults with Store Commercial Overrides

Status: accepted. Supersedes ADR-0041. Catalog Products and Add-Ons own editable Organization defaults for price and discount, while Stores use explicit nullable overrides for either value; changing an Organization default therefore changes every inheriting Store without silently replacing a local decision. Organization active/inactive status is a global sellability gate and combines with a retained Store-local menu status, so a global pause is reversible without erasing local menu choices. Categories and bundle composition remain shared, with Stores able to control only category presentation and the commercial configuration of a Bundle Product or Add-On.

## Considered Options

- Copy a complete price, discount, and status into every Store Offering — rejected because a head-office change requires an error-prone mass edit and cannot distinguish inheritance from a coincidentally equal local value.
- Use Organization defaults with explicit Store Commercial Overrides — accepted because it provides central control, local exceptions, and an unambiguous return to inheritance.
