import { describe, expect, test } from "bun:test";
import {
  META_HEALTHY_ENGAGEMENT_RESEND_COOLDOWN_MS,
  promotionRecipientResendAvailableAt,
  promotionRecipientResendIsBlocked,
} from "./promotion-recipient-actions";

describe("promotion recipient resend cooldown", () => {
  test("blocks Meta healthy-engagement failures for 24 hours", () => {
    const failedAt = "2026-08-24T10:00:00.000Z";
    const now = new Date(failedAt).getTime() + META_HEALTHY_ENGAGEMENT_RESEND_COOLDOWN_MS - 1;

    expect(promotionRecipientResendAvailableAt("131049", failedAt)).toBe("2026-08-25T10:00:00.000Z");
    expect(promotionRecipientResendIsBlocked("131049", failedAt, now)).toBe(true);
    expect(promotionRecipientResendIsBlocked("131049", failedAt, now + 1)).toBe(false);
  });

  test("does not delay other failure codes", () => {
    expect(promotionRecipientResendAvailableAt("132000", "2026-08-24T10:00:00.000Z")).toBeNull();
    expect(promotionRecipientResendIsBlocked("132000", "2026-08-24T10:00:00.000Z", Date.now())).toBe(false);
  });
});
