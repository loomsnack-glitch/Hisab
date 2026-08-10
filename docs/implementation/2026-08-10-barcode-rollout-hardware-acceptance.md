# Barcode scanning rollout and hardware acceptance

Use this checklist for each production Store Device before enabling Direct Barcode Scan. Barcode Scanning is controlled at the organization level; Direct Barcode Scan is a separate setting for one POS Device and does not change other counters.

## Controlled rollout

1. Keep Barcode Scanning disabled until individual Product Codes have been entered and reviewed by an administrator.
2. Enable Barcode Scanning for the organization. Confirm the intended Product Code and kind appear on each prepared Product.
3. On the selected POS Device, confirm its POS catalog has at least one active Product Code. Direct scan cannot be enabled from an empty prepared catalog.
4. Run the hardware checks below on that counter. Do not enable Direct Barcode Scan on a different counter until it has passed the same checks.
5. In the POS, enable Direct Barcode Scan for the verified device and confirm the cashier can pause and resume capture. Disable the device setting immediately if the counter is moved or its hardware changes.

## Production-equivalent hardware checks

Use the same model or an equivalent HID scanner, POS Device/browser, label printer, and label stock that will be used in production.

1. Configure the USB or Bluetooth scanner as a HID keyboard with an Enter suffix. Scan into the visible **Scan Product Code** field and verify only the code, not the Enter terminator, is received.
2. Scan a known simple Product twice. Verify it uses the existing cart behavior and increments its whole-number quantity to two.
3. Scan a Product with Add-Ons or a configurable Combo. Verify the existing configuration dialog opens; no selections are silently guessed.
4. Scan an unknown code and an inactive Product Code. Verify the bill is unchanged, the code remains visible, and manual Product search can finish the sale. Copy the displayed code for an administrator if follow-up is needed.
5. With Direct Barcode Scan enabled, pause it and type in product search and other editable fields. Resume it, then open a dialog and verify capture does not corrupt the dialog or other focused inputs.
6. For internal labels, test-print one label with the production printer and label stock, then scan it at this POS Device. Confirm it resolves to the intended Product before bulk printing. Re-run this check after changing printer, label stock, label layout, or selling-price text.
7. Complete a small regression sale through the normal workflow: draft, whole-count quantity change, discount, commit, payment, and receipt. Where the store uses Bundles, Combos, or Add-Ons, include the relevant configured sale and check the existing reporting view.

## Follow-up and diagnostics

The POS keeps the latest scan failures in a bounded browser-session diagnostic log for that device. It exposes unknown codes, conflicting duplicate assignments, and scan-to-cart failures and can be copied for an administrator to investigate.

Hisab has request logging but no deployed analytics or durable event-monitoring platform. Operators should copy this local log into the store's established support process and review backend request logs during a rollout. Central retention, alerting, and incident ownership remain deployment and operator responsibilities.
