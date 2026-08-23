import { describe, expect, test } from "bun:test";
import { createCloudAuthorizationCodeExchange } from "./cloud-provider";

describe("WhatsApp Cloud provider exchange", () => {
  test("keeps app credentials server-side and returns only the provider token", async () => {
    const previous = {
      version: process.env.WHATSAPP_CLOUD_GRAPH_VERSION,
      appId: process.env.WHATSAPP_CLOUD_APP_ID,
      appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET,
    };
    process.env.WHATSAPP_CLOUD_GRAPH_VERSION = "v26.0";
    process.env.WHATSAPP_CLOUD_APP_ID = "app-id";
    process.env.WHATSAPP_CLOUD_APP_SECRET = "app-secret";
    let requestedUrl = "";
    try {
      const exchange = createCloudAuthorizationCodeExchange(async (input) => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({ access_token: "server-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });
      await expect(exchange.exchange("authorization-code")).resolves.toBe(
        "server-token",
      );
      expect(requestedUrl).toContain("client_id=app-id");
      expect(requestedUrl).toContain("code=authorization-code");
      expect(requestedUrl).not.toContain("server-token");
    } finally {
      process.env.WHATSAPP_CLOUD_GRAPH_VERSION = previous.version;
      process.env.WHATSAPP_CLOUD_APP_ID = previous.appId;
      process.env.WHATSAPP_CLOUD_APP_SECRET = previous.appSecret;
    }
  });
});
