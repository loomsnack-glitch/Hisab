# AI implementation prompt: invoice page, PDF, and appearance customization

Implement **Phase 7 — Public invoice appearance and PDF customization** from
`spec.md` in this directory.

## Operating rules

- Read the repository root guidance, the domain context, the existing
  lifecycle spec, and all relevant current implementations before editing.
- The worktree may contain unrelated user changes. Inspect `git status` and
  preserve every unrelated change; do not reset, clean, or overwrite it.
- Promotions and the Promotions tab are out of scope.
- Do not change Meta template submission, approval, Cloud account, webhook,
  queue, consent, provider delivery, public-link token, revocation, or expiry
  behavior.
- Do not use environment variables for per-Store appearance settings.
- Do not add a raw HTML/CSS/JavaScript editor.
- Do not commit until the phase is implemented, reviewed, fixed, and the user
  explicitly approves the commit.

## Required design

Create one small shared invoice-appearance interface/module that supplies:

- safe fallback theme;
- Organization default and Store override resolution;
- preset, logo, colors, typography, density, visibility, footer, and terms;
- validation and sanitization;
- design tokens usable by both the public HTML renderer and PDF renderer.

Keep financial data and secure public-link generation outside this interface.
The theme must never change totals, payment status, customer identity, sale
number, authorization, or the public token.

## Required customer experience

Redesign the public invoice page to include:

- optional logo and complete Store/Organization branding;
- clear Paid, Partially Paid, Due, or Cancelled state;
- invoice/customer/service metadata;
- readable responsive items and totals;
- prominent paid and balance-due values;
- Download PDF, Share/Copy link, review, social, contact, and configured-link
  actions where available;
- notes, terms, and footer;
- accessible loading, invalid/revoked-link, missing-data, and error states.

Redesign the PDF to use the same theme and content rules, while remaining
print-safe. Handle long names, add-ons, bundles, notes, many items, repeated
page headers, multi-page totals, missing optional data, and supported
Indian-language/emoji text safely.

## Required Admin experience

Add an **Invoice Appearance** settings area, separate from WhatsApp templates:

- Classic, Modern, and Minimal presets;
- logo upload/remove;
- accent color, header style, font preset, and density;
- safe show/hide controls;
- footer and terms text;
- desktop, mobile, and PDF live previews;
- Organization default versus Store override indication;
- Save, Publish/Apply, Reset, unsaved-change handling, and contrast warning.

Reuse existing settings, form, asset, authorization, and design-system
patterns where they fit. Keep the interface shallow for callers and put
resolution, validation, and fallback behavior behind the shared module seam.

## Execution loop

Work in vertical slices. For each slice:

1. State the slice plan and files/seams involved.
2. Implement the smallest complete change.
3. Add or update behavior-focused tests.
4. Run focused tests, type checks, and formatting/diff checks.
5. Review against both repository standards and the Phase 7 acceptance
   criteria.
6. Fix every finding before moving to the next slice.
7. Report known baseline failures separately from new failures.

Suggested slices:

1. Shared theme contract, fallback, and resolution tests.
2. Public HTML redesign and edge-state tests.
3. PDF redesign and long/multi-page tests.
4. Persistence, migration, validation, and authorization for appearance
   settings.
5. Admin editor, preview, save/reset, and responsive states.
6. Full focused review, accessibility/security review, and final verification.

## Final review checklist

- Public HTML and PDF use the same theme values where applicable.
- Organization default and Store override precedence is deterministic.
- No raw HTML/CSS/JavaScript or unsafe external resource injection exists.
- No internal IDs, secrets, full customer phone numbers, or token internals are
  exposed.
- Financial values come only from trusted sale data.
- Missing optional settings use the safe fallback and do not break rendering.
- Existing WhatsApp invoice/due sending behavior is unchanged.
- Promotions behavior is unchanged.
- Focused tests, type checks, migration checks, `git diff --check`, standards
  review, and spec review are complete.

At the end, report changed files, verification results, remaining baseline
failures, and whether the work is ready for user approval. Do not commit until
the user approves.
