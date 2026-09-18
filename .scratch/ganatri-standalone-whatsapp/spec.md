# Ganatri WhatsApp — Admin and Store Console

Status: updated and approved; Phase 0 and Phase 1 complete with documented follow-ups

## Problem

WhatsApp capability is currently spread across Ganatri Admin, Ganatri POS, and
the backend. The current code supports Organization-owned Meta Cloud accounts,
Store assignment, Cloud template revisions, customer consent, promotions,
invoice/due delivery, conversations, webhooks, and durable outbox processing.
It does not yet provide one consistent WhatsApp feature across Admin and Store
Console or a clear policy for using either a Ganatri-managed sender or an
Organization-owned sender.

The integrated feature must let an Organization choose how each Store uses
WhatsApp without exposing credentials, bypassing Meta approval, mixing Stores,
or allowing a restricted utility-only sender to perform marketing work.

## Goal

Extend the existing user-authenticated Ganatri Admin and Store Console
applications with an integrated WhatsApp feature that provides explicit
Store-level WhatsApp policy selection:

1. `disabled` — the Store does not use WhatsApp through Ganatri.
2. `ganatri_utility` — use Ganatri's server-configured sender for bill and due
   reminder messages only, using fixed templates configured by environment.
3. `organization_cloud` — use a Cloud account connected by the Organization
   through Meta Embedded Signup, subject to permissions and approved templates.

The Admin workspace and Store Console panel reuse the existing backend
delivery, webhook, consent, template, and outbox boundaries. They do not create
a second WhatsApp delivery engine.

## Approved decisions

- Ganatri-managed and Organization-owned WhatsApp messages use the same
  durable outbox and delivery pipeline.
- The outbox records the selected sender reference in the immutable message
  snapshot, so queued work is never silently rerouted when a Store changes its
  WhatsApp policy.
- In v1, an Organization may connect multiple WhatsApp numbers, a number may
  serve multiple Stores, and each Store has only one linked Organization
  number at a time.
- Replies received by the Ganatri-managed utility sender are retained
  internally for provider/audit handling but are not shown to Organization
  users in the Admin or Store Console WhatsApp surfaces.
- Ganatri-managed utility replies receive no automatic response. The utility
  sender is strictly limited to bill and due-reminder delivery templates.
- Both Ganatri Utility and Organization Cloud modes require the existing
  WhatsApp Store Entitlement. Separate sender pricing and usage billing are
  deferred, while sender source and message usage remain available for future
  commercial rules.
- The WhatsApp Store Entitlement represents Ganatri software capability in both
  sender modes. Organization-owned senders may incur Meta costs paid by the
  Organization, while Ganatri sender usage pricing is deferred.
- Until Organization membership roles exist, the Organization creator is the
  WhatsApp administrator. That user alone may manage connections, Store
  assignments, templates, promotions, consent, and delivery operations.
  Platform sender management remains a Platform Administrator responsibility.
- Organization Cloud templates belong to the Organization's WABA and are
  created/submitted once. Store bindings and defaults remain separate per
  Store, sender, message kind, and language. Ganatri Utility never uses these
  Organization templates.
- Organization Cloud templates use an explicit draft, Meta submission,
  approval, and Store publishing lifecycle. Meta approval never automatically
  replaces the current Store default. Ganatri Utility templates remain fixed
  and environment-controlled.
- The existing Ganatri WhatsApp number is reused for platform OTP, invitations,
  bills, and due reminders. Store messages use only separately configured,
  backend-validated bill and due template names; Organization users cannot
  modify the platform sender or its templates.
- Store WhatsApp policy and sender assignment are stored in a separate,
  history-aware configuration record with one active configuration per Store.
  Policy changes do not mutate historical messages or reroute queued work.
- Existing Stores with an Organization Cloud assignment migrate to
  `organization_cloud`; all other existing Stores and every new Store start as
  `disabled`. Ganatri Utility is never enabled implicitly.
- `disabled`, `ganatri_utility`, and `organization_cloud` have distinct
  capabilities: Ganatri Utility is limited to fixed bill/due delivery, while
  Organization Cloud may use inbox, replies, approved templates, promotions,
  consent, and delivery management under the approved controls.
- The initial integrated release includes existing user authentication,
  Organization/Store context, all three sender modes, Embedded Signup, Store
  linking, the full Organization Cloud template lifecycle, bill/due delivery,
  consent, delivery status, and retry. Inbox, free-form replies, promotions,
  campaigns, and advanced operations follow in later releases.
- Existing Admin WhatsApp routes remain the primary Organization management
  workspace, and the Store Console receives a Store-scoped WhatsApp panel.
  POS `/whatsapp` does not cross authentication boundaries and redirects to POS
  home while POS keeps bill/due actions and status visibility.

## Existing code baseline

- Admin routes and the current Organization WhatsApp workspace are in
  `apps/admin/src/App.tsx` and
  `apps/admin/src/pages/whatsapp-organization-page.tsx`.
- The existing Admin UI has Accounts, Templates, Promotions, and Message
  history tabs, plus Store selection.
- Embedded Signup starts in the browser, while the backend validates the
  onboarding state, exchanges the authorization result, validates the WABA and
  phone, stores an encrypted credential binding, and subscribes the WABA to
  webhooks.
- Tenant WhatsApp routes are mounted under `/organizations` and protected by
  `authMiddleware` in
  `apps/backend/src/modules/tenant/whatsapp/whatsapp.routes.ts`.
- Device-scoped POS WhatsApp routes remain under `/pos`; they must not be
  reused as the Admin or Store Console user-authentication model.
- `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN` currently support platform OTP
  and invitation notifications in
  `apps/backend/src/services/notifications/whatsapp.service.ts`.
- Cloud send admission already checks active binding, Meta approval, category,
  consent, suppression, variables, and the free-form customer-service window
  in `cloud-api/cloud-template-admission.ts`.
- Template revisions, language/account-scoped defaults, archive state, and
  audit events are represented by the Cloud template migrations.
- Current organization access checks verify authenticated Organization access;
  dedicated WhatsApp role/capability checks are not yet present.

## Product boundary

### Ganatri-managed utility sender

This is a platform-owned sender, not an Organization-owned WhatsApp account.
Its credentials stay backend-only. Its bill and due templates are selected by
environment configuration, for example:

```env
WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME=ganatri_bill
WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME=ganatri_due
WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE=en_US
```

The names select templates; the backend must still verify that each template
exists on the configured WABA, is enabled and approved, is `UTILITY`, has the
expected language and variables, and is usable at send time.

The utility sender must reject:

- Marketing and promotion messages.
- Free-form conversation messages.
- User-selected or user-created templates.
- Template edits, deletions, or Meta submissions.
- Token, WABA, phone-number, or provider configuration changes by an
  Organization user.

Bill and due sends still require the normal Store entitlement, valid customer
phone, utility consent/suppression checks, idempotency, and immutable delivery
snapshots.

Replies received by a Ganatri utility sender must not be silently discarded.
The initial product decision is whether to show them in a platform-owned
inbox or send a clear automatic response that the number supports billing
notifications only.

### Organization-owned Cloud sender

