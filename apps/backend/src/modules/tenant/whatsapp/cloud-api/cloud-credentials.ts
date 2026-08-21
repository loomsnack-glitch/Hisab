export type CloudCredentialBinding = {
  reference: string;
  keyVersion: string;
};

export type StoreCloudCredentialInput = {
  organizationId: string;
  ownerKey: string;
  accessToken: string;
};

export type RotateCloudCredentialInput = StoreCloudCredentialInput & {
  current: CloudCredentialBinding;
};

/**
 * The application never chooses how a Cloud token is encrypted or stored.
 * Production implementations should use the configured secret manager and
 * return only an opaque reference plus the active key version.
 */
export interface WhatsAppCloudCredentialVault {
  store(input: StoreCloudCredentialInput): Promise<CloudCredentialBinding>;
  resolve(binding: CloudCredentialBinding): Promise<string>;
  rotate(input: RotateCloudCredentialInput): Promise<CloudCredentialBinding>;
  revoke(binding: CloudCredentialBinding): Promise<void>;
}

export class CloudCredentialError extends Error {
  readonly code:
    | "invalid_binding"
    | "invalid_token"
    | "vault_unavailable"
    | "credential_not_found";

  constructor(
    code: CloudCredentialError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CloudCredentialError";
    this.code = code;
  }
}

const MAX_REFERENCE_LENGTH = 255;
const MAX_KEY_VERSION_LENGTH = 64;

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
    throw new CloudCredentialError(
      "invalid_binding",
      `WhatsApp Cloud credential ${label} is invalid`,
    );
  }
  return normalized;
};

export const normalizeCloudCredentialBinding = (
  binding: CloudCredentialBinding,
): CloudCredentialBinding => ({
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

export const assertCloudAccessToken = (accessToken: string): string => {
  const normalized = accessToken.trim();
  if (!normalized || normalized.length > 4_096 || /[\r\n]/.test(normalized)) {
    throw new CloudCredentialError(
      "invalid_token",
      "WhatsApp Cloud access token is invalid",
    );
  }
  return normalized;
};

export const isCloudCredentialBinding = (
  value: unknown,
): value is CloudCredentialBinding => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<CloudCredentialBinding>;
  return (
    typeof candidate.reference === "string" &&
    typeof candidate.keyVersion === "string" &&
    Boolean(candidate.reference.trim()) &&
    Boolean(candidate.keyVersion.trim())
  );
};
