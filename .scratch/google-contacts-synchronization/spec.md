# Google Contacts Synchronization

Status: ready-for-agent

## Problem Statement

Ganatri Organizations record Customer names and phone numbers during administration and billing, but staff must manually recreate or correct those contacts in their Google account before they can call, message, or find a Customer outside Ganatri. That creates duplicated work and leaves the Google contact book inconsistent with the Customer data the Organization uses in Ganatri.

The Organization needs a simple opt-in way to make Ganatri the source of truth for the synchronized Customer name and phone number while preserving the client's Google Contacts data. Customer and billing work must remain available even when Google is slow, unavailable, or needs reconnection.

## Solution

Add optional Google Contacts Synchronization to Ganatri Admin. An authenticated Ganatri Admin user connects one Google account for an Organization through Google OAuth, then runs one initial catch-up sync. Afterwards, Customer creates and relevant Customer updates schedule asynchronous background synchronization automatically.

The feature exports only an eligible Customer's name and phone number. It finds a Google Contact by an exact normalized phone-number match: one match is updated from Ganatri, no match creates a Contact, and multiple matches become a visible conflict. Ganatri updates only the Contact name and matching phone-number entry, preserving other Google data and extra phone numbers. It never imports Google contacts into Ganatri and never deletes Google Contacts.

The integration has a dedicated persistent Google Contacts Sync Outbox and worker, separate from WhatsApp delivery. Ganatri writes always complete independently of Google; retryable sync work proceeds in the background and the client sees a compact connection/sync-status card in Ganatri Admin.

## User Stories