An Organization connects one or more Meta Cloud phone numbers through Embedded
Signup. The backend owns the credential exchange and encrypted storage. The
Organization can then assign a sender to a Store and manage only the resources
that belong to that Organization.

The Organization-owned path may support:

- Bill and due templates.
- Customer conversations and replies.
- Approved marketing templates and promotions.
- Store-specific template bindings.
- Consent and suppression management.
- Outbox retry and operational visibility.

No message should silently fall back from an Organization-owned sender to the
Ganatri sender. The Store's selected policy is explicit.

## Store linking contract

The recommended v1 rule is one active WhatsApp sender per Store. A Store has
one active policy and, when the policy is `organization_cloud`, one active
Organization-owned sender assignment.

Linking must verify:

- The caller can manage WhatsApp connections for the Organization.
- The sender belongs to the same Organization, unless it is the special
  Ganatri platform sender.
- The Cloud account is connected and its phone is registered.
- The Store has the WhatsApp Feature Entitlement.
- The Store does not already have a conflicting active assignment.
- The selected sender is not revoked, suspended, or failed.

Unlinking or switching policy must retain conversations, messages, delivery
events, audit history, and already queued immutable snapshots. Pending work
must finish under its original sender/policy or fail clearly; it must never be
rerouted to a different sender.

An Organization-owned phone may be linked to multiple Stores. Each shared phone
has one default inbound Store and the approved routing precedence is used for
new inbound messages. A Store itself may have only one linked Organization
number and must explicitly replace it before using another.

## Authorization model

The backend must enforce capabilities independently of whether a button is
visible in the UI. Recommended capabilities are:

| Capability | Responsibility |
| --- | --- |
| `whatsapp.view` | View accounts, templates, campaigns, conversations, and delivery state |
| `whatsapp.connection.manage` | Connect, refresh, revoke, link, unlink, or switch senders |
| `whatsapp.templates.create` | Create a draft or submit a template revision to Meta |
| `whatsapp.templates.publish` | Bind, publish, archive, or roll back a Store default |
| `whatsapp.inbox.reply` | Send replies inside an allowed customer-service window |
| `whatsapp.promotions.send` | Create and send marketing campaigns |
| `whatsapp.consent.manage` | Record consent and suppression changes |
| `whatsapp.outbox.manage` | Retry, dead-letter, reconcile, or stop delivery work |
| `whatsapp.platform.manage` | Manage Ganatri's platform sender and fixed templates |

Suggested role defaults are only recommendations and require approval:

- Viewer: `view`.
- Operator: `view`, `inbox.reply`, and operational bill/due actions.
- Manager: Operator capabilities plus template draft/submission and campaigns.
- Organization administrator: all Organization capabilities except platform
  management.
- Platform Administrator: platform sender and cross-Organization operational
  controls through Ganatri Console, without exposing credentials.

## Template lifecycle and restrictions

### Platform templates

- Names, languages, kinds, and variable mapping are environment/code-owned.
- Only bill and due-reminder templates are configured for tenant utility sends.
- Admin and Store Console expose status and configuration health according to
  scope; platform templates remain read-only and are not tenant template CRUD.
- Missing or invalid configuration fails closed with an actionable error.

### Organization templates

- A user may create a draft only with `whatsapp.templates.create`.
- Submission to Meta requires the same capability and must be audited.
- `bill` and `due_reminder` force the `UTILITY` category.
- `promotion` forces the `MARKETING` category.
- Authentication templates are reserved for Ganatri platform authentication.
- Component types, variable names, samples, URLs, media, language, and
  message kind are validated before submission.
- A template is sendable only when Meta reports it approved and enabled, the
  Store binding is active, the category matches, the variables are complete,
  and consent permits the message.
- Publishing is an explicit action; approval must not automatically replace a
  current Store default.
- Defaults are unique per Store, sender/WABA, message kind, and language.
- Historical submissions and bindings are archived or rolled back, not
  hard-deleted.
- Creation and submission need idempotency keys, bounded rate limits, and
  audit events.

## Message policy

The backend should resolve a Store policy before every send:

```text
Store policy
  -> sender ownership and identity
  -> permitted message kind
  -> permitted template source
  -> Store entitlement
  -> customer phone and consent
  -> Meta/provider status
  -> idempotent outbox snapshot
```

For `ganatri_utility`:

| Message | Result |
| --- | --- |
| Bill | Send only the environment-selected bill template |
| Due reminder | Send only the environment-selected due template |
| Promotion | Reject |
| Free-form reply | Reject |
| Custom template | Reject |
| Template submission | Reject |

For `organization_cloud`, the existing Cloud admission rules remain the final
server-side authority. Marketing requires marketing opt-in and no suppression;
utility requires utility consent and no suppression; free-form messaging is
allowed only within the provider's open customer-service window.

## Application experience

The integrated WhatsApp feature should provide focused Organization and Store
experiences inside the existing applications:

1. Login and session bootstrap using the existing user-authenticated model.
2. Organization and Store picker with the selected Store always visible.
3. WhatsApp mode card: Disabled, Ganatri utility, or Own WhatsApp.
4. Connection setup for Embedded Signup, account health, and phone status.
5. Store sender assignment and safe switch/unlink flow.
6. Templates with clear Draft, Pending, Approved, Rejected, Paused, Disabled,
   Archived, and Default states.
7. Message history/inbox according to the selected sender policy.
8. Bill/due delivery status and safe retry controls.
9. Promotions only for Organization-owned senders and authorized users.
10. Consent and suppression history.
11. Delivery safety, quota, outbox, and webhook health for authorized users.

Admin owns Organization-wide connection, number, template, routing, and
delivery management. Store Console shows only the selected Store's linked
number, policy, entitlement, template readiness, customer relationships, and
delivery state. Backend capabilities remain authoritative for both surfaces.

The UI should explain why an action is unavailable, but backend authorization
must remain authoritative.

## UI alignment contract

The WhatsApp feature must feel native to the existing Ganatri workspaces, not a
separate product with a new visual language. Its visual source of truth is the
current Ganatri Admin and Store Console UI plus the shared `packages/ui`
primitives.

### Shared visual language

