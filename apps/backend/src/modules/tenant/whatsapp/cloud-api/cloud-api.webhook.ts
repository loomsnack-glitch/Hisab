import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES = 2_000_000;

type JsonRecord = Record<string, unknown>;

type WebhookEntry = {
  id: string;
  changes: JsonRecord[];
};

export type WhatsAppCloudWebhookReceipt = {
  eventKey: string;
  payload: JsonRecord;
  wabaId: string | null;
  phoneNumberId: string | null;
};

export type WhatsAppCloudWebhookBody = string | Uint8Array;

export class WhatsAppCloudWebhookError extends Error {
  readonly code:
    | "payload_too_large"
    | "invalid_json"
    | "invalid_envelope"
    | "missing_configuration";

  constructor(code: WhatsAppCloudWebhookError["code"], message: string) {
    super(message);
    this.name = "WhatsAppCloudWebhookError";
    this.code = code;
  }
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

const bodyBytes = (body: WhatsAppCloudWebhookBody): Uint8Array =>
  typeof body === "string" ? Buffer.from(body, "utf8") : body;

const bodyText = (body: WhatsAppCloudWebhookBody): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes(body));
  } catch {
    throw new WhatsAppCloudWebhookError(
      "invalid_json",
      "WhatsApp webhook payload must be valid UTF-8 JSON",
    );
  }
};

const requireSecret = (value: string | undefined, name: string): string => {
  const secret = value?.trim() ?? "";
  if (!secret) {
    throw new WhatsAppCloudWebhookError(
      "missing_configuration",
      `${name} is not configured`,
    );
  }
  return secret;
};

export const verifyWhatsAppCloudChallenge = (
  mode: string | undefined,
  verifyToken: string | undefined,
  challenge: string | undefined,
  configuredToken: string | undefined,
): string | null => {
  const expectedToken = requireSecret(
    configuredToken,
    "WhatsApp Cloud webhook verify token",
  );
  if (mode !== "subscribe" || !challenge || !verifyToken) return null;
  return safeEqual(verifyToken, expectedToken) ? challenge : null;
};

export const verifyWhatsAppCloudSignature = (
  rawBody: WhatsAppCloudWebhookBody,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): boolean => {
  const secret = requireSecret(appSecret, "WhatsApp Cloud webhook app secret");
  const signature = signatureHeader?.trim() ?? "";
  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature);
  if (!match?.[1]) return false;

  const expected = createHmac("sha256", secret)
    .update(bodyBytes(rawBody))
    .digest("hex");
  return safeEqual(match[1].toLowerCase(), expected);
};

const parseEntries = (value: unknown): WebhookEntry[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new WhatsAppCloudWebhookError(
      "invalid_envelope",
      "WhatsApp webhook entry array is required",
    );
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new WhatsAppCloudWebhookError(
        "invalid_envelope",
        "WhatsApp webhook entry must be an object",
      );
    }
    const id = nonEmptyString(entry.id);
    if (!id || !Array.isArray(entry.changes)) {
      throw new WhatsAppCloudWebhookError(
        "invalid_envelope",
        "WhatsApp webhook entry is missing id or changes",
      );
    }
    const changes = entry.changes.filter(isRecord);
    if (changes.length !== entry.changes.length) {
      throw new WhatsAppCloudWebhookError(
        "invalid_envelope",
        "WhatsApp webhook changes must be objects",
      );
    }
    return { id, changes };
  });
};

export const parseWhatsAppCloudWebhook = (
  rawBody: WhatsAppCloudWebhookBody,
): WhatsAppCloudWebhookReceipt => {
  const bytes = bodyBytes(rawBody);
  if (bytes.byteLength > WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES) {
    throw new WhatsAppCloudWebhookError(
      "payload_too_large",
      "WhatsApp webhook payload is too large",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText(rawBody));
  } catch {
    throw new WhatsAppCloudWebhookError(
      "invalid_json",
      "WhatsApp webhook payload must be valid JSON",
    );
  }

  if (!isRecord(parsed) || parsed.object !== "whatsapp_business_account") {
    throw new WhatsAppCloudWebhookError(
      "invalid_envelope",
      "Unsupported WhatsApp webhook object",
    );
  }

  const entries = parseEntries(parsed.entry);
  const wabaIds = new Set(entries.map((entry) => entry.id));
  const phoneNumberIds = new Set<string>();

  for (const entry of entries) {
    for (const change of entry.changes) {
      const value = isRecord(change.value) ? change.value : null;
      const metadata =
        value && isRecord(value.metadata) ? value.metadata : null;
      const phoneNumberId = nonEmptyString(metadata?.phone_number_id);
      if (phoneNumberId) phoneNumberIds.add(phoneNumberId);
    }
  }

  return {
    eventKey: createHash("sha256").update(bytes).digest("hex"),
    payload: parsed,
    wabaId: wabaIds.size === 1 ? ([...wabaIds][0] ?? null) : null,
    phoneNumberId:
      phoneNumberIds.size === 1 ? ([...phoneNumberIds][0] ?? null) : null,
  };
};
