# Cloud send shown as dead letter after Meta delivered it

Status: resolved
Type: task

## Symptom

An Adajan Cloud WhatsApp template message reached Meta and was read by the
recipient, but Ganatri showed the outbox entry as `dead_letter` with
`missing_provider_message_id`.

## Confirmed production-like evidence

- The outbox row was marked `dead_letter` after one attempt with
  `missing_provider_message_id`.
- Meta webhook events for the same invoice contained the same callback key and
  a provider ID ending in `==`.
- Meta reported `sent`, `delivered`, and `read` for that provider ID.
- Those webhook events later became dead letters after eight processing
  attempts with `could not determine data type of parameter $3`.

## Affected code paths

1. `cloud-outbound.ts` validates `messages[0].id` with a regex that permits
   only `wamid` values made of letters, digits, `.`, `_`, `:`, and `-`.
   Meta WAMIDs are opaque and may contain Base64 padding such as `=`. The
   valid response ID is therefore discarded and the send is classified as a
   permanent `missing_provider_message_id` failure.
2. `whatsapp.repository.ts:updateCloudMessageStatus` compares the optional
   callback parameter using a bare PostgreSQL parameter in `... IS NOT NULL`.
   When PostgreSQL cannot infer that parameter's type, webhook processing fails
   before it can match `message.idempotency_key` and attach the provider ID.
3. The existing safe `reconciling` path is used for network-uncertain POSTs,
   but not for a successful response whose valid opaque ID was rejected. This
   turns a protocol parsing defect into a terminal state and prevents the
   normal callback reconciliation path.
4. Existing terminal outbox rows are not automatically repaired when a later
   provider status arrives. The normal fix must prevent new rows from entering
   this state; a separate controlled reconciliation is needed for historical
   rows and must not resend them.

## Ranked hypotheses and predictions

1. **Padded WAMID validation is too strict.** If the validator accepts opaque
   Meta IDs containing `=`, the send response becomes `accepted` instead of
   `missing_provider_message_id`.
2. **The callback parameter has no stable SQL type.** If the optional callback
   parameter is explicitly cast to `text`, webhook status processing completes
   and matches the outbound message by idempotency key.
3. **The provider callback was missing correlation data.** If this were true,
   the captured webhook status would have no `biz_opaque_callback_data`; the
   captured event does contain the invoice callback key, so this is falsified.
4. **Meta rejected the send.** If this were true, the webhook would contain a
   failed status or no delivery status; the captured event reached `read`, so
   this is falsified.

## Safe fix scope

- Treat provider message IDs as opaque, bounded, non-whitespace strings in
  both outbound response parsing and webhook normalization.
- Explicitly cast the optional callback parameter to `text` in the status
  lookup query.
- Add regression tests for a padded WAMID and callback-based reconciliation.
- Do not automatically resend the already-delivered historical message.

## Acceptance criteria

- A response ID such as
  `wamid.HBgMOTE4ODY2Mjg4NjAyFQIAERgSREUxNEUzMEFGMkM0N0E3NjE4AA==` is accepted.
- A Cloud webhook status with `biz_opaque_callback_data` updates the matching
  outbound message and outbox without a PostgreSQL type-inference error.
- A delivered/read message is never converted to `dead_letter` by this path.
- The focused Cloud outbound, dispatcher, webhook normalizer, and repository
  tests pass.
- No access token, message body, or full provider payload is logged or stored
  in this issue.

## Comments

### 2026-08-23 — Diagnosis

The issue was reproduced from the live development database. The send was
successful at Meta; the UI state was wrong because two independent local bugs
blocked acceptance and callback reconciliation.

### 2026-08-23 — Fix and verification

- Outbound provider IDs now use the same bounded opaque-ID rule as webhook
  IDs, so valid Base64-padded WAMIDs are accepted.
- The optional webhook callback parameter is explicitly cast to `text` before
  PostgreSQL evaluates `IS NOT NULL`.
- Regression coverage was added for the padded WAMID and generated SQL.
- Focused Cloud transport, dispatcher, normalizer, processor, and repository
  tests pass.
- The existing live dead-letter row was not resent or mutated automatically;
  it requires a separately controlled historical reconciliation because Meta
  already processed it.
