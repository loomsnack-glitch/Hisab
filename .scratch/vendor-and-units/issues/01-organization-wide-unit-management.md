# 01 — Organization-wide Unit management

**What to build:** Give an Organization administrator a separate Units destination in Ganatri Admin where they can view the standard Units supplied by Hisab, create and edit Organization-defined Units, and control the active/inactive availability of every Unit. The page must keep predefined definitions read-only, prevent duplicate normalized names and labels, preserve inactive Units on existing references, and make inactive Units unavailable for new or edited Vendor Items.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Units sidebar destination opens an Organization-scoped page that clearly distinguishes predefined and Organization-defined Units.
- [ ] The agreed predefined Units are available to every Organization by default and their name and label cannot be edited.
- [ ] Administrators can create, edit, deactivate, and reactivate custom Units, but cannot delete them.
- [ ] Administrators can deactivate and reactivate a predefined Unit for their own Organization without modifying its system definition or another Organization's availability.
- [ ] Unit names and short labels are unique after normalization across predefined and custom Units, even when inactive.
- [ ] A Unit has only a name and short label; conversion, dimension, and price-conversion behaviour is absent.
- [ ] API, authorization, Organization isolation, schema validation, and visible Admin behavior are covered by external-behavior tests.
