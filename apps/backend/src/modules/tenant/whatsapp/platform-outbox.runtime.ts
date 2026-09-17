import { randomUUID } from "node:crypto";
import { pg } from "@/config/db";
import { requireWhatsAppPlatformConfig, readWhatsAppPlatformConfig } from "@/services/notifications/whatsapp-platform-config";
import { dispatchCloudOutboundMessage, type CloudDispatchOutcome } from "./cloud-api/cloud-outbound";
import { WhatsAppCloudApiClient } from "./cloud-api/cloud-api.client";
import { resolvePlatformTemplate, WhatsAppPlatformTemplateUnavailableError } from "./platform-template-health";
import { completeInvoiceOutbox } from "./whatsapp.repository";
import type { PlatformSenderSnapshot } from "./platform-outbox.repository";

type PlatformOutboxJob = Readonly<{
  outboxId: string;
  messageId: string;
  idempotencyKey: string;
  phoneNumber: string;
  snapshot: PlatformSenderSnapshot;
  attemptCount: number;
  leaseOwner: string;
}>;

const leaseSeconds = (value: number): number => Math.min(Math.max(Math.trunc(value), 30), 300);

const parseSnapshot = (value: unknown): PlatformSenderSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (
    snapshot.senderKey !== "ganatri_utility" ||
    (snapshot.templateKind !== "bill" && snapshot.templateKind !== "due_reminder") ||
    typeof snapshot.phoneNumberId !== "string" ||
    typeof snapshot.wabaId !== "string" ||
    typeof snapshot.graphVersion !== "string" ||
    typeof snapshot.templateName !== "string" ||
    typeof snapshot.templateLanguage !== "string" ||
    typeof snapshot.policyVersion !== "number" ||
    !Array.isArray(snapshot.components)
  ) return null;
  return snapshot as unknown as PlatformSenderSnapshot;
};

export const claimNextPlatformOutbox = async (leaseDurationSeconds = 120): Promise<PlatformOutboxJob | null> => {
  const leaseOwner = `ganatri-platform-outbox-${randomUUID()}`;
  return pg.begin(async tx => {
    await tx`
      UPDATE whatsapp_outbox
      SET status = 'retryable', lease_owner = NULL, lease_expires_at = NULL,
          next_attempt_at = NOW(), updated_at = NOW()
      WHERE sender_kind = 'ganatri_platform'
        AND status = 'processing'
        AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
    `;
    const [candidate] = await tx`
      SELECT outbox.id
      FROM whatsapp_outbox outbox
      WHERE outbox.sender_kind = 'ganatri_platform'
        AND outbox.status IN ('pending', 'retryable')
        AND outbox.next_attempt_at <= NOW()
        AND outbox.platform_sender_snapshot IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM whatsapp_outbox active
          WHERE active.sender_kind = 'ganatri_platform'
            AND active.status = 'processing'
            AND (active.lease_expires_at IS NULL OR active.lease_expires_at > NOW())
        )
      ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC, outbox.id ASC
      FOR UPDATE OF outbox SKIP LOCKED
      LIMIT 1
    `;
    if (!candidate) return null;
    const [claimed] = await tx`
      UPDATE whatsapp_outbox
      SET status = 'processing', attempt_count = attempt_count + 1,
          lease_owner = ${leaseOwner},
          lease_expires_at = NOW() + make_interval(secs => ${leaseSeconds(leaseDurationSeconds)}),
          updated_at = NOW()
      WHERE id = ${candidate.id}
      RETURNING id, message_id, attempt_count, lease_owner
    `;
    if (!claimed) return null;
    await tx`
      UPDATE whatsapp_messages
      SET status = 'sending', failure_code = NULL, failure_message = NULL
      WHERE id = ${claimed.message_id} AND status IN ('queued', 'failed')
    `;
    const [job] = await tx`
      SELECT outbox.id AS outbox_id,
             outbox.message_id,
             outbox.platform_sender_snapshot,
             outbox.attempt_count,
             outbox.lease_owner,
             message.idempotency_key,
             message.recipient_phone_number
      FROM whatsapp_outbox outbox
      INNER JOIN whatsapp_messages message ON message.id = outbox.message_id
      WHERE outbox.id = ${claimed.id}
    `;
    const snapshot = parseSnapshot(job?.platform_sender_snapshot);
    if (!job || !snapshot || typeof job.recipient_phone_number !== "string") {
      throw new Error("Platform outbox snapshot is invalid");
    }
    return {
      outboxId: String(job.outbox_id),
      messageId: String(job.message_id),
      idempotencyKey: String(job.idempotency_key),
      phoneNumber: String(job.recipient_phone_number),
      snapshot,
      attemptCount: Number(job.attempt_count),
      leaseOwner: String(job.lease_owner),
    };
  });
};

