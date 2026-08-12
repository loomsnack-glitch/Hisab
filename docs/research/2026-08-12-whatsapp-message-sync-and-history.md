# WhatsApp Message Synchronization and History Research

Date: 2026-08-12
Repository: Ganatri/Hisab
Scope: Phase 7.1, 1:1 customer conversations in `apps/whatsapp-worker`

## Findings

- Baileys emits `messages.upsert` for both offline-sync and realtime messages.
  The event has a `type` of `notify` or `append`, and every message in the
  event array must be processed. `notify` represents a new message; `append`
  represents a message added to chat history without a new notification.
  Source: [Receiving Updates](https://baileys.wiki/docs/socket/receiving-updates/)
  and [MessageUpsertType](https://baileys.wiki/docs/api/type-aliases/MessageUpsertType/).
- Initial history is delivered through `messaging-history.set`, which includes
  messages, chats, contacts, sync type, progress, and an `isLatest` marker.
  The application is expected to store these messages and provide a message
  lookup for retry/decryption.
  Source: [History Sync](https://baileys.wiki/docs/socket/history-sync/) and
  [BaileysEventMap](https://baileys.wiki/docs/api/type-aliases/BaileysEventMap/).
- `syncFullHistory` controls whether Baileys asks the phone for full history,
  while `shouldSyncHistoryMessage` controls which history notifications are
  accepted. `getMessage` is the socket callback used to retrieve stored
  messages when a send needs a retry.
  Source: [SocketConfig](https://baileys.wiki/docs/api/type-aliases/SocketConfig/).

## Local root causes

The existing adapter had three synchronization gaps:

1. `syncFullHistory` was hard-coded to `false`.
2. Only `messages.upsert` was handled; `messaging-history.set` was ignored.
3. The inbound handler returned immediately when `message.key.fromMe` was
   true, so messages sent from the linked phone could never reach Ganatri.

The backend also hard-coded every worker-ingested row to `inbound` and always
incremented unread counts. That was correct for customer messages but not for
phone-originated outbound messages or historical replay.

## Phase 7.1 decisions

- Introduce one direction-aware worker event contract with `direction` set to
  `inbound` for customer messages and `outbound` for messages sent from the
  linked phone.
- Include `source` as `realtime` or `history`. Historical inbound messages are
  stored but do not increase unread counts.
- Handle both `messages.upsert` and `messaging-history.set` for supported
  individual customer chats. Groups, broadcasts, newsletters, reactions, and
  campaign behavior remain out of scope.
- Keep provider-message-id uniqueness as the primary deduplication boundary.
  Also reconcile a near-simultaneous provider event with an existing queued
  outbound message so a worker event cannot race the invoice outbox result into
  a duplicate row.
- Retry worker-to-API event delivery with bounded exponential backoff. The API
  remains the durable store, and history replay plus provider-idempotency makes
  retries safe after a worker restart.
- Keep a bounded in-memory message lookup for Baileys `getMessage`; durable
  conversation storage remains the system of record and a future phase can
  provide a dedicated provider-message store if retry volume requires it.

## Acceptance boundary

- A message sent from the business phone appears once as outbound.
- A customer message appears once as inbound.
- Replayed history and duplicate provider events do not create duplicate rows.
- Historical replay does not create new unread work.
- A temporary API failure is retried without losing the event in the normal
  worker process.
- The implementation remains limited to 1:1 text and document messages.
