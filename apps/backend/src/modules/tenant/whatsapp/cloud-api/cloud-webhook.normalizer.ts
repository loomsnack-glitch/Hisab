import { normalizePhoneNumber } from "@repo/types";
import type { WhatsAppCloudWebhookReceipt } from "./cloud-api.webhook";

type JsonRecord = Record<string, unknown>;

export type CloudMessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type CloudNormalizedMessageEvent = {
  kind: "message";
  wabaId: string;
  phoneNumberId: string;
  providerMessageId: string;
  externalChatId: string;
  contactPhoneNumber: string;
  displayName: string;
  messageType: "text";
  body: string;
  caption: null;
  attachmentFileName: null;
  attachmentMimeType: null;
  occurredAt: string;
  source: "realtime";
};

export type CloudNormalizedStatusEvent = {
  kind: "status";
  wabaId: string;
  phoneNumberId: string;
  providerMessageId: string;
  callbackData: string | null;
  recipientPhoneNumber: string;
  status: Exclude<CloudMessageStatus, "queued" | "sending">;
  occurredAt: string;
  failureCode: string | null;
  failureMessage: string | null;
};

export type CloudDeferredEvent = {
  kind: "deferred";
  wabaId: string | null;
  phoneNumberId: string | null;
  providerMessageId: string | null;
  messageType: string | null;
  mediaId: string | null;
  reason: "media" | "unsupported_message" | "unsupported_status" | "malformed";
  detail: string;
};

export type CloudNormalizedEvent =
  | CloudNormalizedMessageEvent
  | CloudNormalizedStatusEvent
  | CloudDeferredEvent;

export type CloudMessageStatusSnapshot = {
  status: CloudMessageStatus;
  lastObservedAt: string | null;
};

export class WhatsAppCloudWebhookNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppCloudWebhookNormalizationError";
  }
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const boundedString = (value: unknown, maxLength: number): string | null => {
  const normalized = stringValue(value);
  return normalized ? normalized.slice(0, maxLength) : null;
};

const identifier = (value: unknown, maxLength: number): string | null => {
  const normalized = stringValue(value);
  return normalized &&
    normalized.length <= maxLength &&
    /^[A-Za-z0-9._:-]+$/.test(normalized)
    ? normalized
    : null;
};

const requiredString = (value: unknown, label: string): string => {
  const normalized = stringValue(value);
  if (!normalized)
    throw new WhatsAppCloudWebhookNormalizationError(`${label} is required`);
  return normalized;
};

const normalizeCloudPhone = (value: unknown): string => {
  const raw = requiredString(value, "WhatsApp phone number");
  const candidate = raw.startsWith("+") ? raw : `+${raw}`;
  const normalized = normalizePhoneNumber(candidate);
  if (!normalized)
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp phone number is invalid",
    );
  return normalized;
};

const timestampToIso = (value: unknown): string => {
  const raw = requiredString(value, "WhatsApp timestamp");
  if (!/^\d+$/.test(raw)) {
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp timestamp must be Unix seconds",
    );
  }
  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp timestamp is invalid",
    );
  }
  const date = new Date(seconds * 1_000);
  if (Number.isNaN(date.getTime())) {
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp timestamp is invalid",
    );
  }
  return date.toISOString();
};

const metadataFor = (value: JsonRecord): { phoneNumberId: string } => {
  const metadata = isRecord(value.metadata) ? value.metadata : null;
  const phoneNumberId = identifier(metadata?.phone_number_id, 64);
  if (!phoneNumberId)
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp phone number ID is invalid",
    );
  return {
    phoneNumberId,
  };
};

const contactNameFor = (value: JsonRecord, from: string): string => {
  if (!Array.isArray(value.contacts)) return from;
  const contact = value.contacts.find((candidate) => {
    if (!isRecord(candidate)) return false;
    return stringValue(candidate.wa_id) === from;
  });
  const profile = contact && isRecord(contact.profile) ? contact.profile : null;
  return boundedString(profile?.name, 255) ?? from;
};

const deferred = (
  base: Pick<CloudDeferredEvent, "wabaId" | "phoneNumberId">,
  detail: string,
  fields: Partial<
    Omit<CloudDeferredEvent, "kind" | "wabaId" | "phoneNumberId" | "detail">
  > = {},
): CloudDeferredEvent => ({
  kind: "deferred",
  wabaId: base.wabaId,
  phoneNumberId: base.phoneNumberId,
  providerMessageId: fields.providerMessageId ?? null,
  messageType: fields.messageType ?? null,
  mediaId: fields.mediaId ?? null,
  reason: fields.reason ?? "malformed",
  detail,
});

