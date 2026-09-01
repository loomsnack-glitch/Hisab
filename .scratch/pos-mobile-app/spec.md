# POS Mobile App — Product Discussion Draft

Status: Discussion draft

## Purpose

Define the first useful version of a mobile Ganatri POS app before deciding on screens, APIs, or implementation details.

## Product principles

### Simple UX first

The mobile app should make the common Sale path feel obvious and fast:

- Keep one primary task visible at a time.
- Use clear labels and large touch targets.
- Keep the current cart easy to open from anywhere in the billing flow.
- Hide restaurant-specific and advanced actions unless they apply to the Store or current Sale.
- Use progressive disclosure for discounts, Customer details, and other secondary options.
- Avoid asking the user to make the same decision in multiple places.
- Show clear, recoverable errors when a request fails.

### Version 1 languages

The mobile POS interface will support:

- English
- Gujarati
- Hindi

Translations should cover navigation, billing actions, forms, validation messages, errors, empty states, payment states, and receipt actions. Product names, Customer names, and other business-entered values should remain exactly as entered rather than being translated.

## Discussion order

### 1. Users

The primary user is any authorized person who can access Ganatri POS for the Store. The app should not assume that the user is specifically an owner or a cashier.

Access and permissions should follow the existing Store Device and POS authorization model. If different user roles are needed later, they should be defined separately from the basic ability to use POS.

### 2. Main problem

What should the mobile app make easier?

Possible goals include:

- Creating Sales quickly at the counter
- Searching and selecting Catalog Products
- Collecting Payments
- Viewing or sharing receipts
- Operating the store without a computer

### 3. First MVP workflow

The initial candidate workflow is:

1. Authenticate the Store Device and open Ganatri POS.
2. Search or browse Catalog Products.
3. Add products to a Draft Sale.
4. Select a Customer or use Walk-in.
5. Apply supported discounts or taxes.
6. Collect one or more Payments.
7. Commit the Sale.
8. Show, share, or print the receipt.

This workflow is a starting proposal, not an approved product decision. The final screen sequence should follow the Simple UX First principle and keep secondary actions out of the main path.

## Current POS capability map

The existing POS already provides these capabilities:

- Store Device login and device-scoped POS access
- Product browsing, search, categories, and barcode scanning
- Product combos and configurable add-ons
- Cart quantity changes and Draft Sale handling
- Customer search, quick Customer creation, and Walk-in billing
- Discounts by amount or percentage
- Cash, UPI, and Card Payments
- Paid, Partial, and Due Sale settlement states
- Bills history, search, date filters, payment filters, sorting, and Sale details
- Receipt printing and sending an invoice through WhatsApp
- Store Tables, table orders, table Payments, and Dine-In/Pick-Up service modes
- KOT generation, standalone KOTs, and kitchen KOT completion
- Product-sales Reports with date filters
- POS WhatsApp conversation inbox and Customer linking
- POS appearance settings

Tables and KOT are conditional Store features. They should appear in the mobile app only when enabled for the Store.

## Recommended mobile scope

### Phase 1 — Fast counter billing

The first release should focus on the most frequent POS task: an authorized POS user completing a normal Sale quickly from a phone.

Recommended Phase 1 capabilities:

1. Store Device authentication and session handling.
2. Product search, categories, barcode scan, combos, and add-ons.
3. A mobile-first cart for changing quantities and reviewing the Draft Sale.
4. Customer selection, quick Customer creation, or Walk-in billing.
5. Discount entry.
6. Cash, UPI, and Card Payments with Paid, Partial, or Due settlement.
7. Sale completion with receipt display, sharing, printing, and WhatsApp delivery where configured.
8. Bills history and the ability to reopen Sale details or resume a Draft Sale.

### Phase 2 — Store-specific operations

Add these after the normal counter Sale is reliable:

- Tables and table orders for Stores using table service
- Dine-In and Pick-Up flows
- KOT generation and kitchen KOT completion for Stores with the KOT System enabled

Tables and KOT will follow the shared billing workflow in the release sequence. The product will still be designed as one app for both retail and restaurant Stores, but restaurant operations will be added after core billing is reliable.

### Phase 3 — Supporting workspace features

Consider these after billing is stable:

- Product-sales Reports
- Full Customer directory management
- WhatsApp conversation inbox and Customer linking
- Appearance and other settings

This phased recommendation is pending product agreement. It is based on the existing POS feature set and the frequency and importance of each workflow, not a final release commitment.

## Product direction: retail and restaurant Stores

The mobile app should support both general retail Stores and restaurant Stores from the same Ganatri POS application.

The app should have one shared core for every Store:

- Product selection and cart-based billing
- Customer or Walk-in selection
- Discounts and Payments
- Sale completion and receipts
- Bills and Draft Sale recovery

Restaurant-specific capabilities should be modular and Store-configured:

- Tables and table orders
- Dine-In and Pick-Up service modes
- KOT generation and kitchen completion

Retail users should not be forced through restaurant steps, while restaurant users should be able to access the restaurant workflow without a separate app. Store capability settings should control which features appear.

### 4. Existing Hisab capabilities

Decide which existing capabilities the mobile app should reuse:

- Store Device authentication and device-scoped POS access
- Organization and Store scope
- Catalog Product search and selection
- Customer search and selection
- Sales, Draft Sales, Payments, and Payment Status
- Receipt generation and sharing
- Existing Admin and POS API contracts

The Customer directory and the Customer picker used during billing may have different search and pagination behavior. The mobile workflow should define the required Customer-search experience explicitly.

### 5. Connectivity

Version 1 will use an online-first connectivity model:

- Billing requires an active internet connection.
- Offline billing and later synchronization are deferred until after the core workflow is stable.
- Limited local caching may still be considered for improving loading and navigation, but it must not imply that Sale creation works offline.

### 6. Devices and hardware

Decide which devices and accessories are required:

- Android only or Android and iPhone
- Barcode scanner support
- Bluetooth or network receipt printers
- Cash drawer support
- Payment terminal or QR-payment integration
- Phone camera scanning

### 7. Security and operations

Define:

- Store Device registration and replacement
- Staff permissions and Store access
- Session expiry and device revocation
- Handling failed Payments and interrupted Sale creation
- Audit information for the Store Device that created a Sale

### 8. Success criteria

Define measurable outcomes for the MVP. For example:

> A cashier can create and complete a normal Sale in under one minute.

Other useful measures may include successful Sale completion rate, search speed, receipt delivery success, and recovery from interrupted connectivity.

## Open questions for the next discussion

1. What is the single most important task the authorized POS user must complete?
2. How should the user select and change English, Gujarati, or Hindi?
3. Should receipts be generated in the selected app language?
4. Which payment methods must be supported first?
5. Is Android-only acceptable for the first release?
6. Which hardware must work on day one?

## Initial decision needed

The target product is confirmed as one app for both general retail and restaurant Stores. Tables and KOT are confirmed for a later phase after the shared counter-billing workflow. Version 1 is confirmed as online-first; offline billing is deferred. The next decision is the exact Version 1 billing flow, including supported Payment and receipt behavior.

## Comments

- Product direction agreed: support both general retail and restaurant Stores in one mobile POS app.
- Tables and KOT follow the shared counter-billing workflow in the release sequence.
- Version 1 is online-first; offline billing and synchronization are deferred.
- Simple UX is a Version 1 product requirement.
- Version 1 supports English, Gujarati, and Hindi.
