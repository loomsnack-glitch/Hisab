# WhatsApp message-history UI improvements

Status: complete

## Goal

Make Ganatri Admin message history easier to scan and closer to the customer-facing WhatsApp experience while preserving the historical template name, rendered template preview, delivery status, attachments, polling, and customer linking.

## Non-goals

- No WhatsApp sending, retry, provider, or database changes.
- No change to the message-history API contract.
- No composer or cross-Store inbox.

## Phases

### Phase 1 — Inbox navigation and states

- Search conversations by display name or phone number.
- Show filtered/total counts and the visible unread total as compact badges.
- Keep clear empty-search states without adding another sidebar control.
- Improve conversation-list loading feedback with row skeletons.

### Phase 2 — Message timeline clarity

- Add Today/Yesterday/date separators.
- Keep messages visually grouped by direction and preserve template previews.
- Replace status-only text treatment with accessible WhatsApp-style delivery icons while retaining readable status text.

### Phase 3 — Responsive and accessibility polish

- Improve selected-conversation header hierarchy and mobile spacing.
- Add accessible labels/tooltips for status and attachment actions.
- Verify malformed/empty states do not crash the inbox.

## Acceptance criteria

1. Search and unread badges never change the selected Store or API query scope.
2. A filtered list clearly communicates no matches and the visible/total count.
3. Messages are separated by local calendar day without changing order or content.
4. Outbound statuses remain readable and have meaningful accessible labels/icons.
5. Existing template previews, links, attachments, polling, and customer linking continue to work.
6. Focused Admin tests and lint pass; unrelated worktree files remain untouched.
