import { describe, expect, test } from "bun:test";
import {
  getWhatsAppPlatformConfigHealth,
  readWhatsAppPlatformConfig,
  requireWhatsAppPlatformConfig,
  WhatsAppPlatformConfigurationError,
} from "./whatsapp-platform-config";

const validEnvironment = (): Record<string, string> => ({
  WHATSAPP_PLATFORM_PHONE_NUMBER_ID: "123456789012345",
  WHATSAPP_PLATFORM_ACCESS_TOKEN: "platform-secret-token",
  WHATSAPP_PLATFORM_WABA_ID: "987654321098765",
  WHATSAPP_PLATFORM_GRAPH_BASE_URL: "https://graph.facebook.com",
  WHATSAPP_PLATFORM_GRAPH_VERSION: "v26.0",
  WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME: "ganatri_bill",
  WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME: "ganatri_due",
  WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE: "en_US",
});

describe("WhatsApp platform configuration", () => {
  test("fails closed when required configuration is absent", () => {
    const result = readWhatsAppPlatformConfig({});

    expect(result).toEqual({
      status: "incomplete",
      missing: [
        "WHATSAPP_PLATFORM_PHONE_NUMBER_ID",
        "WHATSAPP_PLATFORM_ACCESS_TOKEN",
        "WHATSAPP_PLATFORM_WABA_ID",
        "WHATSAPP_PLATFORM_GRAPH_VERSION",
        "WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE",
        "WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME",
        "WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME",
      ],
      invalid: [],
    });
  });

  test("validates explicit configuration and builds the Graph messages URL", () => {
    const result = readWhatsAppPlatformConfig(validEnvironment());

    expect(result).toEqual({
      status: "configured",
      config: {
        phoneNumberId: "123456789012345",
        accessToken: "platform-secret-token",
        wabaId: "987654321098765",
        graphBaseUrl: "https://graph.facebook.com",
        graphVersion: "v26.0",
        apiUrl: "https://graph.facebook.com/v26.0/123456789012345/messages",
        templateLanguage: "en_US",
        billTemplateName: "ganatri_bill",
        dueTemplateName: "ganatri_due",
      },
    });
  });

  test("supports the legacy API URL/token only as a compatibility fallback", () => {
    const result = readWhatsAppPlatformConfig({
      WHATSAPP_API_URL: "https://graph.facebook.com/v22.0/123456789012345/messages",
      WHATSAPP_API_TOKEN: "legacy-secret-token",
      WHATSAPP_PLATFORM_WABA_ID: "987654321098765",
      WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME: "ganatri_bill",
      WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME: "ganatri_due",
      WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE: "en_US",
    });

    expect(result.status).toBe("configured");
    if (result.status === "configured") {
      expect(result.config.phoneNumberId).toBe("123456789012345");
      expect(result.config.graphVersion).toBe("v22.0");
      expect(result.config.accessToken).toBe("legacy-secret-token");
    }
  });

  test("rejects malformed identifiers, endpoint, version, language, and templates", () => {
    const result = readWhatsAppPlatformConfig({
      WHATSAPP_PLATFORM_PHONE_NUMBER_ID: "phone",
      WHATSAPP_PLATFORM_ACCESS_TOKEN: "short",
      WHATSAPP_PLATFORM_WABA_ID: "waba",
      WHATSAPP_PLATFORM_GRAPH_BASE_URL: "http://graph.facebook.com/api",
      WHATSAPP_PLATFORM_GRAPH_VERSION: "latest",
      WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE: "english",
      WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME: "Ganatri Bill",
      WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME: "ganatri-due",
    });

    expect(result).toEqual({
      status: "incomplete",
      missing: [],
      invalid: [
        "WHATSAPP_PLATFORM_PHONE_NUMBER_ID",
        "WHATSAPP_PLATFORM_ACCESS_TOKEN",
        "WHATSAPP_PLATFORM_WABA_ID",
        "WHATSAPP_PLATFORM_GRAPH_BASE_URL",
        "WHATSAPP_PLATFORM_GRAPH_VERSION",
        "WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE",
        "WHATSAPP_PLATFORM_BILL_TEMPLATE_NAME",
        "WHATSAPP_PLATFORM_DUE_TEMPLATE_NAME",
      ],
    });
  });

  test("health metadata never includes the token or raw environment", () => {
    const environment = validEnvironment();
    const health = getWhatsAppPlatformConfigHealth(environment);

    expect(health).not.toHaveProperty("accessToken");
    expect(JSON.stringify(health)).not.toContain(environment.WHATSAPP_PLATFORM_ACCESS_TOKEN);
    expect(JSON.stringify(health)).not.toContain("WHATSAPP_PLATFORM_ACCESS_TOKEN");
  });

  test("throws a safe error for a sender that tries to start incomplete", () => {
    try {
      requireWhatsAppPlatformConfig({ WHATSAPP_PLATFORM_ACCESS_TOKEN: "secret-token" });
      throw new Error("expected configuration to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(WhatsAppPlatformConfigurationError);
      expect((error as Error).message).toBe("Ganatri WhatsApp platform sender is not configured");
      expect((error as Error).message).not.toContain("secret-token");
    }
  });
});