- Use the existing semantic CSS variables from `@repo/ui`: `background`,
  `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, `input`,
  and `ring`.
- Use the existing web typography: DM Sans for body/interface text and Plus
  Jakarta Sans through the `font-display` utility for prominent headings.
- Use the existing Ganatri blue primary and semantic green/amber/red status
  treatments. WhatsApp green is an accent for identity/status, not a second
  global theme.
- Reuse `@repo/ui` Button, Card, Badge, Input, Select, Tabs, Dialog, Sheet,
  Spinner, Skeleton, Empty, Tooltip, and toast primitives before adding a new
  component.
- Preserve the existing border, radius, spacing, shadow, backdrop, and focus
  ring patterns. Avoid one-off raw colors or a parallel design-token system.
- Support the existing light/dark theme behavior through the web app's theme
  provider and semantic tokens.

### Workspace shell

- Use the existing Admin shell for Organization-wide WhatsApp management and
  the existing Store Console shell for Store-scoped WhatsApp management.
- Keep Admin navigation focused on WhatsApp pages such as Overview, Numbers,
  Stores, Templates, Delivery, and Settings as phases make them available.
- Add only a Store-scoped WhatsApp entry to Store Console; do not copy the
  Organization-wide number or template workspace into it.
- Do not expose unrelated Catalog, Billing, Finance, POS, or Console
  destinations through the WhatsApp feature.
- Keep the current Organization and Store context visible in each existing
  shell so a shared number is never shown without scope.

### Page and component patterns

- Use the Admin page rhythm: page title, short description, primary action,
  responsive content width, and grouped cards/sections.
- Sender cards show phone identity, WABA/provider health, linked Stores,
  default inbound Store, active outbound Store assignments, and safe actions.
- Store cards show the selected mode, linked number, entitlement state,
  template readiness, customer association summary, and the next action.
- Use explicit badges for Connected, Needs attention, Disabled, Pending,
  Approved, Rejected, Default, and Ambiguous routing.
- Use dashed muted cards for empty states, amber cards for actionable warnings,
  destructive cards for blocked/error states, and skeletons for initial loads.
- Use dialogs/sheets for connect, link, replace, publish, archive, rollback,
  and destructive confirmation actions. Preserve the existing rounded and
  responsive dialog geometry.
- Keep success/error feedback in the shared toast pattern; do not introduce a
  second toast library or inline alert style for normal mutations.
- Admin customer details show `Created in Store`, lifetime `Active in Stores`,
  `lastActivityAt`, activity provenance, WhatsApp number, routed Store, and
  routing reason using existing detail/card patterns. Store Console shows only
  the current Store's relationship and safe scoped routing state.

### Responsive and accessibility contract

- Verify at desktop widths, tablet widths, and narrow phone widths; no page may
  require horizontal scrolling for ordinary Store/number management.
- Preserve keyboard focus rings, visible labels, semantic headings, button
  names, dialog focus trapping, and status announcements.
- Provide loading, empty, permission-denied, entitlement-denied, unhealthy
  sender, missing-template, and network-error states for every data surface.
- Keep touch targets and mobile bottom navigation clear of safe-area insets.
- Respect reduced-motion preferences and avoid animation as the only status
  indicator.

### Visual verification

Each UI subphase must check:

- Light and dark themes.
- Desktop and narrow mobile layouts.
- Loading, empty, success, warning, error, and permission-denied states.
- Keyboard/focus behavior and screen-reader labels.
- Store/number context visibility in shared-number scenarios.
- Consistency with representative Admin pages such as the Dashboard shell,
  Store settings, WhatsApp workspace, and commercial status cards.

## Edge-case catalogue

### Connection and configuration

- Embedded Signup is cancelled, returns incomplete data, or sends a duplicate
  callback: keep an idempotent provisioning attempt and do not create a second
  account.
- WABA, phone number, or credential belongs to another Organization: reject
  and revoke any temporary credential binding.
- Phone is unregistered, suspended, on the Business App, or revoked: show the
  state and block sends.
- Credential vault is unavailable: do not persist plaintext credentials and
  return a service-unavailable state.
- Token rotation fails: retain the old working credential until replacement
  validation succeeds.
- Environment platform credentials or fixed template names are missing: the
  utility mode is unavailable; existing Organization Cloud modes continue to
  work.
- Meta webhook events are duplicated or arrive out of order: process by
  provider event identity and preserve the latest valid state.

### Store and policy changes

- Store has no WhatsApp entitlement: block linking and sending with the normal
  commercial-access message.
- Store already has a sender: require an explicit switch/unlink action.
- User switches from Organization Cloud to Ganatri utility while messages are
  queued: keep queued messages tied to the old sender or cancel them clearly;
  never reroute them.
- User disables WhatsApp: block new work but retain history and audit records.
- Organization deletes or archives a Store: prevent new sends and preserve
  historical message records according to existing Store retention rules.
- One sender is linked to multiple Stores: preserve the assignments, verify the
  default inbound Store, and label any fallback or ambiguous routing.

### Templates and sending

- Environment template is missing, pending, rejected, paused, disabled, or
  has changed variables: fail closed and identify the exact template health
  problem.
- Approved Organization template is no longer approved: fail the selected
  revision; do not silently choose another revision.
- Template language does not match the customer's supported language: use a
  configured fallback only if explicitly approved; otherwise block clearly.
- Required template parameters are missing or malformed: reject before queue.
- Customer has opted out, is suppressed, has no valid phone, or is outside the
  Store scope: do not queue.
- Duplicate bill/due action is retried: idempotency must prevent duplicate
  customer messages while allowing a deliberate resend action.
- Provider rate limit or quota is reached: keep bounded retry state and show
  operational status; do not create unbounded jobs.
- A bill is voided or changed after queueing: preserve the sent snapshot and
  provide a deliberate resend/correction workflow instead of mutating history.

### Inbound and operations

- A customer replies to the Ganatri utility sender: use the approved platform
  inbox or automatic response policy; never drop it silently.
- A conversation is not linked to a Customer: allow exact-phone matching and
  explicit attachment without crossing Organization or Store boundaries.
- Attachment URL expires or storage is unavailable: show a safe unavailable
  state without leaking storage credentials.
- Webhook delivery is delayed: show last-known state and reconcile through the
  existing provider-event/outbox mechanisms.
- Retry, dead-letter, stop-campaign, and reconciliation actions must be
  permission-protected, idempotent, audited, and scoped to the Organization.
- Logs must not contain access tokens, QR values, OTPs, full customer phones,
  message bodies, PDFs, or credential material.

## Phased delivery plan

Every phase follows:

```text
phase plan -> smallest implementation -> focused verification
-> standards/spec review -> fix findings -> user approval -> commit
```

### Phase 0 — Baseline and decisions

- Confirm the current mainline route, auth, Cloud account, Store assignment,
  template, consent, webhook, and outbox seams.
- Resolve the current Admin/POS message-history route inconsistency.
- Confirm the integrated Admin management workspace and Store Console scoped
  panel boundaries.
- Approve the three Store modes, one-sender-per-Store recommendation, reply
  handling for the Ganatri sender, and role/capability policy.

Gate: decisions recorded; no implementation begins with an ambiguous sender or
authorization model.

### Phase 1 — Integrated Admin and Store Console foundation

- Reuse existing Admin and Store Console app shells, package boundaries, user
  authentication, session bootstrap, error handling, and API clients.
- Add the Admin WhatsApp workspace and Store Console WhatsApp panel with
  explicit Organization/Store scoping and no provider mutations yet.

Gate: unauthenticated users cannot reach protected routes; user sessions and
Organization scope survive refresh; app checks pass.

### Phase 2 — WhatsApp policy and platform utility sender

- Introduce the Store policy and platform-sender configuration boundary.
- Validate environment template configuration without exposing credentials.
- Add utility-only UI and backend admission for bill/due messages.
- Explicitly reject marketing, free-form, and custom-template operations.

Gate: matrix tests prove the platform sender cannot send anything except the
configured bill/due templates.

### Phase 3 — Organization Cloud connection

- Reuse Embedded Signup from the Admin WhatsApp workspace.
- Preserve signed state, replay protection, resumable provisioning, encrypted
  credential storage, WABA/phone validation, and webhook subscription.
- Add refresh, revoke, phone-registration, and token-rotation health states.

Gate: duplicate, cancelled, invalid-identity, revoked, and vault-failure
tests pass without credential leakage.

### Phase 4 — Store sender assignment and permissions

- Add Store-level policy selection and explicit switch/unlink confirmation.
- Add capability checks to connection, template, inbox, promotion, consent,
  and outbox routes.
- Enforce same-Organization ownership and the selected sender policy.

Gate: unauthorized users and cross-Organization/Store operations receive
consistent denial responses from the backend, not only hidden UI controls.

### Phase 5 — Template lifecycle

- Expose Organization Cloud template drafts, Meta submissions, status sync,
  approval display, Store binding, default publishing, archive, rollback, and
  audit history.
- Keep platform utility templates read-only and environment-selected.

Gate: template state-machine, category, language, variable, idempotency, and
default-uniqueness tests pass.

### Phase 6 — Bill and due delivery

- Route bill and due actions through the resolved Store policy.
- Add provider health, consent, idempotency, immutable snapshot, retry, and
  deliberate resend behavior to Admin and Store Console surfaces.

Gate: both sender modes work; disabled, entitlement, consent, invalid-template,
  duplicate, and provider-failure cases fail safely.

### Phase 7 — Migration and cutover

- Inventory existing Store assignments, sender references, conversations,
  customer associations, and queued work.
- Migrate each Store to one history-aware policy without rewriting historical
  messages, outbox records, or sender snapshots.
- Cut Admin and Store Console over to the selected policy and retire the POS
  conversation route while preserving POS bill/due status actions.

Gate: migration dry run, idempotent policy cutover, route-boundary checks, and
rollback verification preserve history and never reroute queued work.

### Phase 8 — Organization Cloud inbox and replies

- Add Store-scoped conversations, exact Customer matching/attachment, message
  history, private attachments, service-window state, and reply permissions.
- Exclude the Ganatri utility sender from Organization inboxes and replies.
- Allow free-form Cloud replies only inside the provider's open
  customer-service window and block suppressed Customers.

Gate: replies cannot cross Store or Organization scope; expired windows,
suppressed Customers, disabled Stores, and non-Cloud senders are blocked.

### Phase 9 — Promotions and operations

- Add approved marketing-template selection, campaign creation, recipient
  consent filtering, cooldown, delivery progress, stop, retry, and resend.
- Add quota/outbox/webhook health, audit views, alerts, reconciliation, safe
  redaction, and operational runbook updates.
- Make all promotion routes unavailable for `ganatri_utility` and preserve
  the existing sender/policy boundaries.

Gate: no marketing send can use the platform utility sender or an unapproved
template, regardless of client input; operational controls remain audited and
Store/Organization scoped.

## Acceptance criteria

- A Store can explicitly choose Disabled, Ganatri Utility, or Organization
  Cloud mode.
- Ganatri Utility mode sends only the two server-configured approved utility
  templates: bill and due reminder.
- Ganatri Utility mode cannot create templates, submit templates, send
  promotions, send free-form messages, or expose credentials.
- Organization Cloud mode supports secure Embedded Signup and only uses
  Organization-owned accounts.
- Store linking is explicit, scoped, entitlement-aware, and auditable.
- Template creation, publishing, promotions, replies, consent, and outbox
  operations are capability-protected on the backend.
- Meta approval, category, language, variable mapping, consent, suppression,
  service-window, provider-status, rate-limit, and idempotency rules are
  enforced before queueing.
- Switching or disabling a policy never reroutes queued work or deletes
  history.
- Webhook and outbox processing remain durable and idempotent.
- No secret, OTP, token, full phone number, message body, or PDF is exposed in
  logs or client configuration.

## Non-goals

- Reviving or extending the retired Baileys/linked-device worker.
- Replacing Ganatri POS or changing device-authenticated billing.
- Allowing Organization users to manage Ganatri platform authentication
  templates.
- Making Meta approval optional or bypassing consent/suppression rules.
- Automatically falling back between sender modes.
- Rewriting historical WhatsApp messages, outbox records, or credentials.

## Implementation follow-ups

The product decisions are complete. The implementation may still resolve
technical details without changing the approved behavior:

- Exact database table/constraint names for Store policy history and platform
  sender references.
- The adapter that maps the platform sender into the existing durable outbox.
- Migration scripts for existing assignments and safe rollback behavior.
- Route-by-route cutover sequencing and release operations.

## Recommended first implementation slice

After Phase 0 approval, implement Phase 1 and Phase 2 first: the integrated
Admin/Store Console foundation plus the Ganatri utility-only mode. This
validates the most controlled path—fixed environment templates, no
customer-owned token, no marketing, and no template CRUD—before exposing
Embedded Signup and the
larger Organization-owned feature set.

## Approved decision register

The following decisions were approved during the planning conversation. They
are the product constraints for implementation; technical names may change
without changing their meaning.

| ID | Approved decision | Consequence |
| --- | --- | --- |
| D01 | Ganatri Utility and Organization Cloud use the same durable WhatsApp outbox and delivery pipeline. | Sender choice is a resolver concern; queued work keeps its original sender snapshot. |
| D02 | Each Store has one linked Organization-owned WhatsApp number in v1; an Organization-owned number may be linked to multiple Stores. | A Store has one linked number, while an Organization may reuse a connected number across its Stores. The Ganatri platform phone remains a separate platform-level exception for outbound utility delivery only. |
| D03 | Replies received by the Ganatri sender are stored internally, hidden from Organization users, and receive no automatic response. | Ganatri Utility is outbound bill/due notification only. |
| D04 | Both sender modes require the existing WhatsApp Store Entitlement. | Pricing and usage billing remain deferred, but access is not an entitlement bypass. |
| D05 | Until Organization roles exist, the Organization creator/administrator alone manages WhatsApp. | Connection, templates, Store assignment, promotions, consent, and delivery operations are administrator-only. |
| D06 | Organization Cloud templates belong to the Organization's WABA and are assigned to Stores through bindings/defaults. | One approved WABA template may be reused by eligible Stores; usage remains Store/sender scoped. |
| D07 | Organization Cloud templates use draft → Meta submission → approval → explicit Store publishing. | Approval never silently changes a live Store default. |
| D08 | The existing Ganatri WhatsApp number is reused for platform OTP, invitations, bills, and due reminders. | Platform credentials remain backend-only and Store messages use only fixed environment-selected bill/due templates. |
| D09 | Store WhatsApp policy and sender assignment use a separate history-aware configuration record. | Policy changes are auditable and do not mutate message history or reroute queued work. |
| D10 | Existing Cloud assignments migrate to Organization Cloud; all other existing and new Stores start disabled. | Ganatri Utility is never enabled implicitly. |
| D11 | Ganatri Utility is bill/due-only; Organization Cloud may later use inbox, replies, approved templates, promotions, consent, and delivery controls. | Sender policy controls both UI visibility and backend admission. |
| D12 | Initial integrated release uses existing user authentication, Admin/Store Console context, both sender modes, Embedded Signup, Store linking, the full Organization Cloud template lifecycle, bill/due delivery, consent, delivery status, and retry. | Inbox, free-form replies, promotions, campaigns, and advanced operations are later release slices. |
| D13 | Existing Admin WhatsApp routes remain the Organization management workspace, Store Console receives a Store-scoped WhatsApp panel, and POS `/whatsapp` redirects to POS home without crossing authentication boundaries. | Existing app sessions and safe Store context are preserved; secrets never appear in URLs. |
| D14 | Customer visibility shows both the Store where the Customer was created and all Stores where the Customer is active. | Customer identity remains Organization-owned; Store origin and Store activity are separate facts. |
| D15 | During go-live migration, every existing Customer is assigned to the Organization's first-created Store as its migration origin. New Customers created after go-live record their actual creation Store. | Migration origin is explicitly marked as migrated; future origin is Store-observed. Active Store activity remains separately derived. |
| D16 | After go-live, creating a Customer requires a selected Store. Organization-level creation without Store context is not allowed. | Every new Customer has a reliable Store origin; the Organization-wide Customer identity remains shared. |
| D17 | For a WhatsApp number shared by multiple Stores, inbound routing prefers existing conversation context, latest outbound Store, a single active Store, then the number's default inbound Store; ambiguous/default routing is labeled. | One number can serve multiple Stores without hiding the routing reason from Admin. |
| D18 | A new Customer's creation Store immediately appears in `activeInStores`; later Sales, conversations, or explicit Store activity add other Stores. | Creation establishes an initial Store association without changing Organization-wide Customer identity. |
| D19 | During migration, every legacy Customer uses the first-created Store as its migration origin and initial active Store; historical Sales and WhatsApp activity add other active Stores. | Existing Customers receive a usable baseline association without losing known Store activity. |
| D20 | An Organization may connect multiple WhatsApp numbers, each number may serve multiple Stores, but each Store has one active outbound Organization number at a time. | Multiple numbers are available without ambiguity about which number sends Store messages. |
| D21 | The Organization administrator explicitly selects each Store's active outbound Organization number; unhealthy numbers block new sends and never trigger automatic fallback. | Sender changes are deliberate, auditable, and preserved in queued message snapshots. |
| D22 | Organization Cloud templates are WABA-scoped, while Store defaults are scoped by Store, selected outbound number's WABA, message kind, and language. | A WABA template is reusable, but a Store's selected sender must have a valid matching default. |
| D23 | A shared WhatsApp number has one default inbound Store: the first linked Store initially, administrator-changeable, with oldest remaining promotion on unlink and unassigned internal events when no Store remains. | Shared-number inbound routing remains deterministic and audited. |
| D24 | Customer Store activity includes Store creation, completed Sales, routed WhatsApp conversations, explicit Store attachment, and bill/due delivery; drafts, voids, and failed unscoped attempts do not count. | Store activity reflects meaningful Customer relationships rather than abandoned or failed work. |
| D25 | Admin shows Organization-wide Customer Store relationships, Store Console shows only the selected Store's relationship, and POS shows only the authenticated Store's relationship. | Cross-Store visibility is available to administrators without broadening Store Console or POS scope. |
| D26 | Store-Customer relationships are persisted with provenance and timestamps, unique per Organization, Customer, and Store. Each relationship has a current summary plus append-only activity events with source, occurrence time, and idempotent source reference. | Admin can explain why a Customer is associated with a Store and query both current recency and complete migration/activity history. |
| D27 | An Organization may connect multiple WhatsApp numbers, a number may serve multiple Stores, but each Store has only one linked Organization number. | A Store must replace its current linked number before using another. |
| D28 | Replacing a Store's linked number is an explicit atomic switch. Old history and queued messages retain the old number; new work uses the replacement after the switch. | A Store never has two linked numbers or an implicit fallback during replacement. |
| D29 | Retain the existing connect-then-explicit-link workflow as the baseline. A newly connected number starts unlinked, can be linked to eligible Stores, and is usable only after its Store link and checks pass. | Admin reuses existing account/linking APIs and Store Console consumes only authorized Store-scoped results. |
| D30 | Do not rewrite the existing account connection/linking APIs. Reuse them from Admin and add only focused extensions required by multi-number policy and Customer associations. | Existing Cloud onboarding and account ownership behavior remains stable. |
| D31 | Store-Customer associations and their activity events are append-only. Unlinking or inactivity does not delete the association or its history. | Admin retains complete Store relationship and last-activity evidence. |
| D32 | `activeInStores` is lifetime-based with no automatic expiry. Each association retains `originSource`, `firstSeenAt`, `lastActivityAt`, and `lastActivitySource`; append-only events retain every qualifying activity source and occurrence. | Admin can filter by recency without deleting or hiding historical Store relationships. |

### Decision interpretation requiring explicit implementation handling

D02 and D08 are represented distinctly. D02 governs the Store-side cardinality
of Organization-owned assignments: one linked Organization number per Store,
with one number allowed to serve multiple Stores. D08 makes one Ganatri
platform phone available for platform-owned outbound utility delivery. The
platform phone must not be represented as an Organization-owned Store
assignment.

## Stable domain contracts

These are proposed code-facing contracts. They are deliberately independent of
React components, database column names, and Meta's raw response shape.

### Store policy

```text
StoreWhatsAppMode =
  disabled
  | ganatri_utility
  | organization_cloud
