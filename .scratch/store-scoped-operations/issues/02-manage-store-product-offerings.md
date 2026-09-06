# 02 — Manage Store Product Offerings

**What to build:** The Organization creates each shared Catalog Product once and chooses the Stores where it is offered. In a Store workspace, an administrator can manage that Store's offering of an existing Catalog Product, including selling price, discount, and active menu status, without creating a private product or changing shared product details.

**Blocked by:** 01 — Store workspace foundation.

**Status:** ready-for-agent

- [ ] Creating a Catalog Product requires valid target Stores from the current Organization and initially selects all current Stores by default in the Organization workflow.
- [ ] Each target Store receives at most one Store Product Offering, with its own selling price, discount, and active/inactive status.
- [ ] A Store workspace can add an existing Catalog Product, change its offering price/discount/status, or deactivate/remove that offering, but cannot create a Catalog Product or edit its shared name, image, category, unit, quantity, composition, or add-ons.
- [ ] Existing Catalog Product price, discount, and status are migrated into an offering for every existing Store in the Organization, preserving the current effective menu on rollout.
- [ ] Store/Organization mismatches and duplicate Offerings are rejected by the backend.