const eventBaseFor = (
  entryId: string,
  value: JsonRecord | null,
): Pick<CloudDeferredEvent, "wabaId" | "phoneNumberId"> => {
  if (!value) return { wabaId: entryId, phoneNumberId: null };
  try {
    return { wabaId: entryId, phoneNumberId: metadataFor(value).phoneNumberId };
  } catch {
    return { wabaId: entryId, phoneNumberId: null };
  }
};

const normalizeMessage = (
  entryId: string,
  value: JsonRecord,
  message: JsonRecord,
): CloudNormalizedEvent => {
  const providerMessageId = identifier(message.id, 255);
  const messageType = stringValue(message.type);
  const metadata = (() => {
    try {
      return metadataFor(value);
    } catch {
      return null;
    }
  })();
  const base = eventBaseFor(entryId, value);

  if (!providerMessageId || !messageType || !metadata) {
    return deferred(
      base,
      "Message is missing an id, type, or phone number metadata",
      {
        providerMessageId: providerMessageId ?? null,
        messageType,
      },
    );
  }

  if (messageType !== "text") {
    const media = isRecord(message[messageType]) ? message[messageType] : null;
    const mediaId = identifier(media?.id, 255);
    const isMedia = messageType === "image" || messageType === "document";
    return deferred(
      base,
      isMedia && mediaId
        ? "Media message requires asynchronous provider media retrieval"
        : isMedia
          ? "Media message is missing a valid provider media ID"
          : "Message type is not supported by the current Hisab model",
      {
        providerMessageId,
        messageType,
        mediaId,
        reason: isMedia
          ? mediaId
            ? "media"
            : "malformed"
          : "unsupported_message",
      },
    );
  }

  try {
    const from = normalizeCloudPhone(message.from);
    const text = isRecord(message.text) ? message.text : null;
    const body = requiredString(text?.body, "WhatsApp text body");
    if (body.length > 4096) {
      throw new WhatsAppCloudWebhookNormalizationError(
        "WhatsApp text body is too long",
      );
    }
    return {
      kind: "message",
      wabaId: entryId,
      phoneNumberId: metadata.phoneNumberId,
      providerMessageId,
      externalChatId: `${from.slice(1)}@s.whatsapp.net`,
      contactPhoneNumber: from,
      displayName: contactNameFor(value, from.slice(1)),
      messageType: "text",
      body,
      caption: null,
      attachmentFileName: null,
      attachmentMimeType: null,
      occurredAt: timestampToIso(message.timestamp),
      source: "realtime",
    };
  } catch (error) {
    return deferred(
      base,
      error instanceof Error ? error.message : "Message is malformed",
      {
        providerMessageId,
        messageType,
      },
    );
  }
};

const normalizeStatus = (
  entryId: string,
  value: JsonRecord,
  status: JsonRecord,
): CloudNormalizedEvent => {
  const providerMessageId = identifier(status.id, 255);
  const rawStatus = stringValue(status.status);
  let metadata: ReturnType<typeof metadataFor> | null = null;
  try {
    metadata = metadataFor(value);
  } catch {
    // Returned as a deferred event below so one malformed item does not hide valid siblings.
  }
  const base = eventBaseFor(entryId, value);
  if (!providerMessageId || !rawStatus || !metadata) {
    return deferred(
      base,
      "Status is missing an id, status, or phone number metadata",
      {
        providerMessageId,
      },
    );
  }

  if (!["sent", "delivered", "read", "failed"].includes(rawStatus)) {
    return deferred(
      base,
      "Status is not supported by the current Hisab model",
      {
        providerMessageId,
        reason: "unsupported_status",
      },
    );
  }

  try {
    const recipientPhoneNumber = normalizeCloudPhone(status.recipient_id);
    const errors =
      Array.isArray(status.errors) && isRecord(status.errors[0])
        ? status.errors[0]
        : null;
    return {
      kind: "status",
      wabaId: entryId,
      phoneNumberId: metadata.phoneNumberId,
      providerMessageId,
      callbackData: boundedString(status.biz_opaque_callback_data, 512),
      recipientPhoneNumber,
      status: rawStatus as CloudNormalizedStatusEvent["status"],
      occurredAt: timestampToIso(status.timestamp),
      failureCode:
        rawStatus === "failed" ? boundedString(errors?.code, 100) : null,
      failureMessage:
        rawStatus === "failed"
          ? boundedString(
              errors?.title ?? errors?.message ?? errors?.details,
              1000,
            )
          : null,
    };
  } catch (error) {
    return deferred(
      base,
      error instanceof Error ? error.message : "Status is malformed",
      {
        providerMessageId,
      },
    );
  }
};

