import { pg } from "@/config/db";

export type PersistCloudWebhookEventParams = {
  eventKey: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  payload: Record<string, unknown>;
};

export type PersistCloudWebhookEventResult = {
  eventId: string;
  accountId: string | null;
  status: string;
  duplicate: boolean;
};

const findCloudAccountId = async (
  wabaId: string | null,
  phoneNumberId: string | null,
): Promise<string | null> => {
  if (!wabaId || !phoneNumberId) return null;
  const [row] = await pg`
    SELECT account.id
    FROM whatsapp_accounts account
    INNER JOIN whatsapp_business_accounts business
      ON business.id = account.whatsapp_business_account_id
     AND business.organization_id = account.organization_id
    WHERE account.provider = 'cloud_api'
      AND business.waba_id = ${wabaId}
      AND account.cloud_phone_number_id = ${phoneNumberId}
    LIMIT 1
  `;
  return row?.id ? String(row.id) : null;
};

export const persistCloudWebhookEvent = async (
  params: PersistCloudWebhookEventParams,
): Promise<PersistCloudWebhookEventResult> => {
  const accountId = await findCloudAccountId(
    params.wabaId,
    params.phoneNumberId,
  );
  const payload = JSON.stringify(params.payload);
  const [inserted] = await pg`
    INSERT INTO whatsapp_cloud_webhook_events (
      event_key,
      waba_id,
      phone_number_id,
      whatsapp_account_id,
      payload,
      status,
      attempt_count
    )
    VALUES (
      ${params.eventKey},
      ${params.wabaId},
      ${params.phoneNumberId},
      ${accountId},
      ${payload}::jsonb,
      'pending',
      0
    )
    ON CONFLICT (event_key) DO NOTHING
    RETURNING id, whatsapp_account_id, status
  `;

  if (inserted) {
    return {
      eventId: String(inserted.id),
      accountId: inserted.whatsapp_account_id
        ? String(inserted.whatsapp_account_id)
        : null,
      status: String(inserted.status),
      duplicate: false,
    };
  }

  const [existing] = await pg`
    SELECT id, whatsapp_account_id, status
    FROM whatsapp_cloud_webhook_events
    WHERE event_key = ${params.eventKey}
  `;
  if (!existing) throw new Error("WhatsApp Cloud webhook receipt disappeared");

  return {
    eventId: String(existing.id),
    accountId: existing.whatsapp_account_id
      ? String(existing.whatsapp_account_id)
      : null,
    status: String(existing.status),
    duplicate: true,
  };
};
