import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import {
  getWhatsAppStorePolicy,
  resendWhatsAppInvoice,
  setWhatsAppStorePolicy,
} from "./whatsapp.service";

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

describe("Store WhatsApp policy service", () => {
  const originalGet = api.get;
  const originalPatch = api.patch;

  afterEach(() => {
    api.get = originalGet;
    api.patch = originalPatch;
  });

  test("reads the Store policy through the tenant policy endpoint", async () => {
    let requestUrl = "";
    api.get = (async (url: string) => {
      requestUrl = url;
      return { data: { status: "success", data: null } };
    }) as typeof api.get;

    await getWhatsAppStorePolicy("org-id", "store-id");

    expect(requestUrl).toBe("/organizations/org-id/stores/store-id/whatsapp/policy");
  });

  test("updates the Store policy through the tenant policy endpoint", async () => {
    let request: { url?: string; body?: unknown } = {};
    api.patch = (async (url: string, body: unknown) => {
      request = { url, body };
      return { data: { status: "success", data: null } };
    }) as typeof api.patch;

    await setWhatsAppStorePolicy("org-id", "store-id", {
      mode: "ganatri_utility",
    });

    expect(request.url).toBe("/organizations/org-id/stores/store-id/whatsapp/policy");
    expect(request.body).toEqual({ mode: "ganatri_utility" });
  });
});