1. As an authenticated Ganatri Admin user, I want to see Google Contacts Synchronization in Organization settings, so that I can manage it without using Ganatri POS or developer tools.
2. As an authenticated Ganatri Admin user, I want to connect one Google account through a familiar Google consent screen, so that I do not need to enter API keys or share my password with Ganatri.
3. As an authenticated Ganatri Admin user, I want the settings card to identify the connected Google account, so that I know where Customer contacts will be synchronized.
4. As an authenticated Ganatri Admin user, I want to run an initial sync of existing eligible Customers after connecting, so that Ganatri Customers created before setup appear in Google Contacts.
5. As an authenticated Ganatri Admin user, I want newly created Customers with a phone number to synchronize automatically after initial setup, so that I do not repeatedly run a manual export.
6. As an authenticated Ganatri Admin user, I want Customer name and phone edits to synchronize automatically, so that the synced Google Contact follows the latest Ganatri data.
7. As an Organization user creating a Customer during billing, I want the Customer save to complete even if Google is unavailable, so that contact synchronization never delays checkout or Customer management.
8. As an authenticated Ganatri Admin user, I want a Customer without a phone number skipped by synchronization, so that Ganatri does not create a contact that cannot be used to call or message that Customer.
9. As an authenticated Ganatri Admin user, I want removing a Customer phone number to stop future synchronization while leaving the existing Google Contact unchanged, so that Ganatri never removes Google data.
10. As an authenticated Ganatri Admin user, I want Ganatri to create a Google Contact when no existing Contact has the Customer's exact normalized phone number, so that every eligible Customer is represented.
11. As an authenticated Ganatri Admin user, I want Ganatri to update `Dev` to `Dev Jariwala` when exactly one Google Contact has the same phone number as the Ganatri Customer, so that Google uses the complete Customer name recorded in Ganatri.
12. As an authenticated Ganatri Admin user, I want exact phone-number matching rather than name matching, so that two people with similar names cannot be confused.
13. As an authenticated Ganatri Admin user, I want Ganatri to update only the matched phone-number entry when a Google Contact has other phone numbers, so that staff-maintained numbers remain intact.
14. As an authenticated Ganatri Admin user, I want Ganatri to preserve an updated Contact's Google email addresses, address, photo, labels, notes, and other unrelated fields, so that synchronization does not destroy the client's contact data.
15. As an authenticated Ganatri Admin user, I want a Customer phone-number change to update the already linked Google Contact, so that the same Contact remains current instead of producing duplicates.
16. As an authenticated Ganatri Admin user, I want a phone-number collision or more than one exact Google match reported as a conflict with no automatic Contact change, so that Ganatri never modifies an ambiguous Contact.
17. As an authenticated Ganatri Admin user, I want a Contact manually deleted in Google while the connection remains active to be recreated from Ganatri on its next eligible synchronization, so that Ganatri remains authoritative for the exported data.
18. As an authenticated Ganatri Admin user, I want Google-side name or synchronized-number edits overwritten by the next Ganatri synchronization, so that Google Contacts cannot silently become a second Customer source of truth.
19. As an authenticated Ganatri Admin user, I want the sync card to show the last successful synchronization and a compact summary of pending work, errors, and conflicts, so that I can tell whether the connection is healthy without managing jobs one by one.
19a. As an authenticated Ganatri Admin user, I want to set a Google Contact Name Affix (prefix and/or postfix) for this Organization, so that synchronized Google Contacts are easy to distinguish from personal Contacts.
19b. As an authenticated Ganatri Admin user, I want saving a Google Contact Name Affix to update already synchronized Contacts in the background, so that existing Google Contacts pick up the new label without a Customer edit.
20. As an authenticated Ganatri Admin user, I want a clear reconnect action when Google authorization expires or is revoked, so that I can restore synchronization without support assistance.
21. As an authenticated Ganatri Admin user, I want to disconnect Google Contacts, so that future synchronization stops immediately and Ganatri no longer holds usable authorization for that account.
22. As an authenticated Ganatri Admin user, I want disconnecting to leave all existing Google Contacts untouched, so that stopping the integration is never destructive.
23. As an authenticated Ganatri Admin user, I want to replace the connected Google account, so that a business can move to a new shared account or staff owner.
24. As an authenticated Ganatri Admin user, I want replacing the connection to leave the old account untouched and run an initial catch-up sync into the replacement account, so that the handover is understandable and non-destructive.
25. As an Organization with several Stores, I want one connection and one contact destination for the Organization's Customers, so that staff do not need to manage different Gmail accounts or duplicate sync settings by Store.
26. As a Ganatri POS user, I must not be able to connect, disconnect, or change Google Contacts settings, so that a Store Device cannot grant access to the Organization's contact book.
27. As an authenticated Ganatri Admin user, I want retryable Google failures retried in the background, so that temporary Google/network problems do not require manual intervention.
28. As an authenticated Ganatri Admin user, I want permanent failures and conflicts clearly distinguished from retryable failures, so that I know when reconnection or contact cleanup is required.
29. As an Organization, I want Google authorization tokens protected and never shown in Ganatri Admin, Ganatri POS, or API responses, so that the connection cannot be reused by an unauthorized person.
30. As a Ganatri operator, I want Google synchronization failures isolated from WhatsApp delivery and core billing, so that one external integration cannot disrupt another.

## Implementation Decisions

