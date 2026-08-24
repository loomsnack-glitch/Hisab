# WhatsApp Cloud API Phase 0 readiness research

Date: 2026-08-21
Scope: Meta and product readiness before Cloud API runtime work

## Decision

Phase 0 cannot be completed by repository changes alone. The implementation
can prepare the contracts and checklist, but Meta App configuration,
Business verification, App permissions, billing enrollment, test WABA/phone,
and production HTTPS deployment must be completed in the relevant external
accounts before live onboarding is enabled.

The first Hisab rollout should remain customer-billed. The credit-line flow
documented by Meta is a separate partner billing path and should not be added
to the first implementation unless Hisab intentionally accepts aggregated
Meta billing and the associated commercial/legal responsibility.

## Findings from primary sources

### 1. Required Meta assets and permissions

Meta's Cloud API documentation identifies a Meta business portfolio, a
WhatsApp Business Account (WABA), and a business phone number as the basic
assets. The documented permissions for normal Cloud API work are
`whatsapp_business_management` and `whatsapp_business_messaging`; broader
`business_management` access is use-case dependent.

Source: [Meta WhatsApp Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)

### 2. Embedded Signup is a multi-step server-backed flow

The Embedded Signup documentation requires:

1. Facebook JavaScript SDK/Facebook Login integration in the customer portal.
2. Secured HTTPS endpoints for the integration.
3. Server-side operations for shared WABA discovery, system-user assignment,
   phone registration, and approved-template discovery.
4. Subscription of the Hisab App to each connected WABA so webhook events are
   delivered for its phone numbers.

Source: [Meta Embedded Signup collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

Phone registration also requires a six-digit registration PIN and two-step
verification. Embedded Signup phone registration has a documented 14-day
completion window, so onboarding state must be resumable and expiry-aware.

Source: [Meta Cloud API phone registration documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)

### 3. Billing path must be an explicit product decision

The Embedded Signup collection documents sharing a provider credit line with a
client WABA as a separate step. It states that this path lets the business pay
the provider while the provider receives an aggregated invoice from Meta.
That is not equivalent to ordinary customer-owned billing.

Source: [Meta Embedded Signup credit-line documentation](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)

For the first Hisab rollout, the product decision remains:

- customer owns the Meta billing relationship;
- Hisab enforces its own quota, cooldown, and budget safety controls;
- Hisab does not attach a credit line or promise to pay Meta on behalf of a
  customer;
- centralized billing remains a future BSP/Solution Partner workstream.

### 4. Messaging policy affects the data model and UI

Meta's policy requires both the recipient's phone number and opt-in
permission before contacting a person. Opt-out requests must be honored.
Business-initiated conversations require an approved Message Template, while
free-form replies are allowed during the 24-hour customer-service window.
The policy also requires a clear support/escalation path and a published
privacy policy.

Source: [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

Therefore Phase 0 must approve the following before marketing or due-message
delivery is enabled:

- the consent wording shown to customers;
- accepted opt-in sources and evidence;
- opt-out keywords and manual suppression behavior;
- utility versus marketing classification for each message type;
- the support contact shown in the WhatsApp Business profile and Hisab UI;
- privacy policy, terms, retention, and deletion handling.

### 5. Pricing must not be hardcoded

Meta charges per delivered message, not merely per API request. Pricing varies
by recipient market and message category: marketing, utility, authentication,
or service. Service messages are not charged, and utility replies to users are
treated differently from outbound business-initiated utility messages. The
pricing page also documents free entry-point windows and market-specific rate
cards.

Source: [WhatsApp Business Platform pricing](https://whatsappbusiness.com/products/platform-pricing/)

Hisab should therefore record provider category, delivery outcome, market
context, and pricing-period metadata rather than embedding a single message
rate in the application.

## Phase 0 execution checklist

### Meta account owner

- [ ] Create or confirm Hisab's Meta Business Portfolio.
- [ ] Create the Meta Developer App and WhatsApp product.
- [ ] Confirm Tech Provider eligibility/terms and required App Review or
      Advanced Access for the intended permissions.
- [ ] Configure the production domain and redirect/origin allowlists.
- [ ] Create a test WABA and test business phone number.
- [ ] Confirm the test phone is eligible for Cloud API registration and record
      the WABA ID and Phone Number ID outside source control.
- [ ] Generate a non-browser system-user credential with the minimum required
      permissions and place it in the chosen secret manager.
- [ ] Configure the App webhook callback and verify token.
- [ ] Subscribe the test WABA to the App.
- [ ] Submit/approve the first utility and marketing templates needed for the
      controlled test.

### Product/legal owner

- [ ] Decide customer-owned Meta billing for the first rollout.
- [ ] Approve monthly Hisab quota, budget, overage, and campaign-stop policy.
- [ ] Approve bill, due-reminder, and promotion consent wording.
- [ ] Define accepted consent evidence and opt-out behavior.
- [ ] Approve privacy policy, terms, retention, and data-deletion periods.
- [ ] Approve phone-number migration behavior for numbers currently used in
      WhatsApp or WhatsApp Business App.
- [ ] Confirm allowed customer verticals and prohibited-content handling.

### Engineering/deployment owner

- [ ] Provide a stable HTTPS webhook URL for `GET` verification and `POST`
      signed events.
- [ ] Store App Secret, webhook verify token, onboarding-state secret, and
      provider credentials outside Git and browser-exposed configuration.
- [ ] Configure monitoring for webhook verification, event acceptance,
      duplicate receipts, processing lag, delivery failures, and dead letters.
- [ ] Run the production-shaped database migration and secret redaction check
      in a non-production environment.
- [ ] Confirm the local Baileys worker remains isolated until Cloud exit gates
      authorize the migration; do not remove port 8100 during Phase 0.

## Exit gate

Phase 0 is complete only when all of the following are evidenced in a
controlled environment:

1. Embedded Signup completes for the test business.
2. The WABA and phone identifiers are persisted without exposing credentials.
3. The phone is registered and the App is subscribed to the WABA.
4. Meta can verify the HTTPS webhook and signed test events are accepted.
5. At least one approved utility template and one approved marketing template
   are available for the test flow.
6. Billing owner, consent, quota, retention, and phone-migration decisions are
   written and approved.
7. No live customer onboarding or Cloud sending is enabled before these gates
   pass.

## Repository alignment

The current repository already has Cloud contract slices for onboarding state,
webhook verification, receipt persistence, normalization, and outbound
payloads. It does not yet prove any external Meta prerequisite above. The next
code phase remains Phase 1 security/account persistence, followed by Phase 2
runtime wiring, after the external Phase 0 gate is satisfied.
