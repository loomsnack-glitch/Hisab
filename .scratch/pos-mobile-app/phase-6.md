# POS Mobile App — Phase 6 Execution Record

Phase 6 adds Bluetooth thermal-printer support for English-only receipts while
keeping Sale completion independent from printing. This record follows the
phase-loop lifecycle and preserves the no-build/device-start rule from
`AGENTS.md`.

## Phase 6 — Bluetooth printing

### Phase plan

User-facing outcome: an authorized Android POS user can configure a supported
Bluetooth thermal printer, test it, print an already-confirmed Sale from Sale
Complete or Sale Details, and retry a failed print without changing the Sale.

Subphase order:

| Subphase | Scope | Exit condition |
| --- | --- | --- |
| 6.1 Hardware validation | Record the target printer/device matrix and validate the transport contract when hardware is available. | Target model, paper width, protocol, and physical validation evidence are recorded. |
| 6.2 Printer adapter | Define the application boundary, persisted selected-printer state, native transport seam, and connection/test/retry states. | App code has a small transport boundary with focused state/receipt tests and no WebUSB dependency. |
| 6.3 Print actions | Connect Sale Complete and Sale Details to the printer boundary with English receipt content and failure-safe retry. | Print actions never block, duplicate, void, or roll back a confirmed Sale. |

Confirmed decisions:

- Android only for this app phase.
- Bluetooth thermal printer transport; browser WebUSB is not reused.
- English-only printed receipt; mobile UI remains English/Gujarati/Hindi.
- Standard receipt template; advanced layout customization is deferred.
- Printing is post-confirmation and never part of Sale completion authority.
- Selected printer preference uses MMKV, consistent with the approved storage
  boundary.

External dependency and decision gate:

- The repository does not currently contain a mobile Bluetooth printer native
  dependency or a selected physical printer model. Exact model, paper width,
  Bluetooth protocol, ESC/POS capabilities, Android permissions, and physical
  validation must remain explicit implementation follow-ups. The app-level
  adapter must therefore stay transport-agnostic until that hardware choice
  is supplied; no unsupported native package or protocol will be invented.

Validation safety:

- During Phase 6 and Phase 7, do not run builds, Expo, Android/emulator,
  device-start, live API, share-sheet, or physical hardware commands.
- Use focused boundary/unit tests, TypeScript feedback, and `git diff --check`
  only. Physical printer evidence belongs in the later release gate.

### 6.1 — Hardware validation plan

Plan:

- Define the minimum hardware evidence required: Android version, printer
  model, paper width, Bluetooth transport, pairing behavior, ESC/POS command
  support, English text output, reconnect, and failure recovery.
- Keep the hardware matrix as a documentation gate until a target is chosen.
- Do not modify backend contracts or receipt business data to compensate for
  missing hardware.

Review result: approved to document the gate and continue with the generic
application boundary; physical validation remains pending external hardware.

### 6.2 — Printer adapter plan

Plan:

- Add a small application-level printer state and transport contract separate
  from `buildPosDigitalReceiptText`.
- Persist only a selected printer identifier/name in MMKV; never persist
  secrets or raw credentials.
- Model disconnected, discovering, connecting, connected, testing, printing,
  failed, and retryable states.
- Keep native Bluetooth calls behind an injectable transport seam so focused
  tests do not require Android or a printer.

Acceptance criteria:

1. Receipt content and Bluetooth transport are separate.
2. Printer state transitions cannot mutate Sale state.
3. Invalid persisted printer data falls back safely.
4. Discovery/connect/test/disconnect failures retain retryable feedback.

### 6.3 — Print actions plan

Plan:

- Add print actions to Sale Complete and Sale Details only when a confirmed
  Sale exists.
- Reuse the existing server-Sale receipt text and keep output English-only.
- Keep digital receipt display/share available for every printer state.
- Report print success/failure locally and never re-submit checkout.

Acceptance criteria:

1. Print action consumes the confirmed Sale record only.
2. A failed print keeps the Sale complete and exposes retry.
3. Sale Complete and Sale Details use the same receipt builder.
4. No browser WebUSB or unapproved hardware assumption enters mobile code.

## Phase status

Phase 6 is in progress at 6.1 planning. The hardware model and native
transport remain external validation gates; app-level implementation proceeds
only through the generic, testable boundary described above.