```

The policy resolver returns a complete decision, not only a mode:

```text
ResolvedStoreWhatsAppPolicy {
  organizationId
  storeId
  mode
  entitlement: entitled | denied
  sender: PlatformSenderRef | OrganizationSenderRef | null
  allowedMessageKinds: bill | due_reminder | promotion | text
  allowedFeatures
  policyVersion
}
```

`disabled` returns no sender and rejects all new WhatsApp work. The resolver is
called by every authenticated user send path and every device-scoped POS send
path; UI state is never treated as authorization.

### Sender reference

```text
PlatformSenderRef {
  kind: platform
  key: ganatri
}

OrganizationSenderRef {
  kind: organization
  whatsappAccountId
  whatsappBusinessAccountId
  phoneNumberId
}
```

The platform reference contains no secret. The Organization reference contains
only identifiers. Credentials are resolved inside the backend sender adapter.
Every outbox record stores the resolved sender identity and policy version so a
later Store switch cannot change the meaning of queued work.

### Platform sender configuration

The platform sender needs a dedicated validated configuration boundary, even if
it reuses the existing environment account:

```env
WHATSAPP_PLATFORM_PHONE_NUMBER_ID=...
WHATSAPP_PLATFORM_ACCESS_TOKEN=...
WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME=...
WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME=...
WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE=en_US
```

The existing `WHATSAPP_API_URL` and `WHATSAPP_API_TOKEN` remain compatibility
inputs during migration, but new tenant bill/due code must not read raw
environment variables directly. The adapter validates configuration once,
redacts failures, and resolves the fixed template policy.

### Store configuration record

The separate history-aware Store configuration should conceptually contain:

```text
StoreWhatsAppConfiguration {
  id
  organizationId
  storeId
  mode
  organizationWhatsappAccountId nullable
  platformSenderKey nullable
  status
  effectiveFrom
  effectiveTo nullable
  changedBy
  changedAt
}
```

Required invariants:

- Exactly one current configuration per Store.
- `disabled` has no sender reference.
- `ganatri_utility` has the platform sender reference and no Organization
  account reference.
- `organization_cloud` has an Organization account reference and no platform
  sender reference.
- An Organization-owned account belongs to the same Organization as the
  Store.
- A Store has at most one linked Organization-owned phone.
- An Organization-owned phone may have multiple Store assignments.
- Each shared phone has exactly one default inbound Store while it has active
  Store assignments.
- Policy changes are serialized and audited.
- Historical configurations remain readable after a switch.

### Template ownership

```text
WABA template asset/submission
  organization + WABA scope

