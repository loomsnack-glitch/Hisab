import { beforeEach, describe, expect, mock, test, type Mock } from "bun:test";

type PgMock = Mock<(...args: unknown[]) => Promise<unknown[]>> & {
  begin: <T>(callback: (tx: PgMock) => Promise<T>) => Promise<T>;
};

const query = mock(async (..._args: unknown[]) => []) as unknown as PgMock;
query.begin = async callback => callback(query);

mock.module("@/config/db", () => ({ pg: query }));

const { listPromotionRecipients } = await import("./whatsapp.repository?promotion-recipients-test");

describe("promotion recipient delivery details", () => {
  beforeEach(() => query.mockClear());

  test("returns every delivery outcome and limits actions to safe failed states", async () => {
    query.mockImplementationOnce(async () => [
      { id: "sent-1", customer_name: "Asha", phone_number: "+919876543210", status: "sent", delivery_status: "delivered", failure_code: null, failure_message: null, updated_at: "2026-08-24T10:00:00.000Z", outbox_status: "sent", cloud_template_snapshot: null },
      { id: "retry-1", customer_name: "Bina", phone_number: "+919876543211", status: "retryable", delivery_status: "failed", failure_code: "timeout", failure_message: "Provider timed out", updated_at: "2026-08-24T10:01:00.000Z", outbox_status: "retryable", cloud_template_snapshot: null },
      { id: "failed-1", customer_name: "Chirag", phone_number: "+919876543212", status: "dead_letter", delivery_status: "failed", failure_code: "132000", failure_message: "Parameter count mismatch", updated_at: "2026-08-24T10:02:00.000Z", outbox_status: "dead_letter", cloud_template_snapshot: { bindingId: "binding-1" } },
      { id: "engagement-1", customer_name: "Esha", phone_number: "+919876543214", status: "dead_letter", delivery_status: "failed", failure_code: "131049", failure_message: "This message was not delivered to maintain healthy ecosystem engagement.", updated_at: new Date(Date.now() - 60_000).toISOString(), outbox_status: "dead_letter", cloud_template_snapshot: { bindingId: "binding-2" } },
      { id: "queued-1", customer_name: "Diya", phone_number: "+919876543213", status: "pending", delivery_status: "queued", failure_code: null, failure_message: null, updated_at: "2026-08-24T10:03:00.000Z", outbox_status: "pending", cloud_template_snapshot: null },
    ]);

    await expect(listPromotionRecipients("org-1", "store-1", "campaign-1", "all")).resolves.toEqual([
      expect.objectContaining({ id: "sent-1", status: "sent", deliveryStatus: "delivered", canRetry: false, canResend: false }),
      expect.objectContaining({ id: "retry-1", status: "retryable", deliveryStatus: "failed", failureCode: "timeout", canRetry: true, canResend: false }),
      expect.objectContaining({ id: "failed-1", status: "dead_letter", deliveryStatus: "failed", failureCode: "132000", canRetry: false, canResend: true }),
      expect.objectContaining({ id: "engagement-1", status: "dead_letter", failureCode: "131049", canRetry: false, canResend: false, resendAvailableAt: expect.any(String) }),
      expect.objectContaining({ id: "queued-1", status: "pending", deliveryStatus: "queued", canRetry: false, canResend: false }),
    ]);

    const sql = String((query.mock.calls[0]?.[0] as TemplateStringsArray | undefined)?.join("?"));
    expect(sql).toContain("? = 'all'");
    expect(sql).toContain("recipient.status IN ('retryable', 'dead_letter', 'cancelled')");
  });
});
