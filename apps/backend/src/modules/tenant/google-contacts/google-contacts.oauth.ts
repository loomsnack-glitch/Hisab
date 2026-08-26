import type { GoogleContactsCredentialPayload } from "./google-contacts.credentials";

export const GOOGLE_CONTACTS_WRITE_SCOPE =
  "https://www.googleapis.com/auth/contacts";
export const GOOGLE_USERINFO_EMAIL_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";
export const GOOGLE_CONTACTS_OAUTH_SCOPES = [
  GOOGLE_CONTACTS_WRITE_SCOPE,
  GOOGLE_USERINFO_EMAIL_SCOPE,
] as const;
export const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v3/userinfo";

export type GoogleAccountIdentity = {
  subject: string;
  email: string;
};

export type GoogleContactsAuthorizationPrompt = {
  prompt?: string;
};

export type GoogleOAuthProvider = {
  buildAuthorizationUrl: (
    state: string,
    options?: GoogleContactsAuthorizationPrompt,
  ) => string;
  exchangeAuthorizationCode: (code: string) => Promise<GoogleContactsCredentialPayload>;
  refreshAccessToken: (
    refreshToken: string,
  ) => Promise<GoogleContactsCredentialPayload>;
  getAccountIdentity: (accessToken: string) => Promise<GoogleAccountIdentity>;
  revokeAuthorization: (token: string) => Promise<void>;
};

export class GoogleContactsOAuthError extends Error {
  readonly code:
    | "invalid_configuration"
    | "exchange_failed"
    | "authorization_denied"
    | "authorization_revoked"
    | "invalid_provider_token"
    | "identity_unavailable";

  constructor(
    code: GoogleContactsOAuthError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GoogleContactsOAuthError";
    this.code = code;
  }
}

const requiredConfig = (name: string): string => {
  const value = process.env[name]?.trim() ?? "";
  if (!value || /[\r\n]/.test(value)) {
    throw new GoogleContactsOAuthError(
      "invalid_configuration",
      "Google Contacts OAuth is not configured",
    );
  }
  return value;
};

const requireToken = (value: unknown, label: string): string => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 8_192 ||
    /[\r\n]/.test(value)
  ) {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      `Google Contacts ${label} is invalid`,
    );
  }
  return value.trim();
};

const requireExpiresIn = (value: unknown): number => {
  const expiresIn = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > 86_400) {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      "Google Contacts access token expiry is invalid",
    );
  }
  return Math.trunc(expiresIn);
};

export const googleContactsOAuthConfig = () => ({
  clientId: requiredConfig("GOOGLE_CONTACTS_CLIENT_ID"),
  clientSecret: requiredConfig("GOOGLE_CONTACTS_CLIENT_SECRET"),
  redirectUri: requiredConfig("GOOGLE_CONTACTS_OAUTH_REDIRECT_URI"),
});

export const buildGoogleContactsAuthorizationUrl = (
  state: string,
  config: { clientId: string; redirectUri: string } = {
    clientId: requiredConfig("GOOGLE_CONTACTS_CLIENT_ID"),
    redirectUri: requiredConfig("GOOGLE_CONTACTS_OAUTH_REDIRECT_URI"),
  },
  options?: GoogleContactsAuthorizationPrompt,
): string => {
  const normalizedState = state.trim();
  if (!normalizedState || normalizedState.length > 4_096) {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      "Google Contacts OAuth state is invalid",
    );
  }
  const prompt = options?.prompt?.trim() || "consent";
  if (prompt.length > 128 || /[\r\n]/.test(prompt)) {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      "Google Contacts OAuth prompt is invalid",
    );
  }
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CONTACTS_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("state", normalizedState);
  return url.toString();
};