Store template binding/default
  organization + Store + sender/WABA + kind + language scope
```

Platform templates do not enter the Organization template manager. Their
names, language, kind, expected placeholders, and allowed sender are fixed by
backend configuration.

### Permission boundary

Until a real Organization membership-role model exists, authorization should
use the Organization creator/administrator identity already represented by the
current Organization access seam. The authorization layer should expose
capability checks internally so a later role migration does not rewrite every
WhatsApp service:

```text
canViewWhatsApp
canManageConnection
canManageStoreAssignment
canCreateTemplateDraft
canSubmitTemplate
canPublishTemplate
canManageConsent
canManageDelivery
canSendPromotion
canReplyInConversation
```

The initial release grants management capabilities only to the Organization
creator/administrator. Platform sender management remains a Platform
Administrator concern and must not be exposed through tenant routes.

### Customer Store visibility

Customers remain Organization-owned records. The integrated WhatsApp feature
may show two separate Store relationships:

- `createdInStore`: the explicit Store recorded when a new Customer is first
  created through a Store workflow.
- `activeInStores`: every Store where the Customer has qualifying activity,
  such as Customer creation, a completed Sale, a Store-scoped WhatsApp
  conversation, explicit Store attachment, or bill/due delivery. It is
  lifetime-based; recency is represented by `lastActivityAt`, not automatic
  removal.

These values must not be collapsed into one field. A Customer may have one
origin Store and many active Stores.

Each Store-Customer association stores a current summary with
`originSource`, `firstSeenAt`, `lastActivityAt`, and `lastActivitySource`. Every
qualifying event also appends an association activity record with its source,
occurrence time, and an idempotent source reference. The summary is updated
transactionally from the event; it is a read-optimized view, not a replacement
for the history. Repeated source events are deduplicated, and no association
or activity event is deleted for unlinking or inactivity.

For go-live migration, every existing Customer in an Organization with at
least one Store is intentionally assigned to that Organization's first-created
Store. The assignment is marked with a migration source so it is not confused
with an observed creation event. Organizations with no Store retain a null
origin until a Store exists. After go-live, every new Customer creation must
record the actual Store that created it. Historical `activeInStores` remains
derived independently from Store-scoped Sales and WhatsApp activity.

For a WhatsApp account assigned to multiple Stores, inbound routing uses this
precedence: existing conversation context, latest outbound message Store,
Customer activity in exactly one Store, then the account's default inbound
Store. If the result is a default or ambiguous route, Admin displays that
routing reason alongside the Customer's Store relationships.

## State machines

### Store policy transitions

```text
disabled
  ├─ choose Ganatri Utility ───────> ganatri_utility
  └─ connect and choose own Cloud ─> organization_cloud

