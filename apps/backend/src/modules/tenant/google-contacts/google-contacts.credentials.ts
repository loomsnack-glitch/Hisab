export type GoogleContactsCredentialBinding = {
  reference: string;
  keyVersion: string;
};

export type GoogleContactsCredentialPayload = {
  refreshToken: string;
  accessToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
};

export type StoreGoogleContactsCredentialInput = {
  organizationId: string;
  ownerKey: string;
  payload: GoogleContactsCredentialPayload;
};

export type RotateGoogleContactsCredentialInput = StoreGoogleContactsCredentialInput & {
  current: GoogleContactsCredentialBinding;
};

/**
 * The application never exposes how Google credentials are encrypted or stored.
 * Implementations return only an opaque reference plus the active key version.
 */
export interface GoogleContactsCredentialVault {
  store(input: StoreGoogleContactsCredentialInput): Promise<GoogleContactsCredentialBinding>;
  resolve(binding: GoogleContactsCredentialBinding): Promise<GoogleContactsCredentialPayload>;
  rotate(input: RotateGoogleContactsCredentialInput): Promise<GoogleContactsCredentialBinding>;
  revoke(binding: GoogleContactsCredentialBinding): Promise<void>;
}

export class GoogleContactsCredentialError extends Error {
  readonly code:
    | "invalid_binding"
    | "invalid_payload"
    | "vault_unavailable"
    | "credential_not_found";

  constructor(
    code: GoogleContactsCredentialError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GoogleContactsCredentialError";
    this.code = code;
  }
}

const MAX_REFERENCE_LENGTH = 255;
const MAX_KEY_VERSION_LENGTH = 64;
const MAX_PAYLOAD_JSON_LENGTH = 16_384;

const normalizeOpaqueValue = (
  value: string,
  label: "reference" | "key version",
  maxLength: number,
): string => {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    /[\r\n]/.test(normalized)
  ) {
    throw new GoogleContactsCredentialError(
      "invalid_binding",
      `Google Contacts credential ${label} is invalid`,
    );
  }
  return normalized;
};

export const normalizeGoogleContactsCredentialBinding = (
  binding: GoogleContactsCredentialBinding,
): GoogleContactsCredentialBinding => ({
  reference: normalizeOpaqueValue(
    binding.reference,
    "reference",
    MAX_REFERENCE_LENGTH,
  ),
  keyVersion: normalizeOpaqueValue(
    binding.keyVersion,
    "key version",
    MAX_KEY_VERSION_LENGTH,
  ),
});

const requireToken = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > 8_192 || /[\r\n]/.test(normalized)) {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      `Google Contacts ${label} is invalid`,
    );
  }
  return normalized;
};

export const assertGoogleContactsCredentialPayload = (
  payload: GoogleContactsCredentialPayload,
): GoogleContactsCredentialPayload => {
  const normalized: GoogleContactsCredentialPayload = {
    refreshToken: requireToken(payload.refreshToken, "refresh token"),
    accessToken: requireToken(payload.accessToken, "access token"),
    expiresAt: payload.expiresAt,
    tokenType: requireToken(payload.tokenType, "token type"),
    scope: requireToken(payload.scope, "scope"),
  };
  if (!Number.isSafeInteger(normalized.expiresAt) || normalized.expiresAt < 0) {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      "Google Contacts credential expiry is invalid",
    );
  }
  return normalized;
};

export const serializeGoogleContactsCredentialPayload = (
  payload: GoogleContactsCredentialPayload,
): string => {
  const serialized = JSON.stringify(assertGoogleContactsCredentialPayload(payload));
  if (serialized.length > MAX_PAYLOAD_JSON_LENGTH) {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      "Google Contacts credential payload is invalid",
    );
  }
  return serialized;
};

export const parseGoogleContactsCredentialPayload = (
  serialized: string,
): GoogleContactsCredentialPayload => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      "Google Contacts credential payload is invalid",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      "Google Contacts credential payload is invalid",
    );
  }
  const value = parsed as Record<string, unknown>;
  if (
    typeof value.refreshToken !== "string" ||
    typeof value.accessToken !== "string" ||
    typeof value.expiresAt !== "number" ||
    typeof value.tokenType !== "string" ||
    typeof value.scope !== "string"
  ) {
    throw new GoogleContactsCredentialError(
      "invalid_payload",
      "Google Contacts credential payload is invalid",
    );
  }
  return assertGoogleContactsCredentialPayload({
    refreshToken: value.refreshToken,
    accessToken: value.accessToken,
    expiresAt: value.expiresAt,
    tokenType: value.tokenType,
    scope: value.scope,
  });
};

export const isGoogleContactsCredentialBinding = (
  value: unknown,
): value is GoogleContactsCredentialBinding => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<GoogleContactsCredentialBinding>;
  return (
    typeof candidate.reference === "string" &&
    typeof candidate.keyVersion === "string" &&
    Boolean(candidate.reference.trim()) &&
    Boolean(candidate.keyVersion.trim())
  );
};