export const markPlatformOutboxReconciling = async (
  job: Pick<PlatformOutboxJob, "outboxId" | "leaseOwner">,
  code: string,
  message: string,
): Promise<boolean> => {
  const rows = await pg`
    UPDATE whatsapp_outbox
    SET status = 'reconciling', lease_owner = NULL, lease_expires_at = NULL,
        last_error_code = LEFT(${code}, 100), last_error_message = LEFT(${message}, 1000), updated_at = NOW()
    WHERE id = ${job.outboxId} AND sender_kind = 'ganatri_platform'
      AND status = 'processing' AND lease_owner = ${job.leaseOwner}
  `;
  return rows.count === 1;
};

export const dispatchPlatformOutboxJob = async (job: PlatformOutboxJob): Promise<CloudDispatchOutcome> => {
  let result: CloudDispatchOutcome;
  try {
    const config = requireWhatsAppPlatformConfig();
    if (config.wabaId !== job.snapshot.wabaId || config.phoneNumberId !== job.snapshot.phoneNumberId) {
      result = { status: "permanent", code: "platform_sender_changed", message: "Platform sender identity changed" };
    } else {
      const client = new WhatsAppCloudApiClient({
        accessToken: config.accessToken,
        graphVersion: job.snapshot.graphVersion,
        baseUrl: config.graphBaseUrl,
      });
      await resolvePlatformTemplate(job.snapshot.templateKind, config, client, job.snapshot.templateName);
      result = await dispatchCloudOutboundMessage(client, job.snapshot.phoneNumberId, job.phoneNumber, {
        type: "template",
        name: job.snapshot.templateName,
        languageCode: job.snapshot.templateLanguage,
        components: job.snapshot.components,
        callbackData: job.idempotencyKey,
      });
    }
  } catch (error) {
    result = error instanceof WhatsAppPlatformTemplateUnavailableError
      ? { status: "permanent", code: "platform_template_unavailable", message: "Platform utility template is unavailable" }
      : { status: "retryable", code: "platform_sender_unavailable", message: "Platform sender unavailable" };
  }

  if (result.status === "accepted") {
    await completeInvoiceOutbox(job.outboxId, job.leaseOwner, result.providerMessageId, null, null, false);
  } else if (result.status === "reconciling") {
    await markPlatformOutboxReconciling(job, result.code, "Platform API submission result is unknown and needs reconciliation");
  } else {
    await completeInvoiceOutbox(job.outboxId, job.leaseOwner, null, result.code, result.message, result.status === "retryable");
  }
  return result;
};

export const dispatchPlatformOutbox = async (): Promise<boolean> => {
  if (readWhatsAppPlatformConfig().status !== "configured") return false;
  const job = await claimNextPlatformOutbox(120);
  if (!job) return false;
  await dispatchPlatformOutboxJob(job);
  return true;
};

export const reconcileStalePlatformOutbox = async (limit = 100): Promise<number> => {
  const configured = Number(process.env.WHATSAPP_CLOUD_RECONCILIATION_TIMEOUT_SECONDS ?? 3_600);
  const timeout = Number.isInteger(configured) && configured >= 60 ? configured : 3_600;
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  return pg.begin(async tx => {
  const rows = await tx`
    WITH candidates AS (
      SELECT outbox.id, outbox.message_id, message.status AS message_status
      FROM whatsapp_outbox outbox
      INNER JOIN whatsapp_messages message ON message.id = outbox.message_id
      WHERE outbox.sender_kind = 'ganatri_platform'
        AND outbox.status = 'reconciling'
        AND outbox.updated_at <= NOW() - make_interval(secs => ${timeout})
      ORDER BY outbox.updated_at ASC, outbox.id ASC
      FOR UPDATE OF outbox SKIP LOCKED
      LIMIT ${safeLimit}
    )
    UPDATE whatsapp_outbox outbox
    SET status = CASE WHEN candidates.message_status IN ('delivered', 'read') THEN 'sent'::whatsapp_outbox_status_enum ELSE 'dead_letter'::whatsapp_outbox_status_enum END,
        last_error_code = CASE WHEN candidates.message_status IN ('delivered', 'read') THEN NULL ELSE 'platform_submission_unresolved' END,
        last_error_message = CASE WHEN candidates.message_status IN ('delivered', 'read') THEN NULL ELSE 'Platform submission remained unresolved after reconciliation' END,
        updated_at = NOW()
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING outbox.message_id, outbox.status
  `;
  for (const row of rows as Array<Record<string, unknown>>) {
    if (row.status === "dead_letter") {
      await tx`
        UPDATE whatsapp_messages
        SET status = CASE WHEN status IN ('queued', 'sending', 'sent') THEN 'failed'::whatsapp_message_status_enum ELSE status END,
            failure_code = CASE WHEN status IN ('queued', 'sending', 'sent') THEN 'platform_submission_unresolved' ELSE failure_code END,
            failure_message = CASE WHEN status IN ('queued', 'sending', 'sent') THEN 'Platform submission remained unresolved after reconciliation' ELSE failure_message END
        WHERE id = ${row.message_id}
      `;
    }
  }
  return rows.length;
  });
};