- Google Contacts Synchronization is optional and Organization-scoped. An Organization has at most one active Google Contacts Connection; it is not Store-scoped and v1 exposes no multiple-account configuration.
- Only authenticated Ganatri Admin users with access to the Organization may read sync status or initiate connection, initial synchronization, reconnection, disconnection, or replacement. Ganatri POS and its Store Device routes have no Google Contacts management capability.
- Use Google OAuth 2.0 authorization-code flow on the server, requesting only the Contacts write scope required for the feature and offline access. Validate OAuth state, bind the callback to the initiating Organization/user, store refresh credentials encrypted at rest, and never return refresh/access tokens in a DTO, log, or browser response.
- Maintain one Organization-level connection record with account identity safe for display, encrypted credential reference/version, connection state, and status timestamps. Revoked or invalid credentials move the connection to a reconnect-required state and prevent futile delivery attempts until reauthorized.
- The client settings experience is one compact Google Contacts Sync Status card in Ganatri Admin: connect/reconnect/disconnect, initial catch-up sync, connected account identity, last successful sync, Google Contact Name Affix, and compact pending/error/conflict counts. V1 has no per-Customer switches, client-visible job queue, sync schedule editor, or POS controls.
- A Google Contact Name Affix is Organization-scoped optional prefix and/or postfix text. Ganatri applies it only when writing the Google Contact display name, joining non-empty prefix, Customer name, and postfix with single spaces (for example Customer `Dev Jariwala` with postfix `@ph` becomes `Dev Jariwala @ph`). The Customer name stored in Ganatri never receives the affix. Empty prefix and postfix preserve the current name-only behavior.
- Saving a changed Google Contact Name Affix persists it on the Google Contacts Connection and, when the connection is active, schedules background name refreshes for already synchronized eligible Customers. Unchanged values are saved without extra sync work. Disconnecting discards the affix with the connection; replacing the Google account keeps it.
- An eligible Customer is a Customer with a valid normalized phone number. The synchronization payload contains only the Customer name and phone number. A Customer without a phone number schedules no work and leaves any previously synchronized Google Contact unchanged.
- The initial catch-up action schedules all currently eligible Organization Customers. Once the connection is active, Customer creates and changes to name or phone schedule synchronization asynchronously from both Ganatri Admin and device-originated Customer write paths.
- Customer persistence and scheduling must be transactionally reliable: an eligible Customer change produces durable Google Contacts Sync Outbox work as part of the Customer write outcome, without calling Google during the request. Deduplicate/coalesce outstanding work per connection and Customer so an older queued snapshot cannot overwrite a newer Customer edit.
- Build a dedicated Google Contacts Sync Outbox, dispatcher, worker identity/configuration, internal worker API, retry policy, lease/recovery behavior, and operational metrics. It is intentionally separate from the WhatsApp outbox and WhatsApp worker, although it may follow the repository's established persistent-outbox operational pattern.
- The Google worker loads the current Customer and Connection state when processing a job. It skips obsolete work when the connection was disconnected/replaced, the Customer is no longer eligible, or a newer Customer state supersedes the job.
- Persist a per-connection Customer-to-Google-Contact linkage containing the Google resource identity and enough state to update the same Contact after later Customer name or phone changes. A new connection starts with fresh linkages; the old account is never changed after replacement.
- For a Customer without a linkage, search the connected account's personal Contacts and perform exact comparison of normalized phone values after Google search returns candidates. Google search results alone are not sufficient because Google search is prefix-based.
- Zero exact matches create a Google Contact. Exactly one exact match records the linkage and updates the Google Contact name and its matching phone-number entry from Ganatri. Multiple exact matches become a visible conflict; no Google Contact is modified and the sync is not retried until relevant data or connection state changes.
- For a linked Contact, Ganatri updates the name and only the linked/matching phone-number entry. It must preserve every other field, including extra Google phone numbers, email addresses, addresses, photos, labels, notes, and other personal data. Google contact updates must use the current contact source metadata/etag and handle a concurrent Google edit by reloading and merging the permitted fields before a bounded retry.
- Ganatri is the source of truth only for synchronized fields. Google name and linked-phone edits are repaired on the next Customer synchronization. Google data is never imported into or used to rename a Ganatri Customer.
- A linked Contact missing from Google is recreated on the next eligible synchronization and its linkage is updated. A Customer phone collision with another Google Contact is a conflict and must not update either Contact.
- Ganatri never calls Google Contact deletion. Disconnecting, replacing a connection, removal of Customer data, Customer ineligibility, conflict, and worker failure all leave existing Google Contacts intact.
- Retries use bounded exponential backoff for network, rate-limit, and other transient Google failures. OAuth invalidation/revocation becomes reconnect-required; matching ambiguity and data-policy errors become visible non-retryable errors. Every outcome updates the Organization-level sync status without exposing protected credentials or raw private Google data.
- Add typed shared contracts and client services for connection status, OAuth initiation/callback completion, initial catch-up scheduling, reconnect/disconnect/replacement, and user-safe sync summary. Keep backend access behind Organization-authorized routes and the established response envelope/validation conventions.
- Google OAuth application configuration, verified redirect URIs, a privacy policy, terms/support details, and Google OAuth scope verification are deployment prerequisites. Production rollout must not rely on an unverified development OAuth client.

## Testing Decisions

