# Promotions tab chooses an approved marketing template

Status: approved

## Goal

Make the Promotions tab use the selected Store-bound approved Meta Cloud marketing template when sending a Cloud promotion.

## Current problem

The Promotions tab currently opens a freeform promotion dialog. Its optional legacy message-template selector only copies text into the editor and does not identify the Cloud template. The backend requires an active approved Cloud template binding for the selected Store and account, but the UI previously exposed only one local default and could not select among multiple approved marketing templates.

This creates a misleading UI: the user can edit text that Cloud sending will reject.

## Scope

- Load the selected Store's active promotion templates.
- For the selected Cloud account, load Cloud templates, submissions, and Store bindings.
- Identify all active Store bindings whose Cloud assets are approved marketing templates.
- Show the approved marketing templates as choices inside the New promotion dialog.
- Disable Cloud promotion sending until the approved Store-bound template is available.
- Use the selected approved Cloud template components and sample values in the send-dialog preview.
- Lock the message body for Cloud promotions.
- Require an image when the approved Cloud template has an image header.
- Send the selected binding ID so the backend can validate the exact Store, WABA, kind, approval, and local-template relationship.
- Do not automatically sync Meta templates from the Promotions tab; manual sync remains in Templates.
- Keep the existing editable legacy flow for non-Cloud WhatsApp accounts.
- Keep campaign history, cooldown, consent filtering, delivery progress, stop, refresh, and pagination.

## Out of scope

- Changing database migrations or template synchronization behavior.
- Changing Meta template submission or approval behavior.
- Moving the full Cloud template manager into the Promotions tab.
- Removing legacy template management for non-Cloud accounts.

## Acceptance criteria

- A Cloud Store with multiple approved bound marketing templates can choose among them in the New promotion dialog.
- The send dialog cannot edit or replace the approved Cloud message body.
- The send dialog preview updates when the selected approved Cloud template changes and renders its components and sample values.
- Image-header templates require an image before queueing.
- A missing binding or approved asset gives an actionable blocked state.
- A non-Cloud Store retains the existing saved-template and freeform message workflow.
- Existing campaign statistics and delivery controls continue to work.
- Promotions performs only read queries; it does not call template sync.
- Focused tests, the admin TypeScript check, and `git diff --check` pass.
