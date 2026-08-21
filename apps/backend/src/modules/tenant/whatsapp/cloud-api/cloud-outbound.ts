import { normalizePhoneNumber } from "@repo/types";
import { WhatsAppCloudApiError } from "./cloud-api.client";

export type CloudTemplateParameter =
  | { type: "text"; text: string }
  | {
      type: "currency";
      currency: { fallback_value: string; code: string; amount_1000: number };
    }
  | {
      type: "date_time";
      date_time: { fallback_value: string; [key: string]: string | number };
    }
  | { type: "image"; image: { id: string } | { link: string } }
  | { type: "document"; document: { id: string } | { link: string } };

export type CloudTemplateComponent = {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: string;
  parameters?: CloudTemplateParameter[];
};

export type CloudOutboundMessage =
  | { type: "text"; body: string; previewUrl?: boolean; callbackData?: string }
  | {
      type: "template";
      name: string;
      languageCode: string;
      components?: CloudTemplateComponent[];
      callbackData?: string;
    }
  | {
      type: "image" | "document";
      mediaId: string;
      caption?: string;
      fileName?: string;
      callbackData?: string;
    };

export type CloudOutboundPayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: CloudOutboundMessage["type"];
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components?: CloudTemplateComponent[];
  };
  image?: { id: string; caption?: string };
  document?: { id: string; caption?: string; filename?: string };
  biz_opaque_callback_data?: string;
};

export type CloudDispatchOutcome =
  | { status: "accepted"; providerMessageId: string }
  | { status: "retryable"; code: string; message: string }
  | { status: "permanent"; code: string; message: string }
  | { status: "reconciling"; code: "submission_uncertain"; message: string };

export type CloudMessageSender = {
  sendMessage: (
    phoneNumberId: string,
    payload: CloudOutboundPayload,
  ) => Promise<unknown>;
};

const requireText = (
  value: string,
  label: string,
  maxLength: number,
): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) throw new Error(`${label} is too long`);
  return value;
};

const requireIdentifier = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9._:-]{1,255}$/.test(normalized)) {
    throw new Error(`${label} is invalid`);
  }
  return normalized;
};

const callbackData = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > 512 || /[\r\n]/.test(normalized)) {
    throw new Error("WhatsApp callback data is invalid");
  }
  return normalized;
};

const requirePhoneNumberId = (value: string): string => {
  const normalized = value.trim();
  if (!/^\d{1,255}$/.test(normalized)) {
    throw new Error("WhatsApp Phone Number ID is invalid");
  }
  return normalized;
};

const recipient = (value: string): string => {
  const normalized = normalizePhoneNumber(value);
  if (!normalized)
    throw new Error("WhatsApp recipient phone number is invalid");
  return normalized;
};

export const buildCloudOutboundPayload = (
  to: string,
  message: CloudOutboundMessage,
): CloudOutboundPayload => {
  const messageCallbackData = callbackData(message.callbackData);
  const base = {
    messaging_product: "whatsapp" as const,
    recipient_type: "individual" as const,
    to: recipient(to),
    type: message.type,
    ...(messageCallbackData
      ? { biz_opaque_callback_data: messageCallbackData }
      : {}),
  };
  if (message.type === "text") {
    return {
      ...base,
      text: {
        body: requireText(message.body, "WhatsApp text body", 4_096),
        ...(message.previewUrl === undefined
          ? {}
          : { preview_url: message.previewUrl }),
      },
    };
  }
  if (message.type === "template") {
    return {
      ...base,
      template: {
        name: requireIdentifier(message.name, "WhatsApp template name"),
        language: {
          code: requireText(
            message.languageCode,
            "WhatsApp template language",
            32,
          ).trim(),
        },
        ...(message.components ? { components: message.components } : {}),
      },
    };
  }
  const mediaId = requireIdentifier(message.mediaId, "WhatsApp media ID");
  return {
    ...base,
    [message.type]: {
      id: mediaId,
      ...(message.caption
        ? {
            caption: requireText(
              message.caption,
              "WhatsApp media caption",
              4_096,
            ),
          }
        : {}),
      ...(message.type === "document" && message.fileName
        ? { filename: requireText(message.fileName, "WhatsApp file name", 255) }
        : {}),
    },
  } as CloudOutboundPayload;
};

const providerMessageId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^wamid(?:\.|$)[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : null;
};

const providerMessageIdFromResponse = (response: unknown): string | null => {
  if (!response || typeof response !== "object") return null;
  const messages = (response as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;
  const first = messages[0];
  if (!first || typeof first !== "object") return null;
  return providerMessageId((first as { id?: unknown }).id);
};

const safeProviderError = (
  error: WhatsAppCloudApiError,
): { code: string; message: string } => ({
  code: error.providerCode ?? `http_${error.status ?? "unknown"}`,
  message: error.message.slice(0, 1_000),
});

export const dispatchCloudOutboundMessage = async (
  client: CloudMessageSender,
  phoneNumberId: string,
  to: string,
  message: CloudOutboundMessage,
): Promise<CloudDispatchOutcome> => {
  let payload: CloudOutboundPayload;
  let normalizedPhoneNumberId: string;
  try {
    payload = buildCloudOutboundPayload(to, message);
    normalizedPhoneNumberId = requirePhoneNumberId(phoneNumberId);
  } catch (error) {
    return {
      status: "permanent",
      code: "invalid_outbound_message",
      message:
        error instanceof Error ? error.message : "Outbound message is invalid",
    };
  }

  try {
    const response = await client.sendMessage(normalizedPhoneNumberId, payload);
    const id = providerMessageIdFromResponse(response);
    return id
      ? { status: "accepted", providerMessageId: id }
      : {
          status: "permanent",
          code: "missing_provider_message_id",
          message: "Cloud API accepted no valid message ID",
        };
  } catch (error) {
    if (!(error instanceof WhatsAppCloudApiError)) {
      return {
        status: "reconciling",
        code: "submission_uncertain",
        message: "Cloud API submission result is unknown",
      };
    }
    const safe = safeProviderError(error);
    if (error.uncertain) {
      return {
        status: "reconciling",
        code: "submission_uncertain",
        message: "Cloud API submission result is unknown",
      };
    }
    return error.retryable
      ? { status: "retryable", ...safe }
      : { status: "permanent", ...safe };
  }
};
