# Move WhatsApp conversation view to Admin

Status: resolved

Type: task

## Question

How should the real WhatsApp conversation view currently exposed from POS be placed in the Admin WhatsApp workspace without affecting sending?

## Answer

Use the existing authenticated Admin tenant conversation interface as the single reusable view. Add it as the `Message history` workspace tab with the current Store selector, keep its polling, attachments, delivery status, and customer-linking behavior, remove only the POS conversation route/UI, and retain POS account status/connection and message-sending capabilities. Preserve old Admin and POS URLs with safe redirects. No migration is needed because this is a presentation and routing change over existing conversation records.

## Comments

- The current user request supersedes older placement guidance that kept the inbox in POS.
- Exact template reconstruction is not part of this ticket; the existing message DTO and rendered body/template label remain the source of truth.
- Implemented and verified on 2026-08-30. No migration or backend sending change was required.
