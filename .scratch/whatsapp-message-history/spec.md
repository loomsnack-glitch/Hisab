# WhatsApp message history in Ganatri Admin

Status: complete

## Problem

The WhatsApp conversation view is currently exposed from POS even though it is an operational/admin workflow. This duplicates the Admin conversation UI and makes the POS workspace responsible for browsing message history.

## Goal

Make Ganatri Admin the canonical place to review the real WhatsApp conversations and messages already stored by the backend.

## Scope

- Add a `Message history` tab beside `Templates` and `Promotions` in the organization WhatsApp workspace.
- Reuse the existing Admin tenant conversation view and Store-scoped conversation APIs.
- Preserve the existing conversation list, polling, message bodies, template labels, delivery status, attachments, and customer linking behavior.
- Keep the selected Store in the workspace query string so message history is unambiguously Store-scoped.
- Remove the WhatsApp conversation screen from POS and redirect its old `/whatsapp` URL to the POS home.
- Keep POS WhatsApp account connection/status controls and invoice/due-message sending behavior unchanged.
- Redirect the old Admin inbox URLs to the new workspace route where a Store can be selected.

## Non-goals

- No database migration or message/outbox schema change.
- No change to WhatsApp sending, retry, worker, provider, or account-linking behavior.
- No promotion dashboard or template-preview redesign.
- No new composer or cross-Store inbox.
- No removal of the existing conversation API or service functions; they remain compatibility-safe backend capabilities.

## Acceptance criteria

1. Admin WhatsApp navigation has a `Message history` tab next to `Templates` and `Promotions`.
2. Opening the tab loads conversations for the selected Store through the existing authenticated tenant API.
3. The view supports the same message review behavior as the current Admin inbox: polling, selecting conversations, delivery status, attachments, and customer linking.
4. Changing Store changes the conversation query and does not show the previous Store's data.
5. The old Store-specific Admin inbox URL redirects to `whatsapp/message-history?storeId=<storeId>`.
6. POS no longer renders a conversation list/message pane and `/whatsapp` redirects home.
7. POS still shows WhatsApp account connection/status and can continue queueing WhatsApp invoice and due messages.
8. No database migration is added or required.

## Verification

- `bun run test` in `apps/admin` and `apps/pos`
- `bun run check-types` in `apps/admin` and `apps/pos`
- `bun run build` in `apps/admin` and `apps/pos`
- `git diff --check`
