import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import { resendWhatsAppInvoice } from "./whatsapp.service";

describe("WhatsApp invoice resend service", () => {
  const originalPost = api.post;

  afterEach(() => {
    api.post = originalPost;
  });

  test("calls the dedicated resend endpoint with a request id", async () => {
    let request: { url?: string; body?: unknown } = {};
    api.post = (async (url: string, body: unknown) => {
      request = { url, body };
      return { data: { status: "success", data: null } };
    }) as typeof api.post;

    await resendWhatsAppInvoice("org-id", "store-id", "sale-id");

    expect(request.url).toBe(
      "/organizations/org-id/stores/store-id/whatsapp/invoice/sale-id/resend",
    );
    expect(request.body).toEqual({ requestId: expect.any(String) });
  });
});