ganatri_utility
  ├─ switch to own Cloud ──────────> organization_cloud
  └─ disable ──────────────────────> disabled

organization_cloud
  ├─ switch to Ganatri Utility ─────> ganatri_utility
  └─ disable ───────────────────────> disabled
```

Every transition requires administrator authorization, entitlement validation,
an explicit confirmation for a live sender change, an audit event, and an
atomic current-configuration update. Queued messages retain their original
sender and policy snapshot.

### Organization template lifecycle

```text
draft
  -> submitting
  -> pending
  -> approved
  -> explicitly published as Store default

pending -> rejected | failed
approved -> paused | disabled | archived
published -> archived | rolled back to another approved revision
```

The system must preserve the previous published default while a replacement is
pending. A failed submission may be retried with a new idempotency key only
after the previous attempt is safely terminal or stale.

### Delivery lifecycle

```text
pending -> sending -> sent -> delivered -> read
                  \-> failed -> retryable -> sending
                                    \-> dead_letter
```

Provider events are idempotent and may arrive out of order. Terminal provider
rejection, consent, policy, mapping, and approval errors do not receive blind
automatic retries.

## Detailed phased execution plan

Each phase must be completed as a separate reviewable slice:

```text
phase plan
  -> smallest implementation
  -> focused tests/checks
  -> standards and spec review
  -> fix findings
  -> user approval
  -> commit
