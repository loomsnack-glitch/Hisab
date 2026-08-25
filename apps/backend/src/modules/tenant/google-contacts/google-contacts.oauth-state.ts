import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_VERSION = "v1";
const STATE_AUDIENCE = "google-contacts-oauth";
const MAX_STATE_BYTES = 4_096;
export const DEFAULT_GOOGLE_CONTACTS_OAUTH_STATE_TTL_MS = 10 * 60 * 1_000;
export const MAX_GOOGLE_CONTACTS_OAUTH_STATE_TTL_MS = 15 * 60 * 1_000;

export type GoogleContactsOAuthStateClaims = {
  version: typeof STATE_VERSION;
  audience: typeof STATE_AUDIENCE;
  organizationId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

export class GoogleContactsOAuthStateError extends Error {
  readonly code:
    | "invalid_configuration"
    | "invalid_state"
    | "state_expired"
    | "state_audience_mismatch"
    | "state_replayed";

  constructor(code: GoogleContactsOAuthStateError["code"], message: string) {
    super(message);
    this.name = "GoogleContactsOAuthStateError";
    this.code = code;
  }
}

type StateClock = () => number;
type StateNonce = () => string;

type CreateGoogleContactsOAuthStateInput = {
  organizationId: string;
  userId: string;
  secret: string;
  ttlMs?: number;
  now?: StateClock;
  nonce?: StateNonce;
};

type VerifyGoogleContactsOAuthStateInput = {
  token: string;
  organizationId: string;
  userId: string;
  secret: string;
  now?: StateClock;
};

export type GoogleContactsOAuthReplayStore = {
  consume: (nonce: string, expiresAt: number) => boolean | Promise<boolean>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noncePattern = /^[A-Za-z0-9_-]{32,128}$/;

const requireSecret = (secret: string): string => {
  const normalized = secret.trim();
  if (normalized.length < 32) {
    throw new GoogleContactsOAuthStateError(
      "invalid_configuration",
      "Google Contacts OAuth state secret is not configured",
    );
  }
  return normalized;
};

const requireUuid = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!uuidPattern.test(normalized)) {
    throw new GoogleContactsOAuthStateError("invalid_state", `${label} is invalid`);
  }
  return normalized;
};

const requireTtl = (ttlMs: number): number => {
  if (
    !Number.isInteger(ttlMs) ||
    ttlMs < 1_000 ||
    ttlMs > MAX_GOOGLE_CONTACTS_OAUTH_STATE_TTL_MS
  ) {
    throw new GoogleContactsOAuthStateError(
      "invalid_configuration",
      "Google Contacts OAuth state TTL is invalid",
    );
  }
  return ttlMs;
};

const requireNow = (now: number): number => {
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state clock is invalid",
    );
  }
  return now;
};

const base64UrlEncode = (value: string | Uint8Array): string =>
  Buffer.from(value).toString("base64url");

const base64UrlDecode = (value: string): Buffer => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state encoding is invalid",
    );
  }
  try {
    return Buffer.from(value, "base64url");
  } catch {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state encoding is invalid",
    );
  }
};

const signatureFor = (encodedClaims: string, secret: string): string =>
  createHmac("sha256", secret).update(encodedClaims).digest("base64url");

const signedState = (
  claims: GoogleContactsOAuthStateClaims,
  secret: string,
): string => {
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  return `${encodedClaims}.${signatureFor(encodedClaims, secret)}`;
};

const parseClaims = (encodedClaims: string): GoogleContactsOAuthStateClaims => {
  const decoded = base64UrlDecode(encodedClaims).toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state is invalid",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state is invalid",
    );
  }
  const value = parsed as Record<string, unknown>;
  const organizationId =
    typeof value.organizationId === "string" ? value.organizationId : "";
  const userId = typeof value.userId === "string" ? value.userId : "";
  const nonce = typeof value.nonce === "string" ? value.nonce : "";
  const issuedAt = typeof value.issuedAt === "number" ? value.issuedAt : NaN;
  const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : NaN;

  if (
    value.version !== STATE_VERSION ||
    value.audience !== STATE_AUDIENCE ||
    !uuidPattern.test(organizationId) ||
    !uuidPattern.test(userId) ||
    !noncePattern.test(nonce) ||
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= issuedAt
  ) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state is invalid",
    );
  }

  return {
    version: STATE_VERSION,
    audience: STATE_AUDIENCE,
    organizationId,
    userId,
    nonce,
    issuedAt,
    expiresAt,
  };
};

export const createGoogleContactsOAuthState = (
  input: CreateGoogleContactsOAuthStateInput,
): { token: string; expiresAt: string } => {
  const organizationId = requireUuid(input.organizationId, "Organization id");
  const userId = requireUuid(input.userId, "User id");
  const secret = requireSecret(input.secret);
  const ttlMs = requireTtl(input.ttlMs ?? DEFAULT_GOOGLE_CONTACTS_OAUTH_STATE_TTL_MS);
  const now = requireNow((input.now ?? Date.now)());
  const nonce = input.nonce?.() ?? randomBytes(32).toString("base64url");
  if (!noncePattern.test(nonce)) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth nonce is invalid",
    );
  }

  const expiresAt = now + ttlMs;
  return {
    token: signedState(
      {
        version: STATE_VERSION,
        audience: STATE_AUDIENCE,
        organizationId,
        userId,
        nonce,
        issuedAt: now,
        expiresAt,
      },
      secret,
    ),
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

export const verifyGoogleContactsOAuthState = (
  input: VerifyGoogleContactsOAuthStateInput,
): GoogleContactsOAuthStateClaims => {
  const organizationId = requireUuid(input.organizationId, "Organization id");
  const userId = requireUuid(input.userId, "User id");
  const secret = requireSecret(input.secret);
  const token = input.token.trim();
  if (token.length > MAX_STATE_BYTES) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state is invalid",
    );
  }
  const parts = token.split(".");
  const encodedClaims = parts[0];
  const encodedSignature = parts[1];
  if (parts.length !== 2 || !encodedClaims || !encodedSignature) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state is invalid",
    );
  }
  const expectedSignature = signatureFor(encodedClaims, secret);
  const actualSignature = base64UrlDecode(encodedSignature);
  const expectedSignatureBytes = Buffer.from(expectedSignature, "base64url");
  if (
    expectedSignatureBytes.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignatureBytes, actualSignature)
  ) {
    throw new GoogleContactsOAuthStateError(
      "invalid_state",
      "Google Contacts OAuth state signature is invalid",
    );
  }

  const claims = parseClaims(encodedClaims);
  const now = requireNow((input.now ?? Date.now)());
  if (claims.expiresAt <= now) {
    throw new GoogleContactsOAuthStateError(
      "state_expired",
      "Google Contacts OAuth state has expired",
    );
  }
  if (claims.organizationId !== organizationId || claims.userId !== userId) {
    throw new GoogleContactsOAuthStateError(
      "state_audience_mismatch",
      "Google Contacts OAuth state does not belong to this user",
    );
  }
  return claims;
};

export const consumeGoogleContactsOAuthState = async (
  input: VerifyGoogleContactsOAuthStateInput,
  replayStore: GoogleContactsOAuthReplayStore,
): Promise<GoogleContactsOAuthStateClaims> => {
  const claims = verifyGoogleContactsOAuthState(input);
  if (!(await replayStore.consume(claims.nonce, claims.expiresAt))) {
    throw new GoogleContactsOAuthStateError(
      "state_replayed",
      "Google Contacts OAuth state has already been used",
    );
  }
  return claims;
};
