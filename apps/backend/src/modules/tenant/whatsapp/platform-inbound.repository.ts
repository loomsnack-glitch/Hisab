import { pg } from "@/config/db";

export const GANATRI_PLATFORM_SENDER_KEY = "ganatri_utility" as const;

export type PlatformInboundReply = Readonly<{
  wabaId: string;
  phoneNumberId: string;
  providerMessageId: string;
  contactPhoneNumber: string;
  displayName: string;
  body: string;
  occurredAt: string;
}>;

const normalized = (value: string, label: string, maxLength: number): string => {
  const result = value.trim();
  if (!result || result.length > maxLength || /[\u0000-\u001f\u007f]/.test(result)) {
    throw new Error(`Platform inbound ${label} is invalid`);
  }
  return result;
};

const validateReply = (reply: PlatformInboundReply): PlatformInboundReply => {
  const wabaId = normalized(reply.wabaId, "WABA id", 64);
  const phoneNumberId = normalized(reply.phoneNumberId, "phone number id", 64);
  const providerMessageId = normalized(reply.providerMessageId, "provider message id", 255);
  const contactPhoneNumber = normalized(reply.contactPhoneNumber, "contact phone number", 20);
  const displayName = normalized(reply.displayName, "display name", 255);
  const body = normalized(reply.body, "body", 4_096);
  const occurredAt = new Date(reply.occurredAt);
  if (!/^\d{6,32}$/.test(wabaId) || !/^\d{6,32}$/.test(phoneNumberId)) {
    throw new Error("Platform inbound sender identity is invalid");
  }
  if (!/^\+[1-9][0-9]{7,14}$/.test(contactPhoneNumber)) {
    throw new Error("Platform inbound contact phone number is invalid");
  }
  if (Number.isNaN(occurredAt.getTime())) throw new Error("Platform inbound timestamp is invalid");
  return { ...reply, wabaId, phoneNumberId, providerMessageId, contactPhoneNumber, displayName, body, occurredAt: occurredAt.toISOString() };
};

export const recordPlatformInboundReplyInDatabase = async (
  tx: Bun.TransactionSQL,
  reply: PlatformInboundReply,
): Promise<{ id: string; stored: boolean }> => {
  const value = validateReply(reply);
  const [row] = await tx`
    INSERT INTO whatsapp_platform_inbound_messages (
      sender_key, waba_id, phone_number_id, provider_message_id,
      contact_phone_number, display_name, message_type, body, occurred_at
    ) VALUES (
      ${GANATRI_PLATFORM_SENDER_KEY}, ${value.wabaId}, ${value.phoneNumberId}, ${value.providerMessageId},
      ${value.contactPhoneNumber}, ${value.displayName}, 'text', ${value.body}, ${value.occurredAt}::timestamptz
    )
    ON CONFLICT (sender_key, provider_message_id) DO NOTHING
    RETURNING id
  `;
  if (row) return { id: String(row.id), stored: true };
  const [existing] = await tx`
    SELECT id
    FROM whatsapp_platform_inbound_messages
    WHERE sender_key = ${GANATRI_PLATFORM_SENDER_KEY}
      AND provider_message_id = ${value.providerMessageId}
    LIMIT 1
  `;
  if (!existing) throw new Error("Platform inbound reply disappeared after deduplication");
  return { id: String(existing.id), stored: false };
};

export const recordPlatformInboundReply = async (
  reply: PlatformInboundReply,
): Promise<{ id: string; stored: boolean }> => pg.begin(async tx => recordPlatformInboundReplyInDatabase(tx, reply));
