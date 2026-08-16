# WhatsApp customer messaging feature research

Date: 2026-08-16

This note evaluates three requested features against the current Hisab/Ganatri codebase:

1. Custom bill message.
2. Promotional offer with an image.
3. Due-bill reminders from a bill or customer.

This is a research note only. It does not change runtime behavior or the database.

## Current foundation

The existing WhatsApp boundary is already the right place for these features:

- The web UI calls the backend, the backend writes `whatsapp_messages` and `whatsapp_outbox`, and the isolated Node worker dispatches the outbox through the linked WhatsApp account.
- Outbound work is serialized per account and rate-limited by `WHATSAPP_MINIMUM_SEND_INTERVAL_MS`; the current worker default is 750 ms.
- Outbox rows are Store-scoped and are claimed only when the account is connected and assigned to that Store. This matters because one organization-level account can serve multiple Stores.
- Invoice PDFs are stored in private media storage and loaded by the worker only when the job is claimed.

Sources: `apps/backend/src/modules/tenant/whatsapp/invoice.ts:68-204`, `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:914-1085`, `apps/whatsapp-worker/src/config.ts:20-37`.

## Feature 1: custom bill message

### What exists

The current invoice action validates a completed Sale, requires a Customer with a valid international phone number, resolves the Store's assigned WhatsApp account, renders a PDF, builds a fixed caption with bill number/total/paid/balance, uploads the PDF, and queues it. The caption is generated in one pure formatter, so there is a clean seam for customization.

Sources: `apps/backend/src/modules/tenant/whatsapp/invoice.ts:86-204`, `apps/backend/src/modules/tenant/whatsapp/invoice-text.ts:19-65`, `apps/web/src/components/billing/sale-detail-dialog.tsx:197-218,406-424`.

### Recommended shape

Use two levels of customization:

1. Store-level default bill template, configurable by an admin.
2. Optional one-time message edit in the Send Bill dialog, previewed before queueing.

The generated bill facts should remain server-owned. A custom message should be an optional prefix/suffix or template body with safe placeholders such as `{{customer_name}}`, `{{bill_number}}`, `{{total}}`, `{{paid}}`, and `{{balance_due}}`. The backend should render and validate those placeholders; the browser must not be trusted to supply totals or customer identity.

For the first implementation, a Store-level template is lower-risk because the current database intentionally allows one invoice outbox row per Sale. Per-send customization would require either storing the chosen caption on the existing outbox row before it is sent or changing invoice idempotency so every intentional resend can have a distinct message. The current unique invoice outbox rule makes silently replacing an already queued caption unsafe.

Source: `apps/backend/db/migrations/20260811100000_create_whatsapp_messaging_foundation.sql:112-158` (`whatsapp_outbox` and its one-invoice-per-Sale index), plus `apps/backend/src/modules/tenant/whatsapp/invoice.ts:127-133`.

### UI recommendation

Keep the existing bill dialog action, but rename it to `Send bill on WhatsApp`. Open a small preview dialog with:

- rendered message preview;
- optional editable custom note;
- attached PDF indication;
- `Send` and `Cancel`;
- clear status after queueing.

Do not put a free-form message field directly into the bill list row; it will be cramped and makes accidental sends more likely.

## Feature 2: promotional offer with image

### What exists

Private object storage already supports buffer uploads and signed URLs. The WhatsApp worker's provider helper already returns an image payload when the MIME type starts with `image/`; however, the shared type/schema contract currently exposes only `text` and `document` message types and the worker event validator also only accepts those two types.

Sources: `apps/backend/src/services/storage/index.ts:25-38`, `apps/backend/src/modules/common/common.routes.ts:20-35`, `apps/whatsapp-worker/src/provider/media-message.ts:1-22`, `packages/types/src/services/whatsapp.schema.ts:1-6,160-205`.

### Required product/data additions

A real promotion feature needs more than a button that loops through Customers:

- marketing consent state on the Customer, including opt-in timestamp and opt-out timestamp;
- a Promotion/Campaign record containing Store, selected WhatsApp account, title, message, image key, creator, status, and timestamps;
- recipient records with a snapshot of customer id/phone, queued/sent/failed state, failure reason, and provider message id;
- an idempotency key per campaign recipient;
- a cooldown or duplicate-send rule;
- a preview and recipient count before queueing.

The campaign must select a Store/account explicitly. Customers are organization-scoped, while the WhatsApp conversation and outbox rows are Store-scoped. Reusing an account across Stores without choosing the Store would recreate the cross-Store conversation foreign-key problem fixed in the current WhatsApp work.

### Sending path

The campaign should upload the image to a server-generated, organization/campaign-scoped storage key, then create one durable outbox row per recipient. The existing worker can dispatch the image after the message contract is extended with an image/media type and the database enum is migrated. The browser should never send directly to WhatsApp or contain the account credentials.