```

### Phase 0 — Baseline, contradiction check, and contract lock

Objective: freeze the current behavior and close the remaining implementation
ambiguity before creating the app.

#### Baseline findings — 2026-09-17

The baseline was collected from the current `feat/ganatri-standalone-whatsapp`
worktree at `d16b5ff`, using source inspection, migration status, and aggregate
database queries. No message bodies, phone numbers, access tokens, or other
credentials were read or printed.

- The tracked mainline applications are `apps/admin`, `apps/pos`,
  `apps/mobile`, `apps/console`, and `apps/backend`. No separate WhatsApp app
  is part of the target architecture.
- In this plan, “Store Console” means the selected Store Workspace inside
  Admin. `apps/console` remains the Platform Administrator inspection console
  and cannot manage tenant WhatsApp data.
- The configured development database reports 148 applied migrations and zero
  pending migrations.
- The Cloud phone-status migration
  `20260915090000_add_whatsapp_cloud_provider_phone_status.sql` was applied
  during the Phase 0 development baseline.
- WhatsApp account inventory: one historical `baileys` account is connected,
  one historical `baileys` account is failed, one Cloud account is connecting,
  and one Cloud account is connected. The historical Baileys rows must remain
  readable while the retired provider stays unavailable for new work.
- Store assignment inventory: one account-to-Store assignment exists across
  one account and one Store; no account is currently assigned to multiple
  Stores.
- Cloud template submission inventory: one submitting, one pending, five
  approved, and thirteen failed submissions.
- Cloud template binding inventory: active/default bindings exist for bill,
  due reminder, and promotion kinds. The exact tenant identifiers remain
  intentionally undisclosed in this document.
- Outbox inventory contains sent invoice, text, promotion, and template work,
  plus dead-lettered template work. Existing outbox records must remain
  immutable during sender-policy migration.
- Customer consent inventory contains utility and marketing opt-in events.
- Current source still renders POS `/whatsapp` through the device-scoped inbox
  and Admin still exposes legacy Organization WhatsApp routes. The route
  cutover remains a required migration step.
- Existing platform notification code logs OTPs and invitation metadata. This
  is a Phase 0 security blocker before tenant utility delivery is enabled.
- After the authorized development-database migration run, all 148 migrations
  are applied and zero migrations remain pending. This includes
  `20260915090000_add_whatsapp_cloud_provider_phone_status.sql`.

Investigate and record:

- Current Admin route tree, POS route tree, API base configuration, and auth
  boundaries.
- Existing `whatsapp_accounts`, `whatsapp_business_accounts`, bindings,
  submissions, outbox, provider events, consent, and public invoice records.
- Existing Cloud assignments, including any account-to-Store sharing.
- Existing environment sender configuration and fixed platform templates.
- Current logs that contain OTPs, phone numbers, message bodies, or provider
  payloads.
- Migration status and a read-only data inventory before any destructive or
  corrective migration.

Phase 0 resolution:

- The pending Cloud phone-status migration was applied with the other
  development migrations; the database is now at 148 applied and zero pending.
- The Ganatri platform phone is approved as a platform-level exception for
  outbound utility delivery across Stores. It is not an Organization-owned
  Store assignment.

Implementation follow-ups before affected phases:

- Confirm the existing Admin and Store Console route ownership before Phase 1
  wiring.
- Finalize Admin/Store Console navigation timing and POS navigation-removal
  details before Phase 7 cutover.

Deliverables:

- Baseline route and API inventory.
- Platform sender configuration checklist.
- Existing assignment/data inventory.
- Final sender/policy/outbox contract.
- Redaction findings and security worklist.

Exit gate: no unresolved sender ownership or Store-cardinality contradiction.

### Phase 1 — Integrated Admin and Store Console foundation

Objective: establish the integrated Admin and Store Console WhatsApp surfaces
without moving WhatsApp behavior or creating a new application.

Work:

- Reuse the existing Admin and Store Console workspace packages and metadata.
- Reuse existing document identity, theme, navigation, API client, login,
  logout, session bootstrap, and error states.
- Add the Admin WhatsApp workspace and Store Console WhatsApp panel with safe
  Organization/Store context.
- Add route guards for unauthenticated, unknown Organization, and unknown
  Store states at the existing application boundaries.
- Add clear non-mutating mode/status placeholders in both surfaces.

Tests:

- Login and session bootstrap route tests.
- Refresh persistence and logout tests.
- Unknown Organization/Store denial tests.
- API base URL and application identity tests.
- No device-authenticated POS cookie or token is accepted by Admin or Store
  Console WhatsApp routes.

Exit gate: Admin and Store Console expose correctly scoped WhatsApp surfaces
without provider calls or WhatsApp mutation.

### Phase 2 — Authorization and Store policy foundation

Objective: establish the security boundary before connecting senders.

Work:

- Implement the creator/administrator check behind a reusable WhatsApp
  capability service.
- Add the separate Store configuration/history table or equivalent durable
  record.
- Add constraints for mode/sender consistency and one current configuration.
- Add atomic policy read and policy transition operations.
- Add audit records for enable, disable, switch, link, unlink, and failed
  transition attempts.
- Apply the existing WhatsApp Store Entitlement to both sender modes.
- Return structured denial reasons for disabled, unentitled, unauthorized,
  missing-sender, and unhealthy-sender states.

Tests:

- Creator versus non-creator authorization matrix.
- Cross-Organization Store/account rejection.
- Concurrent switch/link race tests.
- One-current-configuration database constraint tests.
- Entitlement denied/allowed tests for both modes.
- Queued-work sender snapshot remains unchanged after policy switch.

Exit gate: no message route can bypass policy or capability checks.

### Phase 3 — Ganatri Utility sender and fixed-template delivery

Objective: deliver the restricted platform-owned mode through the common
outbox.

Work:

- Add a validated platform sender adapter around the existing Ganatri account.
- Separate platform configuration from tenant Organization Cloud credentials.
- Resolve bill and due template names from backend-only configuration.
- Validate configured template existence, approval, enabled state, category,
  language, and placeholder contract.
- Route bill/due work into the existing outbox with a platform sender snapshot.
- Reject promotion, free-form, custom-template, template-management, and
  inbox-reply requests for `ganatri_utility`.
- Remove or redact existing OTP and sensitive WhatsApp logs before enabling
  tenant utility delivery.
- Persist inbound platform replies for internal handling without exposing them
  to Organization users or sending an automatic response.

Tests:

- Missing/invalid environment configuration fails closed.
- Only configured bill/due template names can be selected.
- Marketing, text, custom template, and reply operations are rejected at the
  backend boundary.
- Platform credentials never appear in DTOs, logs, URLs, or client bundles.
- Outbox idempotency, retry, delivery event, and dead-letter behavior works for
  platform sends.
- Existing OTP/invitation behavior remains compatible after configuration
  separation.

Exit gate: a Store can use Ganatri Utility for bill/due only with complete
delivery tracking and no Organization-visible conversation surface.

### Phase 4 — Organization Cloud connection

Objective: reuse existing Embedded Signup capability from the Admin WhatsApp
workspace without changing credential ownership.

Work:

- Reuse the existing signed onboarding state and replay protection.
- Launch Meta Embedded Signup from the Admin WhatsApp workspace.
- Complete the server-side authorization exchange.
- Validate WABA identity, phone identity, phone registration, and account
  ownership.
- Store credentials only through the encrypted credential vault.
- Persist resumable provisioning attempts and safe failure states.
- Subscribe the WABA to webhooks.
- Add refresh, revoke, phone-registration, and credential-rotation actions.
- Enforce one Organization-owned physical phone per Store.

Tests:

- Cancelled, incomplete, duplicate, replayed, and expired signup results.
- WABA/phone mismatch and cross-Organization ownership failures.
- Vault unavailable and token-rotation rollback behavior.
- Revoke/disconnect/phone-unregistered send denial.
- Same phone concurrent assignment race.
- No credential or temporary access token leakage.

Exit gate: an administrator can connect and health-check an Organization-owned
Cloud phone, but it cannot send until a valid Store policy and template path
exist.

### Phase 5 — Organization template lifecycle

Objective: complete the approved WABA-level template and Store-level binding
workflow.

Work:

- Add a real draft persistence action separate from Meta submission.
- Validate kind-specific components, variable mapping, samples, language,
  media, URL buttons, and naming rules before submission.
- Add separate draft and submit capabilities internally, even if only the
  creator receives both initially.
- Submit to Meta idempotently and persist provider identifiers/status.
- Process webhook status updates and manual sync consistently.
- Show pending/rejected/paused/disabled/archived reasons safely.
- Explicitly publish an approved revision to a Store default.
- Enforce one active default per Store, sender/WABA, kind, and language.
- Support archive and rollback without deleting historical submissions.
- Record actor, Store, WABA, kind, language, revision, and reason in audits.

Tests:

- Draft save does not call Meta.
- Duplicate submission is idempotent.
- Approval does not auto-publish.
- Rejected/pending/disabled templates cannot send.
- Category mismatch, missing variables, bad samples, and invalid media fail
  before provider calls.
- Store binding cannot cross Organization, WABA, sender, or entitlement scope.
- Archive/rollback preserves the old revision and changes only the active
  binding state.

Exit gate: the creator can safely prepare and publish approved templates for
Organization Cloud Stores; Ganatri Utility remains read-only/fixed.

### Phase 6 — Bill and due delivery in both modes

Objective: make the initial integrated release useful and operationally safe.

Work:

- Resolve policy and sender for every bill and due request.
- Use fixed platform templates for Ganatri Utility.
- Use explicitly published Store defaults for Organization Cloud.
- Enforce completed-sale/due-balance, Store, customer-phone, consent,
  suppression, account-health, and entitlement checks.
- Preserve exact template and sender snapshots in the outbox.
- Support status polling, retryable failures, deliberate resend, and clear
  terminal failures.
- Block duplicate bill sends with idempotency while allowing an explicit
  audited resend.
- Keep voided/changed Sale history immutable and require a deliberate
  correction/resend action.

Tests:

- Bill and due success for both modes.
- Disabled, unentitled, missing-account, missing-template, unregistered-phone,
  suppressed, opted-out, zero-balance, and invalid-customer failures.
- Duplicate request and deliberate resend behavior.
- Policy switch while pending/sending/delivered.
- Provider timeout, rate limit, permanent rejection, and webhook delay.
- Exact sender/template snapshot on every queued operation.

Exit gate: initial release acceptance criteria pass for both sender modes.

### Phase 7 — Migration and integrated cutover

Objective: move existing behavior without accidental activation or auth mixing.

Work:

- Take a read-only inventory of existing Cloud account assignments and current
  Store template defaults.
- Create policy records for existing Stores with Cloud assignments.
- Set Stores without an existing assignment to `disabled`.
- Do not automatically enable Ganatri Utility.
- Preserve historical messages, provider events, submissions, bindings, and
  outbox records.
- Keep Admin WhatsApp routes in Admin and add the Store Console WhatsApp panel
  with safe Organization/Store context.
- Redirect POS `/whatsapp` to POS home without crossing into user-authenticated
  Admin or Store Console routes.
- Keep POS bill/due actions and status indicators working according to the
  resolved Store policy.

Migration checks:

- Dry-run counts before and after migration.
- No duplicate active Store configuration.
- No Organization-owned phone assigned to two Stores.
- No queued outbox row loses its sender/account reference.
- Rollback restores route behavior and leaves historical records unchanged.

Exit gate: browser verification confirms Admin, Store Console, and POS do not
cross authentication or Store boundaries.

### Phase 8 — Later inbox and customer replies

Objective: add Organization Cloud customer messaging after initial delivery is
stable.

Work:

- Move/reuse Store-scoped conversation list and message view.
- Add customer exact-phone matching and explicit attachment.
- Add service-window state and reply capability checks.
- Keep Ganatri Utility conversations hidden from Organization users.
- Preserve attachments, delivery status, polling, and webhook reconciliation.

Exit gate: conversations cannot cross Organization, Store, or sender scope;
free-form messaging is blocked outside the customer-service window.

### Phase 9 — Later promotions and operations

Objective: add marketing and operational controls only for Organization Cloud.

Work:

- Add approved marketing-template selection.
- Add campaign creation, consent filtering, cooldown, pagination, progress,
  retry, resend, and stop behavior.
- Add outbox, quota, provider-event, webhook, and reconciliation dashboards.
- Keep every promotion route unavailable for Ganatri Utility.
- Add permission checks and audit records for every operator action.

Exit gate: no marketing message can be sent by the Ganatri sender or with an
unapproved/misbound template, regardless of client input.

## Initial release route and capability map

The feature remains inside the existing application route trees. The initial
integrated surfaces should contain these conceptual routes:

```text
Admin:
  /whatsapp
  /whatsapp/numbers
  /whatsapp/stores
  /whatsapp/templates
  /whatsapp/delivery
  /whatsapp/settings

