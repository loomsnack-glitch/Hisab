# Ganatri WhatsApp — Live Verification Handoff

Use this document after deploying the approved Ganatri WhatsApp Phase 6 and
Phase 7 changes to the live environment. This is a verification runbook, not a
permission to change production data.

## Current implementation baseline

The deployed build must include these Phase 6/7 checkpoints:

- `8c8d802` — policy-aware bill delivery
- `45efca5` — policy-aware due delivery
- `46fb44c` — delivery status, retry, and resend
- `0a0118a` — historical delivery status preservation
- `681dac5` — transactional resend audits
- `02c6406` — Phase 7 read-only cutover dry run
- `976d471` — migration baseline reconciliation
- `e4e8bc1` — Store policy migration
- `7a35238` — Store Workspace cutover verification
- `8a2cc3b` — POS WhatsApp route retirement
- `b628db1` — Phase 7 closeout

Do not assume these exact hashes are the deployed release. Confirm the actual
release commit and compare it with the approved deployment record.

## Variables to fill before running

```text
LIVE_API_BASE_URL=<live backend URL>
LIVE_ADMIN_URL=<live Admin URL>
LIVE_POS_URL=<live POS URL>
ORGANIZATION_ID=<controlled test Organization UUID>
STORE_ID=<controlled test Store UUID>
TEST_CUSTOMER_ID=<controlled test Customer UUID>
TEST_SALE_ID=<controlled completed Sale UUID>
TEST_DEVICE_ID=<controlled POS device UUID, if device checks are available>
RELEASE_COMMIT=<deployed git commit>
```

Never put passwords, access tokens, API keys, OTPs, device secrets, full phone
numbers, or provider payloads in this document or the verification report.

## Mandatory safety rules

The verifying AI must follow these rules:

1. Confirm the target is production before reading or writing anything.
2. Run all read-only checks before any send, migration, policy change, retry,
   resend, or route mutation.
3. Do not run `dbmate up`, migration scripts, policy migration scripts, or
   destructive SQL unless the release owner explicitly authorizes it.
4. Use only the controlled test Organization, Store, Customer, and Sale.
5. Do not use a real customer or send an uncontrolled WhatsApp message.
6. Stop immediately if the environment, release commit, migration state, Store
   scope, sender identity, or consent state does not match expectations.
7. Do not “repair” production during verification. Report the exact blocker.

## Gate 1 — Release and environment identity

Record:

- deployed backend commit and frontend build versions;
- backend health response and deployment timestamp;
- database host identity without exposing credentials;
- Admin and POS origins;
- active feature flags/configuration names, never their secret values.

Confirm that the backend is using the intended live database and not a local,
development, preview, or staging database. Do not continue if this cannot be
proved.

Confirm that the deployed release contains:

- `20260905010000_add_draft_request_id.sql`;
- `20260918110000_create_whatsapp_delivery_operator_actions.sql`;
- the current Phase 7 policy and cutover code.

## Gate 2 — Database migration state

Run the deployment-approved read-only migration status command. Expected result:

- no pending migrations;
- the two migration versions listed above are applied;
- no migration ledger version exists without its checked-in migration file;
- the schema contains `whatsapp_store_policies`,
  `whatsapp_delivery_operator_actions`, and `sales.draft_request_id`.

Do not apply migrations from this handoff. If migrations are pending, stop and
return the pending version list to the release owner.

## Gate 3 — Read-only cutover inventory

Run the deployed equivalent of:

```text
apps/backend/src/scripts/dry-run-whatsapp-cutover.ts
```

The report must be written to a non-sensitive release artifact location. Check:

- every Store has exactly one current policy;
- no Store has multiple Organization Cloud account assignments;
- every shared Cloud number has exactly one default inbound Store;
- every current `organization_cloud` policy points to a same-Organization
  Cloud assignment;
- no unresolved outbox account/sender references exist;
- no active outbox row loses its account or platform sender reference;
- historical messages, provider events, submissions, bindings, and outbox rows
  are present and are not rewritten by the check;
- the report contains no credentials, full phones, message bodies, or provider
  payloads.

Compare the live counts with the approved pre-cutover report. A count change is
not automatically an error, but every difference must have an explanation.

## Gate 4 — Admin Organization and Store Workspace boundaries

Using separate browser sessions:

### Organization Admin session

- Open the Organization WhatsApp workspace.
- Confirm account, template, safety, delivery, and Organization-level views are
  visible only within the selected Organization.
