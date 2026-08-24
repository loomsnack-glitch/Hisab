import { pg } from "@/config/db";
import { randomUUID } from "node:crypto";

export type CloudWebhookEventClaim = {
  id: string;
  eventKey: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  accountId: string | null;
  payload: Record<string, unknown>;
  attemptCount: number;
  leaseOwner: string;
};

export type CloudMessageStatusUpdateResult = "updated" | "stale" | "missing";

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

export const findCloudAccountId = async (
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

const parsePayload = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error("Stored WhatsApp Cloud webhook payload is invalid");
};

export const persistCloudWebhookEvent = async (
  params: PersistCloudWebhookEventParams,
): Promise<PersistCloudWebhookEventResult> => {
  const accountId = await findCloudAccountId(
    params.wabaId,
    params.phoneNumberId,
  );
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
      ${params.payload}::jsonb,
      'pending',
      0
    )
    ON CONFLICT (event_key) DO NOTHING
    RETURNING id, whatsapp_account_id, status
  `;

  if (inserted) {
    if (accountId) {
      try {
        await pg`
          UPDATE whatsapp_accounts
          SET cloud_last_webhook_at = NOW(), updated_at = NOW()
          WHERE id = ${accountId} AND provider = 'cloud_api'
        `;
        await pg`
          UPDATE whatsapp_business_accounts business
          SET last_webhook_at = NOW(), updated_at = NOW()
          WHERE id = (
            SELECT whatsapp_business_account_id
            FROM whatsapp_accounts
            WHERE id = ${accountId} AND provider = 'cloud_api'
          )
        `;
      } catch (error) {
        console.warn(
          "[whatsapp] Cloud webhook heartbeat update failed",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }
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

export const claimPendingCloudWebhookEvents = async (
  limit = 50,
): Promise<CloudWebhookEventClaim[]> => {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const leaseOwner = `cloud-webhook-${randomUUID()}`;
  const rows = await pg`
    WITH exhausted AS (
      UPDATE whatsapp_cloud_webhook_events
      SET status = 'dead_letter',
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = 'max_attempts_exceeded',
          last_error_message = 'Cloud webhook processing lease expired after the maximum attempts',
          updated_at = NOW()
      WHERE attempt_count >= 8
        AND (
          (status = 'retryable' AND next_attempt_at <= NOW())
          OR (status = 'processing' AND (lease_expires_at IS NULL OR lease_expires_at < NOW()))
        )
      RETURNING id
    ), candidates AS (
      SELECT id
      FROM whatsapp_cloud_webhook_events
      WHERE attempt_count < 8
        AND (
          (status IN ('pending', 'retryable') AND next_attempt_at <= NOW())
          OR (status = 'processing' AND (lease_expires_at IS NULL OR lease_expires_at < NOW()))
        )
      ORDER BY next_attempt_at ASC, created_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${safeLimit}
    ), resolved AS (
      SELECT
        candidate.id,
        CASE WHEN business.id IS NOT NULL THEN account.id ELSE NULL END AS account_id
      FROM candidates candidate
      LEFT JOIN whatsapp_accounts account
        ON account.provider = 'cloud_api'
       AND account.cloud_phone_number_id = (
         SELECT event.phone_number_id
         FROM whatsapp_cloud_webhook_events event
         WHERE event.id = candidate.id
       )
      LEFT JOIN whatsapp_business_accounts business
        ON business.id = account.whatsapp_business_account_id
       AND business.waba_id = (
         SELECT event.waba_id
         FROM whatsapp_cloud_webhook_events event
         WHERE event.id = candidate.id
       )
    )
    UPDATE whatsapp_cloud_webhook_events event
    SET status = 'processing',
        whatsapp_account_id = resolved.account_id,
        attempt_count = event.attempt_count + 1,
        lease_owner = ${leaseOwner},
        lease_expires_at = NOW() + INTERVAL '60 seconds',
        updated_at = NOW()
    FROM resolved
    WHERE event.id = resolved.id
    RETURNING event.id, event.event_key, event.waba_id, event.phone_number_id,
      event.whatsapp_account_id, event.payload, event.attempt_count,
      event.lease_owner
  `;
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    eventKey: String(row.event_key),
    wabaId: row.waba_id ? String(row.waba_id) : null,
    phoneNumberId: row.phone_number_id ? String(row.phone_number_id) : null,
    accountId: row.whatsapp_account_id ? String(row.whatsapp_account_id) : null,
    payload: parsePayload(row.payload),
    attemptCount: Number(row.attempt_count),
    leaseOwner: String(row.lease_owner),
  }));
};

export const completeCloudWebhookEvent = async (
  event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
  ignoredDetail?: string,
): Promise<boolean> => {
  const deferredMessage = ignoredDetail
    ? ignoredDetail.slice(0, 1_000)
    : null;
  const rows = await pg`
    UPDATE whatsapp_cloud_webhook_events
    SET status = 'completed',
        payload = '{}'::jsonb,
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = ${deferredMessage ? "deferred_event" : null},
        last_error_message = ${deferredMessage},
        updated_at = NOW()
    WHERE id = ${event.id}
      AND status = 'processing'
      AND lease_owner = ${event.leaseOwner}
  `;
  return rows.count === 1;
};

export const ignoreCloudWebhookEvent = async (
  event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
  code: string,
  message: string,
): Promise<boolean> => {
  const rows = await pg`
    UPDATE whatsapp_cloud_webhook_events
    SET status = 'ignored',
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = LEFT(${code}, 100),
        last_error_message = LEFT(${message}, 1_000),
        updated_at = NOW()
    WHERE id = ${event.id}
      AND status = 'processing'
      AND lease_owner = ${event.leaseOwner}
  `;
  return rows.count === 1;
};

export const failCloudWebhookEvent = async (
  event: Pick<CloudWebhookEventClaim, "id" | "leaseOwner">,
  code: string,
  message: string,
  maxAttempts = 8,
): Promise<boolean> => {
  const rows = await pg`
    UPDATE whatsapp_cloud_webhook_events
    SET status = CASE
          WHEN attempt_count >= ${maxAttempts}
            THEN 'dead_letter'::whatsapp_cloud_webhook_event_status_enum
          ELSE 'retryable'::whatsapp_cloud_webhook_event_status_enum
        END,
        next_attempt_at = NOW() + make_interval(secs => LEAST(300, GREATEST(1, POWER(2, attempt_count)::integer))),
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = LEFT(${code}, 100),
        last_error_message = LEFT(${message}, 1_000),
        updated_at = NOW()
    WHERE id = ${event.id}
      AND status = 'processing'
      AND lease_owner = ${event.leaseOwner}
  `;
  return rows.count === 1;
};