const parseTokenResponse = (
  value: unknown,
  now: number,
  previousRefreshToken?: string,
): GoogleContactsCredentialPayload => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      "Google Contacts provider token is invalid",
    );
  }
  const token = value as Record<string, unknown>;
  const refreshToken =
    typeof token.refresh_token === "string" && token.refresh_token.trim()
      ? requireToken(token.refresh_token, "refresh token")
      : previousRefreshToken
        ? requireToken(previousRefreshToken, "refresh token")
        : requireToken(token.refresh_token, "refresh token");
  return {
    accessToken: requireToken(token.access_token, "access token"),
    refreshToken,
    tokenType: requireToken(token.token_type ?? "Bearer", "token type"),
    scope: requireToken(
      token.scope ?? GOOGLE_CONTACTS_WRITE_SCOPE,
      "scope",
    ),
    expiresAt: now + requireExpiresIn(token.expires_in) * 1_000,
  };
};

const parseIdentity = (value: unknown): GoogleAccountIdentity => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoogleContactsOAuthError(
      "identity_unavailable",
      "Google account identity is unavailable",
    );
  }
  const identity = value as Record<string, unknown>;
  const subject =
    typeof identity.sub === "string" ? identity.sub.trim() : "";
  const email =
    typeof identity.email === "string" ? identity.email.trim().toLowerCase() : "";
  if (!subject || subject.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new GoogleContactsOAuthError(
      "identity_unavailable",
      "Google account identity is unavailable",
    );
  }
  return { subject, email };
};

const postForm = async (
  url: string,
  body: URLSearchParams,
  clientError: "exchange_failed" | "authorization_revoked" = "exchange_failed",
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw new GoogleContactsOAuthError(
      "exchange_failed",
      "Google Contacts authorization exchange failed",
    );
  }
  if (!response.ok) {
    if (
      clientError === "authorization_revoked" &&
      (response.status === 400 || response.status === 401)
    ) {
      throw new GoogleContactsOAuthError(
        "authorization_revoked",
        "Google Contacts authorization is no longer valid",
      );
    }
    throw new GoogleContactsOAuthError(
      "exchange_failed",
      "Google Contacts authorization exchange failed",
    );
  }
  try {
    return await response.json();
  } catch {
    throw new GoogleContactsOAuthError(
      "invalid_provider_token",
      "Google Contacts provider token is invalid",
    );
  }
};

const getJson = async (url: string, accessToken: string): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new GoogleContactsOAuthError(
      "identity_unavailable",
      "Google account identity is unavailable",
    );
  }
  if (!response.ok) {
    throw new GoogleContactsOAuthError(
      "identity_unavailable",
      "Google account identity is unavailable",
    );
  }
  try {
    return await response.json();
  } catch {
    throw new GoogleContactsOAuthError(
      "identity_unavailable",
      "Google account identity is unavailable",
    );
  }
};

export const createGoogleOAuthProvider = (
  fetchNow: () => number = Date.now,
): GoogleOAuthProvider => ({
  buildAuthorizationUrl: (state, options) => {
    const config = googleContactsOAuthConfig();
    return buildGoogleContactsAuthorizationUrl(
      state,
      { clientId: config.clientId, redirectUri: config.redirectUri },
      options,
    );
  },
  exchangeAuthorizationCode: async (code) => {
    const config = googleContactsOAuthConfig();
    const authorizationCode = requireToken(code, "authorization code");
    const body = new URLSearchParams({
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    return parseTokenResponse(await postForm(GOOGLE_TOKEN_ENDPOINT, body), fetchNow());
  },
  refreshAccessToken: async (refreshToken) => {
    const config = googleContactsOAuthConfig();
    const token = requireToken(refreshToken, "refresh token");
    const body = new URLSearchParams({
      refresh_token: token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    });
    return parseTokenResponse(await postForm(GOOGLE_TOKEN_ENDPOINT, body, "authorization_revoked"), fetchNow(), token);
  },
  getAccountIdentity: async (accessToken) =>
    parseIdentity(await getJson(GOOGLE_USERINFO_ENDPOINT, requireToken(accessToken, "access token"))),
  revokeAuthorization: async (token) => {
    const value = requireToken(token, "refresh token");
    try {
      await fetch(GOOGLE_REVOKE_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: value }),
      });
    } catch {
      // Local disconnect and replacement must succeed even if Google is unreachable.
    }
  },
});

export const parseGoogleContactsTokenResponseForTest = parseTokenResponse;
export const parseGoogleAccountIdentityForTest = parseIdentity;