- Test externally observable behavior: persisted connection/sync state, Customer write responses, scheduled work, worker outcomes, Google API requests, visible status, and authorization. Do not test SQL formatting, private helper calls, component internals, or implementation-specific queue mechanics.
- Use the existing customer service/route boundary as the primary write seam. Add focused behavior tests for Customer creation and updates through both Ganatri Admin and Store Device flows, asserting that the Customer write succeeds while eligible work is durably scheduled and Google is not called inline.
- Use the dedicated Google Contacts worker boundary as the primary integration seam. Inject a Google People API client and controlled clock/retry dependencies to test create, exact match/update, additional-number preservation, no-match creation, missing-linked-contact recreation, rate limiting, transient failure, permanent failure, lease recovery, and idempotent retry behavior.
- Add persistence/repository tests for one active connection per Organization, encrypted credential references rather than raw tokens, per-Customer linkage ownership, queue coalescing, stale-work suppression, connection replacement isolation, conflict persistence, and durable enqueue-with-Customer-write behavior.
- Add authorization and HTTP contract tests proving that only authenticated Ganatri Admin users for the Organization can manage or inspect the integration; unauthenticated users, other Organizations, Ganatri POS/Store Device credentials, and platform credentials are denied. Assert no route serializes access tokens, refresh tokens, or credential material.
- Add OAuth tests for state validation, callback binding, rejected/failed consent, successful connection, reconnect, disconnect, authorization revocation, and replacement. Verify disconnect/replacement invalidates local usable credentials and does not request Google Contact deletion.
- Add matching behavior tests for the example phone/name mismatch (`Dev` versus `Dev Jariwala`), exact normalized phone equality, name non-matches, zero/one/multiple exact candidates, Contacts with multiple phone numbers, and a Customer phone change that collides with another Contact.
- Add no-deletion regression tests for disconnect, connection replacement, Customer phone removal, ineligibility, conflicts, worker errors, and any Customer lifecycle path that exists in the billing module. Assert no Google delete operation is issued in every case.
- Add Ganatri Admin behavior tests for the compact status card: disconnected, connecting, connected, initial-sync pending, healthy, retrying, reconnect-required, conflict, and error states; connect/reconnect/disconnect/replacement actions; and the absence of per-Customer controls or Google settings in Ganatri POS.
- Reuse the repository's existing customer route/service tests, organization authorization patterns, and durable WhatsApp Cloud outbox/dispatcher tests as prior art for observable contracts, leases, retry/recovery, and worker isolation. The Google Contacts tests must target the new dedicated worker and not instantiate the WhatsApp worker as the system under test.

## Out of Scope

- Multiple Google accounts per Organization, per-Store connections, per-user connections, shared contact routing, or account-selection rules.
- Importing Google Contacts into Ganatri, using Google data to create/update/rename Customers, bidirectional synchronization, or conflict resolution by Google data winning.
- Synchronizing email addresses, addresses, photos, labels, notes, customer ledger/billing data, marketing status, or any Customer field other than name and phone number.
- Per-Customer opt-in/out controls, per-Customer manual sync buttons, user-visible outbox management, custom schedules, and bulk conflict-resolution UI.
- Deleting Google Contacts or removing unrelated Google Contact fields under any circumstance.
- Sync controls, OAuth setup, status, or Google credentials in Ganatri POS.
- Reusing, extending, or coupling to the WhatsApp outbox or WhatsApp worker.
- Contact sharing, Google Workspace domain administration, Google group management, Gmail email operations, or any feature beyond personal Google Contacts.
- Changing the existing Customer/billing lifecycle, Customer Ledger semantics, WhatsApp consent behavior, or Customer marketing behavior.

## Further Notes

- This specification uses the canonical terms Google Contacts Synchronization, Google Contacts Connection, Google Contacts Sync Status, Google Contact Name Affix, Google Contacts Sync Outbox, and Google Contact Match from `CONTEXT.md`.
- The architectural boundaries are recorded in ADR 0011 (Ganatri authority over synchronized fields), ADR 0012 (one connection per Organization), ADR 0013 (asynchronous synchronization), and ADR 0014 (dedicated Google sync outbox).
- Google People API contact create/update/search behavior requires the Google Contacts OAuth scope. Search uses prefix matching, so the implementation must perform exact normalized-phone validation before mutating a Contact. Google updates require current contact metadata/etag and should merge Ganatri-owned fields with the latest Google Contact data.
- The primary client-facing complexity is intentionally low: Google consent once, initial sync once, then status/reconnect only. The operational complexity belongs on Ganatri's dedicated background worker and is deliberately specified rather than hidden.
