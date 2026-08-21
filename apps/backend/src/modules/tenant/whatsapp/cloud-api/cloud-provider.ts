import {
  CloudOnboardingExchangeError,
  type CloudOnboardingTokenExchange,
} from "./cloud-onboarding-exchange";
import { WhatsAppCloudApiClient } from "./cloud-api.client";

export type CloudProviderFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const graphBaseUrl = (): string =>
  (process.env.WHATSAPP_CLOUD_GRAPH_BASE_URL?.trim() ||
    "https://graph.facebook.com").replace(/\/+$/, "");

const graphVersion = (): string => {
  const value = (process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "").replace(
    /^v/i,
    "v",
  );
  if (!/^v\d+\.\d+$/.test(value)) {
    throw new CloudOnboardingExchangeError(
      "exchange_failed",
      "WhatsApp Cloud Graph API version is not configured",
    );
  }
  return value;
};

const requiredConfig = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new CloudOnboardingExchangeError(
      "exchange_failed",
      "WhatsApp Cloud onboarding provider is not configured",
    );
  }
  return value;
};

const providerToken = (body: unknown): string => {
  if (!body || typeof body !== "object") throw new Error("invalid token body");
  const value = (body as { access_token?: unknown }).access_token;
  if (typeof value !== "string" || !value.trim() || value.length > 8_192) {
    throw new Error("invalid token");
  }
  return value.trim();
};

export const createCloudAuthorizationCodeExchange = (
  fetchImpl: CloudProviderFetch = (input, init) => fetch(input, init),
): CloudOnboardingTokenExchange => ({
  exchange: async (authorizationCode) => {
    const url = new URL(
      `${graphBaseUrl()}/${graphVersion()}/oauth/access_token`,
    );
    url.searchParams.set("client_id", requiredConfig("WHATSAPP_CLOUD_APP_ID"));
    url.searchParams.set(
      "client_secret",
      requiredConfig("WHATSAPP_CLOUD_APP_SECRET"),
    );
    url.searchParams.set("code", authorizationCode);

    let response: Response;
    let body: unknown;
    try {
      response = await fetchImpl(url, { method: "GET" });
      const text = await response.text();
      body = text.trim() ? JSON.parse(text) : undefined;
    } catch (error) {
      throw new CloudOnboardingExchangeError(
        "exchange_failed",
        "WhatsApp Cloud authorization exchange failed",
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new CloudOnboardingExchangeError(
        "exchange_failed",
        "WhatsApp Cloud authorization exchange was rejected",
      );
    }
    try {
      return providerToken(body);
    } catch {
      throw new CloudOnboardingExchangeError(
        "invalid_provider_token",
        "WhatsApp Cloud provider token is invalid",
      );
    }
  },
});

export const createConfiguredCloudClient = (accessToken: string) => {
  return new WhatsAppCloudApiClient({
    accessToken,
    graphVersion: graphVersion(),
    baseUrl: graphBaseUrl(),
  });
};