- Confirm Store-scoped actions require the selected Store and use the backend
  policy route.
- Confirm no credentials, access tokens, OTPs, or full phone numbers appear in
  URLs, route state, or client configuration.

### Store Workspace session

- Open:
  `/organizations/{ORGANIZATION_ID}/workspaces/{STORE_ID}/settings/whatsapp`
- Confirm the selected Store name and WhatsApp state are correct.
- Confirm the page cannot read another Store by changing the URL manually.
- Confirm disabled, unentitled, unassigned, unhealthy, and missing-template
  states explain the next safe action and do not enable sending.
- Confirm Store Workspace mutations remain Organization-user authenticated and
  backend-authorized.

## Gate 5 — POS authentication and route boundary

With a device-authenticated POS session:

- Open `/whatsapp` and confirm it redirects to POS home.
- Confirm the POS conversation/inbox page is not mounted or reachable through
  POS navigation.
- Confirm POS bill and due-reminder controls still exist in Sale detail.
- Confirm invoice/due status, retry, and resend calls remain device-authenticated.
- Confirm POS cannot open Admin or Store Workspace user routes.

With an Admin session, confirm that a POS device-only route is not accepted as
an Admin-authenticated route.

## Gate 6 — Controlled bill smoke test

Use only the approved controlled test Customer and completed Sale.

Before sending, confirm:

- the Customer has a valid international phone number;
- utility consent is enabled and suppression is false;
- the Sale belongs to the selected Store and is completed;
- the Store has WhatsApp entitlement;
- the current policy and sender are the intended test mode;
- Cloud mode has a connected/healthy account and approved published bill
  binding, or Ganatri Utility has the fixed approved bill template.

Then verify:

1. Queue one bill.
2. Confirm exactly one new outbox/message identity and an immutable sender,
   template, and policy snapshot.
3. Repeat the same ordinary request and confirm it is deduplicated.
4. Confirm provider status transitions are monotonic and the final status is
   visible in the same Store scope.
5. If the controlled provider test is approved, verify the actual provider
   delivery; otherwise mark provider delivery as unverified.

## Gate 7 — Controlled due-reminder smoke test

Use a completed Sale with a real remaining balance in the controlled Store.
Confirm zero-balance, voided, wrong-Store, suppressed, opted-out, and invalid
Customer cases are not used for a live send.

Then verify:

1. Queue one due reminder.
2. Confirm exactly one outbox/message identity and immutable sender/template/
   policy snapshot.
3. Repeat the ordinary request and confirm idempotent behavior.
4. Confirm the due status endpoint shows the record even if the Store policy is
   later disabled or switched.
5. Confirm retry is available only for retryable/dead-letter states.
6. Confirm deliberate resend creates a new request-scoped identity and one
   durable `whatsapp_delivery_operator_actions` audit row.

## Gate 8 — Failure and rollback checks

Do not manufacture provider failures in production. Verify from controlled
staging evidence or existing safe records that:

- timeouts enter reconciliation instead of blind resend;
- transient failures become bounded retryable work;
- permanent policy, consent, mapping, and provider failures become terminal;
- dead-letter actions are permission-protected and audited;
- policy changes never reroute an already queued sender/template snapshot;
- rollback disables or changes activation records without deleting messages,
  provider events, templates, bindings, audits, or outbox history.

## Stop conditions

Stop and report instead of continuing if any of these occur:

- target database cannot be proven to be live;
- pending migration or missing migration-file ledger entry;
- Store has multiple Cloud assignments;
- shared number has zero or multiple default inbound Stores;
- current policy points to a different Organization/account than its assignment;
- outbox sender/account snapshot is missing;
- a disabled or unentitled Store queues a message;
- duplicate ordinary request creates another message;
- resend has no durable audit row;
- Admin, Store Workspace, and POS sessions cross scope or authentication;
- any secret or private provider payload appears in logs or client state.

## Required verification report

Return a table with one row per gate:

```text
Gate | Result (PASS/FAIL/UNVERIFIED) | Evidence | Safe blocker or follow-up
```

Also return:

- release commit;
- database/migration identity and pending count;
- before/after inventory counts;
- controlled test IDs only (UUIDs are acceptable; do not include full phones);
- outbox/message IDs for controlled tests;
- resend audit ID if a resend was tested;
- exact failing endpoint/query/error category without secrets;
- whether any production mutation was performed.

Do not report “live verified” unless all mandatory gates pass. Browser,
provider, and physical-device checks may be reported as `UNVERIFIED` when the
required environment is unavailable.
