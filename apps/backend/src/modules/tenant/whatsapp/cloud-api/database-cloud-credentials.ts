import { randomUUID } from "node:crypto";
import { pg } from "@/config/db";
import {
  assertCloudAccessToken,
  CloudCredentialError,
  normalizeCloudCredentialBinding,
  type CloudCredentialBinding,
  type RotateCloudCredentialInput,
  type StoreCloudCredentialInput,
  type WhatsAppCloudCredentialVault,
} from "./cloud-credentials";

const REFERENCE_PREFIX = "db-secret:";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (value: Uint8Array): string => Buffer.from(value).toString("base64");
const fromBase64 = (value: string): Uint8Array => new Uint8Array(Buffer.from(value, "base64"));
const asArrayBuffer = (value: Uint8Array): ArrayBuffer => value.buffer as ArrayBuffer;

const activeKeyVersion = (): string => {
  const version = process.env.WHATSAPP_CLOUD_CREDENTIAL_ACTIVE_KEY_VERSION?.trim();
  if (!version || /[\r\n]/.test(version) || version.length > 64) {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential key version is not configured");
  }
  return version;
};

const keyring = (): Map<string, Uint8Array> => {
  const raw = process.env.WHATSAPP_CLOUD_CREDENTIAL_KEYS_JSON?.trim();
  if (!raw) throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential keys are not configured");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential keys are invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential keys are invalid");
  }
  const entries = new Map<string, Uint8Array>();
  for (const [version, encoded] of Object.entries(parsed)) {
    if (!version || version.length > 64 || typeof encoded !== "string") {
      throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential keys are invalid");
    }
    const key = fromBase64(encoded);
    if (key.length !== KEY_BYTES) {
      throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential keys are invalid");
    }
    entries.set(version, key);
  }
  if (!entries.has(activeKeyVersion())) {
    throw new CloudCredentialError("vault_unavailable", "Active WhatsApp Cloud credential key is unavailable");
  }
  return entries;
};

const importKey = async (rawKey: Uint8Array): Promise<CryptoKey> => crypto.subtle.importKey(
  "raw",
  asArrayBuffer(rawKey),
  { name: "AES-GCM" },
  false,
  ["encrypt", "decrypt"],
);

export const encryptCloudCredentialToken = async (
  token: string,
  rawKey: Uint8Array,
): Promise<string> => {
  if (rawKey.length !== KEY_BYTES) throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud encryption key is invalid");
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    await importKey(rawKey),
    asArrayBuffer(textEncoder.encode(assertCloudAccessToken(token))),
  );
  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
};

export const decryptCloudCredentialToken = async (
  encryptedToken: string,
  rawKey: Uint8Array,
): Promise<string> => {
  const [ivPart, cipherPart] = encryptedToken.split(":");
  if (!ivPart || !cipherPart || rawKey.length !== KEY_BYTES) {
    throw new CloudCredentialError("credential_not_found", "WhatsApp Cloud credential could not be decrypted");
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(fromBase64(ivPart)) },
      await importKey(rawKey),
      asArrayBuffer(fromBase64(cipherPart)),
    );
    return assertCloudAccessToken(textDecoder.decode(decrypted));
  } catch {
    throw new CloudCredentialError("credential_not_found", "WhatsApp Cloud credential could not be decrypted");
  }
};

const normalizeOwnerKey = (ownerKey: string): string => {
  const normalized = ownerKey.trim();
  if (!normalized || normalized.length > 255 || /[\r\n]/.test(normalized)) {
    throw new CloudCredentialError("invalid_binding", "WhatsApp Cloud credential owner is invalid");
  }
  return normalized;
};

const referenceId = (reference: string): string => {
  const normalized = normalizeCloudCredentialBinding({ reference, keyVersion: "v" }).reference;
  const id = normalized.slice(REFERENCE_PREFIX.length);
  if (!normalized.startsWith(REFERENCE_PREFIX) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new CloudCredentialError("invalid_binding", "WhatsApp Cloud credential reference is invalid");
  }
  return id;
};

const bindingFor = (id: string, keyVersion: string): CloudCredentialBinding => ({
  reference: `${REFERENCE_PREFIX}${id}`,
  keyVersion,
});

const store = async (input: StoreCloudCredentialInput): Promise<CloudCredentialBinding> => {
  const keys = keyring();
  const version = activeKeyVersion();
  const id = randomUUID();
  const encryptedToken = await encryptCloudCredentialToken(input.accessToken, keys.get(version)!);
  await pg`
    INSERT INTO whatsapp_cloud_credentials (
      id, organization_id, owner_key, encrypted_token, key_version
    ) VALUES (
      ${id}, ${input.organizationId}, ${normalizeOwnerKey(input.ownerKey)}, ${encryptedToken}, ${version}
    )
  `;
  return bindingFor(id, version);
};

const resolve = async (binding: CloudCredentialBinding): Promise<string> => {
  const normalized = normalizeCloudCredentialBinding(binding);
  const [row] = await pg`
    SELECT encrypted_token, key_version
    FROM whatsapp_cloud_credentials
    WHERE id = ${referenceId(normalized.reference)}
      AND revoked_at IS NULL
  `;
  if (!row || String(row.key_version) !== normalized.keyVersion) {
    throw new CloudCredentialError("credential_not_found", "WhatsApp Cloud credential is unavailable");
  }
  const key = keyring().get(normalized.keyVersion);
  if (!key) throw new CloudCredentialError("vault_unavailable", "WhatsApp Cloud credential key version is unavailable");
  return decryptCloudCredentialToken(String(row.encrypted_token), key);
};

const rotate = async (input: RotateCloudCredentialInput): Promise<CloudCredentialBinding> => {
  const keys = keyring();
  const version = activeKeyVersion();
  const id = referenceId(input.current.reference);
  const encryptedToken = await encryptCloudCredentialToken(input.accessToken, keys.get(version)!);
  const rows = await pg`
    UPDATE whatsapp_cloud_credentials
    SET encrypted_token = ${encryptedToken}, key_version = ${version}, updated_at = NOW()
    WHERE id = ${id}
      AND organization_id = ${input.organizationId}
      AND key_version = ${input.current.keyVersion}
      AND revoked_at IS NULL
  `;
  if (rows.count !== 1) throw new CloudCredentialError("credential_not_found", "WhatsApp Cloud credential is unavailable");
  return bindingFor(id, version);
};

const revoke = async (binding: CloudCredentialBinding): Promise<void> => {
  const normalized = normalizeCloudCredentialBinding(binding);
  await pg`
    UPDATE whatsapp_cloud_credentials
    SET revoked_at = COALESCE(revoked_at, NOW()), updated_at = NOW()
    WHERE id = ${referenceId(normalized.reference)}
  `;
};

export const databaseCloudCredentialVault: WhatsAppCloudCredentialVault = {
  store,
  resolve,
  rotate,
  revoke,
};
