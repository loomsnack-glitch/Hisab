import { randomUUID } from "node:crypto";
import { pg } from "@/config/db";
import {
  GoogleContactsCredentialError,
  normalizeGoogleContactsCredentialBinding,
  parseGoogleContactsCredentialPayload,
  serializeGoogleContactsCredentialPayload,
  type GoogleContactsCredentialBinding,
  type GoogleContactsCredentialPayload,
  type GoogleContactsCredentialVault,
  type RotateGoogleContactsCredentialInput,
  type StoreGoogleContactsCredentialInput,
} from "./google-contacts.credentials";

const REFERENCE_PREFIX = "db-secret:";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (value: Uint8Array): string => Buffer.from(value).toString("base64");
const fromBase64 = (value: string): Uint8Array => new Uint8Array(Buffer.from(value, "base64"));
const asArrayBuffer = (value: Uint8Array): ArrayBuffer =>
  value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const activeKeyVersion = (): string => {
  const version = process.env.GOOGLE_CONTACTS_CREDENTIAL_ACTIVE_KEY_VERSION?.trim();
  if (!version || /[\r\n]/.test(version) || version.length > 64) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts credential key version is not configured",
    );
  }
  return version;
};

const keyring = (): Map<string, Uint8Array> => {
  const raw = process.env.GOOGLE_CONTACTS_CREDENTIAL_KEYS_JSON?.trim();
  if (!raw) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts credential keys are not configured",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts credential keys are invalid",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts credential keys are invalid",
    );
  }
  const entries = new Map<string, Uint8Array>();
  for (const [version, encoded] of Object.entries(parsed)) {
    if (!version || version.length > 64 || typeof encoded !== "string") {
      throw new GoogleContactsCredentialError(
        "vault_unavailable",
        "Google Contacts credential keys are invalid",
      );
    }
    const key = fromBase64(encoded);
    if (key.length !== KEY_BYTES) {
      throw new GoogleContactsCredentialError(
        "vault_unavailable",
        "Google Contacts credential keys are invalid",
      );
    }
    entries.set(version, key);
  }
  if (!entries.has(activeKeyVersion())) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Active Google Contacts credential key is unavailable",
    );
  }
  return entries;
};

const importKey = async (rawKey: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    asArrayBuffer(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

export const encryptGoogleContactsCredentialPayload = async (
  payload: GoogleContactsCredentialPayload,
  rawKey: Uint8Array,
): Promise<string> => {
  if (rawKey.length !== KEY_BYTES) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts encryption key is invalid",
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    await importKey(rawKey),
    asArrayBuffer(textEncoder.encode(serializeGoogleContactsCredentialPayload(payload))),
  );
  return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
};

export const decryptGoogleContactsCredentialPayload = async (
  encryptedPayload: string,
  rawKey: Uint8Array,
): Promise<GoogleContactsCredentialPayload> => {
  const [ivPart, cipherPart] = encryptedPayload.split(":");
  if (!ivPart || !cipherPart || rawKey.length !== KEY_BYTES) {
    throw new GoogleContactsCredentialError(
      "credential_not_found",
      "Google Contacts credential could not be decrypted",
    );
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(fromBase64(ivPart)) },
      await importKey(rawKey),
      asArrayBuffer(fromBase64(cipherPart)),
    );
    return parseGoogleContactsCredentialPayload(textDecoder.decode(decrypted));
  } catch (error) {
    if (error instanceof GoogleContactsCredentialError) throw error;
    throw new GoogleContactsCredentialError(
      "credential_not_found",
      "Google Contacts credential could not be decrypted",
    );
  }
};

const normalizeOwnerKey = (ownerKey: string): string => {
  const normalized = ownerKey.trim();
  if (!normalized || normalized.length > 255 || /[\r\n]/.test(normalized)) {
    throw new GoogleContactsCredentialError(
      "invalid_binding",
      "Google Contacts credential owner is invalid",
    );
  }
  return normalized;
};

const referenceId = (reference: string): string => {
  const normalized = normalizeGoogleContactsCredentialBinding({
    reference,
    keyVersion: "v",
  }).reference;
  const id = normalized.slice(REFERENCE_PREFIX.length);
  if (!normalized.startsWith(REFERENCE_PREFIX) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new GoogleContactsCredentialError(
      "invalid_binding",
      "Google Contacts credential reference is invalid",
    );
  }
  return id;
};

const bindingFor = (id: string, keyVersion: string): GoogleContactsCredentialBinding => ({
  reference: `${REFERENCE_PREFIX}${id}`,
  keyVersion,
});

const store = async (
  input: StoreGoogleContactsCredentialInput,
): Promise<GoogleContactsCredentialBinding> => {
  const keys = keyring();
  const version = activeKeyVersion();
  const id = randomUUID();
  const encryptedPayload = await encryptGoogleContactsCredentialPayload(
    input.payload,
    keys.get(version)!,
  );
  await pg`
    INSERT INTO google_contacts_credentials (
      id, organization_id, owner_key, encrypted_payload, key_version
    ) VALUES (
      ${id}, ${input.organizationId}, ${normalizeOwnerKey(input.ownerKey)}, ${encryptedPayload}, ${version}
    )
  `;
  return bindingFor(id, version);
};

const resolve = async (
  binding: GoogleContactsCredentialBinding,
): Promise<GoogleContactsCredentialPayload> => {
  const normalized = normalizeGoogleContactsCredentialBinding(binding);
  const [row] = await pg`
    SELECT encrypted_payload, key_version
    FROM google_contacts_credentials
    WHERE id = ${referenceId(normalized.reference)}
      AND revoked_at IS NULL
  `;
  if (!row || String(row.key_version) !== normalized.keyVersion) {
    throw new GoogleContactsCredentialError(
      "credential_not_found",
      "Google Contacts credential is unavailable",
    );
  }
  const key = keyring().get(normalized.keyVersion);
  if (!key) {
    throw new GoogleContactsCredentialError(
      "vault_unavailable",
      "Google Contacts credential key version is unavailable",
    );
  }
  return decryptGoogleContactsCredentialPayload(String(row.encrypted_payload), key);
};

const rotate = async (
  input: RotateGoogleContactsCredentialInput,
): Promise<GoogleContactsCredentialBinding> => {
  const keys = keyring();
  const version = activeKeyVersion();
  const id = referenceId(input.current.reference);
  const encryptedPayload = await encryptGoogleContactsCredentialPayload(
    input.payload,
    keys.get(version)!,
  );
  const rows = await pg`
    UPDATE google_contacts_credentials
    SET encrypted_payload = ${encryptedPayload}, key_version = ${version}, updated_at = NOW()
    WHERE id = ${id}
      AND organization_id = ${input.organizationId}
      AND key_version = ${input.current.keyVersion}
      AND revoked_at IS NULL
  `;
  if (rows.count !== 1) {
    throw new GoogleContactsCredentialError(
      "credential_not_found",
      "Google Contacts credential is unavailable",
    );
  }
  return bindingFor(id, version);
};

const revoke = async (binding: GoogleContactsCredentialBinding): Promise<void> => {
  const normalized = normalizeGoogleContactsCredentialBinding(binding);
  await pg`
    UPDATE google_contacts_credentials
    SET revoked_at = COALESCE(revoked_at, NOW()), updated_at = NOW()
    WHERE id = ${referenceId(normalized.reference)}
  `;
};

export const databaseGoogleContactsCredentialVault: GoogleContactsCredentialVault = {
  store,
  resolve,
  rotate,
  revoke,
};