Store Console:
  /stores/:storeId/whatsapp
  /stores/:storeId/whatsapp/delivery
```

Initial release visibility:

| Surface | Disabled | Ganatri Utility | Organization Cloud |
| --- | --- | --- | --- |
| Mode selection | View/change by administrator | View/change by administrator | View/change by administrator |
| Connection | No connection | Platform health only | Embedded Signup/health |
| Bill/due delivery | Hidden/blocked | Fixed templates | Published Store defaults |
| Template CRUD | None | None | Creator-only draft/submit/publish |
| Inbox | None | Hidden | Deferred |
| Promotions | None | Blocked | Deferred |
| Consent | View if historical | Manage by administrator | Manage by administrator |
| Delivery status | None | Bill/due status | Bill/due status |

## Verification matrix

### Boundary checks

- Admin and Store Console WhatsApp routes accept only their existing user
  authentication and scope.
- POS accepts only Device Authentication.
- No cross-application redirect carries Store Device secrets or WhatsApp
  credentials.
- Platform credentials never reach React, DTOs, logs, URLs, or client storage.
- Organization IDs, Store IDs, account IDs, binding IDs, and submission IDs are
  checked against the authenticated Organization before use.

### Policy checks

- Every send resolves exactly one current Store policy.
- Disabled rejects all new sends.
- Ganatri Utility accepts only bill/due and fixed configured templates.
- Organization Cloud requires a same-Organization account and published valid
  binding.
- No implicit sender fallback exists.
- Policy switches do not alter queued work.

### Template checks

- Platform template names are backend configuration, not client input.
- Cloud template draft, submission, approval, publishing, archive, and rollback
  states are independently observable.
- Category, language, variable, sample, media, and consent rules are tested.
- One default constraint is tested under concurrent publish operations.

### Delivery checks

- Bill/due idempotency prevents accidental duplicates.
- Explicit resend creates a deliberate new operation with audit context.
- Retry policy distinguishes transient provider failures from permanent policy,
  consent, mapping, and approval failures.
- Provider webhook replay and out-of-order events converge safely.
- Attachments and public invoice links do not expose credentials or internal
  identifiers.

### Required focused commands at implementation closeout

- `bun run --cwd apps/admin check-types`
- `bun run --cwd apps/pos check-types`
- Store Console package typecheck, tests, lint, and build.
- Focused backend WhatsApp tests.
- Migration dry-run/status verification against the configured development
  database.
- `git diff --check`.
- Browser verification for Admin, Store Console, and POS boundaries.

## Rollout and rollback plan

### Rollout

1. Deploy database policy/configuration migration without enabling new UI.
2. Validate platform sender configuration and fixed templates read-only.
3. Deploy backend resolver and outbox support behind a disabled feature flag.
4. Migrate existing Cloud assignments to explicit policy records.
5. Enable the integrated Admin and Store Console WhatsApp UI.
6. Enable Ganatri Utility bill/due delivery for explicitly selected Stores.
7. Enable Organization Cloud onboarding and delivery.
8. Keep Admin WhatsApp routes in place, enable Store Console scope, and retire
   the POS conversation route by redirecting `/whatsapp` to POS home.
9. Monitor outbox, provider events, consent denials, and delivery failures.

### Rollback

- Disable new policy transitions and new sends without deleting records.
- Keep already queued operations tied to their original sender and allow the
  outbox to drain or enter a controlled dead-letter state.
- Restore Admin/POS route behavior through configuration or a reversible
  frontend release.
- Revert only policy activation records if necessary; do not delete accounts,
  credentials, submissions, messages, provider events, or audits.
- Re-run reconciliation after recovery and compare before/after counts.

## Review checklist before each phase approval

- Does the phase change only the approved sender/policy behavior?
- Are Organization, Store, sender, template, customer, and user scopes checked
  at the backend boundary?
- Are secrets and sensitive message data absent from logs and client state?
- Are queued messages immutable with respect to sender and template?
- Are retries idempotent and bounded?
- Are disabled, revoked, unentitled, pending, rejected, suppressed, and missing
  configuration states visible and safe?
- Are existing records preserved and unrelated worktree files untouched?
- Did focused tests cover the newly introduced state transition?