const eventKey = (event: CloudNormalizedEvent): string => {
  if (event.kind === "message") return `message:${event.providerMessageId}`;
  if (event.kind === "status")
    return `status:${event.providerMessageId}:${event.status}:${event.occurredAt}`;
  return `deferred:${event.providerMessageId ?? "unknown"}:${event.reason}:${event.detail}`;
};

export const normalizeCloudWebhookReceipt = (
  receipt: WhatsAppCloudWebhookReceipt,
): CloudNormalizedEvent[] => {
  const entries = receipt.payload.entry;
  if (!Array.isArray(entries)) {
    throw new WhatsAppCloudWebhookNormalizationError(
      "WhatsApp webhook entries are required",
    );
  }

  const normalized: CloudNormalizedEvent[] = [];
  const seen = new Set<string>();
  const addEvent = (event: CloudNormalizedEvent): void => {
    const key = eventKey(event);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(event);
    }
  };
  for (const entry of entries) {
    if (!isRecord(entry)) {
      addEvent(
        deferred(
          { wabaId: null, phoneNumberId: null },
          "Webhook entry must be an object",
        ),
      );
      continue;
    }
    const entryId = identifier(entry.id, 64);
    if (!entryId) {
      addEvent(
        deferred(
          { wabaId: null, phoneNumberId: null },
          "Webhook entry is missing a valid WABA ID",
        ),
      );
      continue;
    }
    if (!Array.isArray(entry.changes)) {
      addEvent(
        deferred(
          { wabaId: entryId, phoneNumberId: null },
          "Webhook entry changes must be an array",
        ),
      );
      continue;
    }
    for (const change of entry.changes) {
      if (!isRecord(change)) {
        addEvent(
          deferred(
            { wabaId: entryId, phoneNumberId: null },
            "Webhook change must be an object",
          ),
        );
        continue;
      }
      const value = isRecord(change.value) ? change.value : null;
      if (!value) {
        addEvent(
          deferred(
            { wabaId: entryId, phoneNumberId: null },
            "Webhook change value must be an object",
          ),
        );
        continue;
      }
      if (Array.isArray(value.messages)) {
        for (const candidate of value.messages) {
          addEvent(
            isRecord(candidate)
              ? normalizeMessage(entryId, value, candidate)
              : deferred(
                  eventBaseFor(entryId, value),
                  "Message item must be an object",
                ),
          );
        }
      }
      if (Array.isArray(value.statuses)) {
        for (const candidate of value.statuses) {
          addEvent(
            isRecord(candidate)
              ? normalizeStatus(entryId, value, candidate)
              : deferred(
                  eventBaseFor(entryId, value),
                  "Status item must be an object",
                ),
          );
        }
      }
    }
  }
  return normalized;
};

export const nextCloudMessageStatus = (
  current: CloudMessageStatusSnapshot,
  incoming: {
    status: Exclude<CloudMessageStatus, "queued" | "sending">;
    occurredAt: string;
  },
): CloudMessageStatusSnapshot => {
  const incomingTime = Date.parse(incoming.occurredAt);
  if (Number.isNaN(incomingTime)) {
    throw new WhatsAppCloudWebhookNormalizationError(
      "Cloud message status timestamp is invalid",
    );
  }
  if (current.lastObservedAt) {
    const currentTime = Date.parse(current.lastObservedAt);
    if (!Number.isNaN(currentTime) && incomingTime < currentTime)
      return current;
  }

  let status = current.status;
  if (incoming.status === "read") status = "read";
  else if (current.status === "read") status = "read";
  else if (current.status === "delivered") status = "delivered";
  else if (current.status === "failed") status = "failed";
  else if (incoming.status === "delivered") status = "delivered";
  else if (incoming.status === "failed") status = "failed";
  else if (
    incoming.status === "sent" &&
    (current.status === "queued" || current.status === "sending")
  ) {
    status = "sent";
  }

  return { status, lastObservedAt: incoming.occurredAt };
};
