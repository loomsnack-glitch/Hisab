import { describe, expect, test } from "bun:test";
import {
  WhatsAppCloudApiClient,
  WhatsAppCloudApiError,
} from "./cloud-api.client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("WhatsAppCloudApiClient", () => {
  test("adds the version and bearer token without exposing the token to callers", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      baseUrl: "https://graph.example.test",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse({ id: "waba-1" });
      },
    });

    await expect(client.getBusinessAccount("waba-1")).resolves.toEqual({
      id: "waba-1",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.example.test/v26.0/waba-1");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe(
      "Bearer test-secret-token",
    );
  });

  test("maps Graph API errors and only retries transient HTTP statuses", async () => {
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      fetchImpl: async () =>
        jsonResponse(
          {
            error: {
              message: "Template is not approved",
              type: "OAuthException",
              code: 100,
              error_subcode: 33,
              fbtrace_id: "trace-1",
            },
          },
          400,
        ),
    });

    const error = await client.getTemplates("waba-1").catch((value) => value);
    expect(error).toBeInstanceOf(WhatsAppCloudApiError);
    expect(error).toMatchObject({
      status: 400,
      providerCode: "100",
      providerSubcode: "33",
      providerType: "OAuthException",
      fbtraceId: "trace-1",
      retryable: false,
    });
    expect(error.message).toBe("Template is not approved");
  });

  test("follows same-origin Graph pagination for template discovery", async () => {
    const calls: string[] = [];
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      baseUrl: "https://graph.example.test",
      fetchImpl: async url => {
        const value = String(url);
        calls.push(value);
        return calls.length === 1
          ? jsonResponse({
              data: [{ id: "template-1" }],
              paging: { next: "https://graph.example.test/v26.0/waba-1/message_templates?after=cursor-1" },
            })
          : jsonResponse({ data: [{ id: "template-2" }] });
      },
    });

    await expect(client.getTemplates("waba-1")).resolves.toEqual({
      data: [{ id: "template-1" }, { id: "template-2" }],
    });
    expect(calls).toEqual([
      "https://graph.example.test/v26.0/waba-1/message_templates",
      "https://graph.example.test/v26.0/waba-1/message_templates?after=cursor-1",
    ]);
  });

  test("marks rate limits as retryable", async () => {
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      fetchImpl: async () =>
        jsonResponse(
          { error: { message: "Too many requests", code: 429 } },
          429,
        ),
    });

    await expect(
      client.sendMessage("phone-1", { type: "text" }),
    ).rejects.toMatchObject({
      status: 429,
      retryable: true,
    });
  });

  test("recognizes a provider rate-limit code on a definitive error response", async () => {
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      fetchImpl: async () =>
        jsonResponse(
          { error: { message: "Rate limit hit", code: 130429 } },
          400,
        ),
    });

    await expect(
      client.sendMessage("phone-1", { type: "text" }),
    ).rejects.toMatchObject({
      status: 400,
      providerCode: "130429",
      retryable: true,
    });
  });

  test("converts network failures and timeouts into retryable errors", async () => {
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      timeoutMs: 5,
      fetchImpl: async (_url, init) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (init?.signal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        return jsonResponse({});
      },
    });

    await expect(client.getPhoneNumbers("waba-1")).rejects.toMatchObject({
      message: "WhatsApp Cloud API request timed out",
      retryable: true,
    });
  });

  test("marks a timed-out message submission as uncertain", async () => {
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      timeoutMs: 5,
      fetchImpl: async (_url, init) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (init?.signal?.aborted)
          throw new DOMException("Aborted", "AbortError");
        return jsonResponse({});
      },
    });

    await expect(
      client.sendMessage("phone-1", { type: "text", body: "Hello" }),
    ).rejects.toMatchObject({ uncertain: true, retryable: true });
  });

  test("uploads private media as multipart without exposing the token in the body", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = new WhatsAppCloudApiClient({
      accessToken: "test-secret-token",
      graphVersion: "v26.0",
      baseUrl: "https://graph.example.test",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse({ id: "media-1" });
      },
    });

    await expect(
      client.uploadMedia("9876543210", {
        body: new TextEncoder().encode("pdf-bytes"),
        mimeType: "application/pdf",
        fileName: "invoice.pdf",
      }),
    ).resolves.toEqual({ id: "media-1" });
    expect(calls[0]?.url).toBe(
      "https://graph.example.test/v26.0/9876543210/media",
    );
    expect(calls[0]?.init?.headers).toEqual({
      Authorization: "Bearer test-secret-token",
    });
    expect(String(calls[0]?.init?.body)).not.toContain("test-secret-token");
  });
});