Do not reuse the generic `/common/get-signed-url-for-upload` endpoint unchanged for campaign media. It accepts a caller-supplied path after authentication; a campaign-specific endpoint should generate and authorize the key, enforce image MIME/size limits, and prevent a user from choosing arbitrary storage paths.

Sources: `apps/backend/src/modules/common/common.routes.ts:20-35`, `apps/backend/src/modules/common/common.service.ts:21-63`, `apps/whatsapp-worker/src/index.ts:74-110`, `apps/whatsapp-worker/src/provider/baileys-account-manager.ts:361-378`, `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:999-1085`.

### Marketing safety

Promotion messages are marketing, unlike a bill delivery or a due reminder. The current Customer model has no marketing opt-in/opt-out field. Promotions should therefore be blocked until the Customer has opted in, and every promotion should include a simple opt-out instruction. The UI should show excluded counts for customers without a phone, invalid numbers, inactive customers, and no marketing consent.

## Feature 3: due-bill reminders

### What exists

Customer balance is already maintained through the append-only Customer Ledger. A committed Sale adds its grand total to the Customer balance; collected payments subtract from it; voids reverse the sale entry. Customer listing already supports a `due` filter using `customers.balance > 0`.

Sale summaries already expose `paidTotal` and `dueTotal`, where due is calculated as grand total minus collected payments. The bill detail dialog already has the customer, payment status, due amount, and WhatsApp action available.

Sources: `apps/backend/src/modules/tenant/billing/billing.service.ts:1505-1532,2453-2497,3269-3277`, `apps/backend/src/modules/tenant/billing/billing.repository.ts:162-279,443-475`, `packages/types/src/modules/billing/billing.schema.ts:225-308`, `apps/web/src/components/billing/sale-detail-dialog.tsx:300-327`.

### Recommended behavior

Provide two separate actions:

1. On a specific unpaid/partial bill: `Send due reminder`.
   - Message includes customer name, Store, bill number/date, total, paid, and remaining balance.
   - Offer an optional `Attach bill PDF` checkbox, off by default for reminders.
   - Refuse if the Sale is paid, voided, has no Customer, or has no valid phone.

2. On the Customer detail dialog: `Send balance reminder`.
   - Load the customer's current receivable Sales from the backend, not only the first eight ledger entries currently shown in the UI.
   - Show the count and total due before sending.
   - Send one consolidated message listing bill numbers and per-bill balances, with a safe maximum length. If the list is too long, send a short summary and offer bill-by-bill messages.

The Customer detail action needs an explicit Store selector because a Customer and its balance are organization-scoped but the WhatsApp account, conversation, outbox, and invoice attachment are Store-scoped. The backend should aggregate receivable Sales across Stores for the preview, then queue the message against the selected Store/account. A simpler first version can scope the Customer dialog to the currently selected Store and clearly label that scope.

### Backend seam

The current text outbox requires an existing Store-scoped WhatsApp conversation id. A reminder sent from a bill/customer action cannot assume that a conversation already exists. Add a backend helper that resolves or creates a conversation for `(account, Store, customer phone)` and then creates a normal text outbox row. Keep this helper Store-scoped and reuse the existing per-account queue and worker dispatch path.

Source: `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:914-980`, plus the Store/account routing rules in `apps/backend/src/modules/tenant/whatsapp/whatsapp.repository.ts:723-770`.

## Proposed implementation order

1. Add Store bill-message template settings and render/preview them in the existing bill Send dialog.
2. Add the single-bill due reminder using the existing text outbox, with a new ensure-conversation helper.
3. Add Customer-level receivable Sales query and consolidated balance reminder, initially scoped to a selected Store.
4. Add marketing consent/opt-out fields and campaign tables.
5. Add the campaign composer, safe image upload, recipient preview, durable recipient outbox rows, image message contract, and worker dispatch.

This order delivers the two transactional features first and keeps marketing opt-in, campaign auditability, and image transport from being mixed into invoice delivery.

## Main risks to resolve before implementation

- Decide whether “custom bill message” means a reusable Store template, one-time per-send editing, or both. Per-send editing changes the current invoice idempotency behavior.
- Decide whether a Customer reminder is organization-wide or Store-specific. The current data model supports organization-wide Customer balances but Store-scoped WhatsApp delivery.
- Add marketing consent before enabling promotions; do not treat having a phone number as consent.
- Extend message/media contracts and migrations for images; the provider helper is already image-aware, but the shared schema is not.
- Add campaign-level recipient idempotency and cooldowns before sending to large lists.
- Keep the current dead-letter/retry and account-serial-queue behavior. Promotions and reminders must use the durable outbox, not a synchronous loop from the web request.
