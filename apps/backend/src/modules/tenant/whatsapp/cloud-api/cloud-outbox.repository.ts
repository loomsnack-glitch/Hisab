import { randomUUID } from "node:crypto";
import type { WhatsAppCloudOutboxOperationDTO } from "@repo/types";
import { pg } from "@/config/db";
import { completeInvoiceOutbox } from "../whatsapp.repository";
import { releaseCloudQuota, settleCloudQuota } from "./cloud-quota.repository";
import { cloudReconciliationTimeoutSeconds } from "./cloud-reconciliation-config";
import {
  mapCloudOutboxReconciliationSummary,
  type CloudOutboxReconciliationSummary,
} from "./cloud-outbox-summary";
import type { CloudTemplateSendSnapshot } from "./cloud-template-admission";

export type CloudOutboxJob = {
  organizationId: string;
  accountId: string;
  outboxId: string;
  messageId: string;
  idempotencyKey: string;
  phoneNumber: string;
  phoneNumberId: string;
  credentialReference: string;
  credentialKeyVersion: string;
  messageType: "text" | "document" | "image" | "template";
  templateSnapshot?: CloudTemplateSendSnapshot | null;
  body: string | null;
  caption: string | null;
  attachmentStorageKey: string | null;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  attemptCount: number;
  leaseOwner: string;
};

export type CloudOutboxPartition = { count: number; index: number };

export type CloudOutboxActionResult = {
  outboxId: string;
  previousStatus: "pending" | "retryable";
  nextStatus: "pending" | "dead_letter";
};

export type CloudOutboxActionAttempt =
  | { applied: true; result: CloudOutboxActionResult }
  | { applied: false; reason: "not_found" | "not_actionable"; currentStatus?: string };

export const getCloudOutboxReconciliationSummary = async (
  organizationId: string,
): Promise<CloudOutboxReconciliationSummary> => {
  const [row] = await pg`
    SELECT
      COUNT(*) FILTER (WHERE outbox.status = 'reconciling') AS reconciling_count,
      MIN(outbox.updated_at) FILTER (WHERE outbox.status = 'reconciling') AS oldest_reconciling_at,
      COUNT(*) FILTER (WHERE outbox.status = 'retryable') AS retryable_count,
      COUNT(*) FILTER (WHERE outbox.status = 'dead_letter') AS dead_letter_count
    FROM whatsapp_outbox outbox
    INNER JOIN whatsapp_accounts account
      ON account.id = outbox.whatsapp_account_id
     AND account.organization_id = outbox.organization_id
    WHERE outbox.organization_id = ${organizationId}
      AND outbox.kind = 'template'
      AND account.provider = 'cloud_api'
  `;
  return mapCloudOutboxReconciliationSummary(row as Record<string, unknown> | undefined);
};

const mapCloudOutboxOperation = (row: Record<string, unknown>): WhatsAppCloudOutboxOperationDTO => {
  const attemptCount = Number(row.attempt_count ?? 0);
  return {
    id: String(row.id),
    storeName: String(row.store_name),
    kind: row.kind as WhatsAppCloudOutboxOperationDTO["kind"],
    status: row.status as WhatsAppCloudOutboxOperationDTO["status"],
    attemptCount: Number.isFinite(attemptCount) && attemptCount >= 0 ? Math.trunc(attemptCount) : 0,
    lastErrorCode: row.last_error_code == null || String(row.last_error_code).trim() === "" ? null : String(row.last_error_code),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    nextAttemptAt: String(row.next_attempt_at),
  };
};

export const listCloudOutboxOperations = async (
  organizationId: string,
  limit = 50,
): Promise<WhatsAppCloudOutboxOperationDTO[]> => {
  const rows = await pg`
    SELECT outbox.id,
           stores.name AS store_name,
           outbox.kind,
           outbox.status,
           outbox.attempt_count,
           outbox.last_error_code,
           outbox.created_at,
           outbox.updated_at,
           outbox.next_attempt_at
    FROM whatsapp_outbox outbox
    INNER JOIN whatsapp_accounts account
      ON account.id = outbox.whatsapp_account_id
     AND account.organization_id = outbox.organization_id
    INNER JOIN stores
      ON stores.id = outbox.store_id
     AND stores.organization_id = outbox.organization_id
    WHERE outbox.organization_id = ${organizationId}
      AND outbox.kind = 'template'
      AND account.provider = 'cloud_api'
      AND outbox.status IN ('pending', 'retryable', 'reconciling', 'dead_letter')
    ORDER BY CASE outbox.status
               WHEN 'reconciling' THEN 0
               WHEN 'retryable' THEN 1
               WHEN 'pending' THEN 2
               ELSE 3
             END,
             outbox.updated_at ASC,
             outbox.id ASC
    LIMIT ${safeLimit(limit)}
  `;
  return rows.map((row: Record<string, unknown>) => mapCloudOutboxOperation(row));
};

const updateCampaignAfterDeadLetter = async (tx: Bun.TransactionSQL, outboxId: string): Promise<void> => {
  await tx`
    UPDATE whatsapp_campaign_recipients
    SET status = 'dead_letter'::whatsapp_outbox_status_enum,
        failure_code = 'operator_dead_letter',
        failure_message = 'Cloud outbox entry was dead-lettered by an operator',
        updated_at = NOW()
    WHERE outbox_id = ${outboxId}
      AND status NOT IN ('sent', 'dead_letter', 'cancelled')
  `;
  await tx`
    UPDATE whatsapp_campaigns campaign
    SET sent_recipients = (
          SELECT COUNT(*)
          FROM whatsapp_campaign_recipients recipient
          WHERE recipient.campaign_id = campaign.id
            AND recipient.status = 'sent'
        ),
        failed_recipients = (
          SELECT COUNT(*)
          FROM whatsapp_campaign_recipients recipient
          WHERE recipient.campaign_id = campaign.id
            AND recipient.status IN ('dead_letter', 'cancelled')
        ),
        status = CASE
          WHEN EXISTS (
            SELECT 1
            FROM whatsapp_campaign_recipients recipient
            WHERE recipient.campaign_id = campaign.id
              AND recipient.status IN ('dead_letter', 'cancelled')
          ) THEN 'failed'::whatsapp_campaign_status_enum
          WHEN NOT EXISTS (
            SELECT 1
            FROM whatsapp_campaign_recipients recipient
            WHERE recipient.campaign_id = campaign.id
              AND recipient.status IN ('pending', 'processing', 'retryable')
          ) THEN 'completed'::whatsapp_campaign_status_enum
          ELSE campaign.status
        END,
        updated_at = NOW()
    WHERE id = (
      SELECT campaign_id
      FROM whatsapp_campaign_recipients
      WHERE outbox_id = ${outboxId}
      LIMIT 1
    )
  `;
};

const recordCloudOperatorAction = async (
  tx: Bun.TransactionSQL,
  organizationId: string,
  actorUserId: string,
  outboxId: string,
  action: "retry" | "dead_letter",
  previousStatus: "pending" | "retryable",
  nextStatus: "pending" | "dead_letter",
): Promise<void> => {
  await tx`
    INSERT INTO whatsapp_cloud_operator_actions (
      organization_id, actor_user_id, outbox_id, action, previous_status, next_status
    ) VALUES (
      ${organizationId}, ${actorUserId}, ${outboxId}, ${action},
      ${previousStatus}::whatsapp_outbox_status_enum,
      ${nextStatus}::whatsapp_outbox_status_enum
    )
  `;
};

export const retryCloudOutboxNow = async (
  organizationId: string,
  actorUserId: string,
  outboxId: string,
): Promise<CloudOutboxActionAttempt> => pg.begin(async tx => {
  const [row] = await tx`
    SELECT outbox.id, outbox.status, message.id AS message_id, campaign.status AS campaign_status
    FROM whatsapp_outbox outbox
    INNER JOIN whatsapp_accounts account
      ON account.id = outbox.whatsapp_account_id
     AND account.organization_id = outbox.organization_id
    INNER JOIN whatsapp_messages message ON message.id = outbox.message_id
    LEFT JOIN whatsapp_campaign_recipients recipient ON recipient.outbox_id = outbox.id
    LEFT JOIN whatsapp_campaigns campaign ON campaign.id = recipient.campaign_id
    WHERE outbox.id = ${outboxId}
      AND outbox.organization_id = ${organizationId}
      AND outbox.kind = 'template'
      AND account.provider = 'cloud_api'
    FOR UPDATE OF outbox
  `;
  if (!row) return { applied: false, reason: "not_found" };
  if (row.status !== "retryable") return { applied: false, reason: "not_actionable", currentStatus: String(row.status) };
  if (row.campaign_status === "cancelled") return { applied: false, reason: "not_actionable", currentStatus: "campaign_cancelled" };

  await tx`
    UPDATE whatsapp_messages
    SET status = 'queued', failure_code = NULL, failure_message = NULL
    WHERE id = ${row.message_id} AND status = 'failed'
  `;
  await tx`
    UPDATE whatsapp_outbox
    SET status = 'pending',
        next_attempt_at = NOW(),
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = NOW()
    WHERE id = ${row.id} AND status = 'retryable'
  `;
  await tx`
    UPDATE whatsapp_campaign_recipients
    SET status = 'pending', failure_code = NULL, failure_message = NULL, updated_at = NOW()
    WHERE outbox_id = ${row.id} AND status = 'retryable'
  `;
  await tx`
    UPDATE whatsapp_campaigns campaign
    SET status = CASE
          WHEN campaign.status IN ('failed', 'completed') THEN 'sending'::whatsapp_campaign_status_enum
          ELSE campaign.status
        END,
        updated_at = NOW()
    WHERE id = (
      SELECT campaign_id
      FROM whatsapp_campaign_recipients
      WHERE outbox_id = ${row.id}
      LIMIT 1
    )
      AND status <> 'cancelled'
  `;
  await recordCloudOperatorAction(tx, organizationId, actorUserId, String(row.id), "retry", "retryable", "pending");
  return {
    applied: true,
    result: { outboxId: String(row.id), previousStatus: "retryable", nextStatus: "pending" },
  };
});

export const deadLetterCloudOutboxNow = async (
  organizationId: string,
  actorUserId: string,
  outboxId: string,
): Promise<CloudOutboxActionAttempt> => pg.begin(async tx => {
  const [row] = await tx`
    SELECT outbox.id, outbox.status, outbox.message_id, outbox.cloud_quota_reservation_id
    FROM whatsapp_outbox outbox
    INNER JOIN whatsapp_accounts account
      ON account.id = outbox.whatsapp_account_id
     AND account.organization_id = outbox.organization_id
    WHERE outbox.id = ${outboxId}
      AND outbox.organization_id = ${organizationId}
      AND outbox.kind = 'template'
      AND account.provider = 'cloud_api'
    FOR UPDATE OF outbox
  `;
  if (!row) return { applied: false, reason: "not_found" };
  if (!["pending", "retryable"].includes(String(row.status))) {
    return { applied: false, reason: "not_actionable", currentStatus: String(row.status) };
  }

  await tx`
    UPDATE whatsapp_messages
    SET status = CASE WHEN status IN ('delivered', 'read', 'failed') THEN status ELSE 'failed'::whatsapp_message_status_enum END,
        failure_code = CASE WHEN status IN ('delivered', 'read') THEN failure_code ELSE 'operator_dead_letter' END,
        failure_message = CASE WHEN status IN ('delivered', 'read') THEN failure_message ELSE 'Cloud outbox entry was dead-lettered by an operator' END
    WHERE id = ${row.message_id}
  `;
  await tx`
    UPDATE whatsapp_outbox
    SET status = 'dead_letter',
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = 'operator_dead_letter',
        last_error_message = 'Cloud outbox entry was dead-lettered by an operator',
        updated_at = NOW()
    WHERE id = ${row.id} AND status IN ('pending', 'retryable')
  `;
  if (row.cloud_quota_reservation_id) await releaseCloudQuota(tx, String(row.cloud_quota_reservation_id));
  await updateCampaignAfterDeadLetter(tx, String(row.id));
  await recordCloudOperatorAction(tx, organizationId, actorUserId, String(row.id), "dead_letter", row.status as "pending" | "retryable", "dead_letter");
  return {
    applied: true,
    result: { outboxId: String(row.id), previousStatus: row.status as "pending" | "retryable", nextStatus: "dead_letter" },
  };
});

const safeLimit = (limit: number): number =>
  Math.min(Math.max(Math.trunc(limit), 1), 100);

export const claimNextCloudOutbox = async (
  leaseSeconds: number,
  partition: CloudOutboxPartition = { count: 1, index: 0 },
): Promise<CloudOutboxJob | null> => {
  const leaseOwner = `cloud-outbox-${randomUUID()}`;
  const safeLeaseSeconds = Math.min(Math.max(Math.trunc(leaseSeconds), 30), 300);
  const safePartitionCount = Math.min(Math.max(Math.trunc(partition.count), 1), 128);
  const safePartitionIndex = Math.min(
    Math.max(Math.trunc(partition.index), 0),
    safePartitionCount - 1,
  );

  return pg.begin(async (tx) => {
    await tx`
      UPDATE whatsapp_outbox outbox
      SET status = 'retryable',
          lease_owner = NULL,
          lease_expires_at = NULL,
          next_attempt_at = NOW(),
          updated_at = NOW()
      FROM whatsapp_accounts account
      WHERE outbox.whatsapp_account_id = account.id
        AND outbox.status = 'processing'
        AND account.provider = 'cloud_api'
        AND (outbox.lease_expires_at IS NULL OR outbox.lease_expires_at < NOW())
    `;

    const [candidate] = await tx`
      SELECT outbox.id
      FROM whatsapp_outbox outbox
      INNER JOIN whatsapp_accounts account
        ON account.id = outbox.whatsapp_account_id
      INNER JOIN whatsapp_business_accounts business
        ON business.id = account.whatsapp_business_account_id
       AND business.organization_id = account.organization_id
      WHERE outbox.kind = 'template'
        AND outbox.status IN ('pending', 'retryable')
        AND outbox.next_attempt_at <= NOW()
        AND account.provider = 'cloud_api'
        AND account.cloud_status = 'connected'
        AND account.cloud_phone_number_id IS NOT NULL
        AND business.credential_reference IS NOT NULL
        AND business.credential_key_version IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM whatsapp_account_stores assignment
          WHERE assignment.whatsapp_account_id = outbox.whatsapp_account_id
            AND assignment.store_id = outbox.store_id
        )
        AND (((hashtext(account.id::text)::bigint % ${safePartitionCount}) + ${safePartitionCount}) % ${safePartitionCount}) = ${safePartitionIndex}
        AND NOT EXISTS (
          SELECT 1
          FROM whatsapp_outbox active
          WHERE active.whatsapp_account_id = outbox.whatsapp_account_id
            AND active.status = 'processing'
            AND (active.lease_expires_at IS NULL OR active.lease_expires_at > NOW())
        )
      ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC, outbox.id ASC
      FOR UPDATE OF outbox SKIP LOCKED
      LIMIT ${safeLimit(1)}
    `;
    if (!candidate) return null;

    const [claimed] = await tx`
      UPDATE whatsapp_outbox
      SET status = 'processing',
          attempt_count = attempt_count + 1,
          lease_owner = ${leaseOwner},
          lease_expires_at = NOW() + make_interval(secs => ${safeLeaseSeconds}),
          updated_at = NOW()
      WHERE id = ${candidate.id}
      RETURNING id, message_id, whatsapp_account_id, attempt_count, lease_owner
    `;
    if (!claimed) return null;

    await tx`
      UPDATE whatsapp_messages
      SET status = 'sending',
          failure_code = NULL,
          failure_message = NULL
      WHERE id = ${claimed.message_id}
        AND status IN ('queued', 'failed')
    `;
    await tx`
      UPDATE whatsapp_campaign_recipients
      SET status = 'processing', updated_at = NOW()
      WHERE outbox_id = ${claimed.id} AND status = 'pending'
    `;
    await tx`
      UPDATE whatsapp_campaigns
      SET status = 'sending', updated_at = NOW()
      WHERE status = 'queued'
        AND id = (
          SELECT campaign_id
          FROM whatsapp_campaign_recipients
          WHERE outbox_id = ${claimed.id}
            AND status IN ('pending', 'processing')
          LIMIT 1
        )
    `;

    const [job] = await tx`
      SELECT
        outbox.organization_id,
        outbox.id AS outbox_id,
        outbox.message_id,
        outbox.whatsapp_account_id,
        account.cloud_phone_number_id,
        business.credential_reference,
        business.credential_key_version,
        message.message_type,
        message.idempotency_key,
        message.body,
        message.caption,
        message.attachment_storage_key,
        message.attachment_file_name,
        message.attachment_mime_type,
        outbox.cloud_template_snapshot,
        conversation.contact_phone_number,
        outbox.attempt_count,
        outbox.lease_owner
      FROM whatsapp_outbox outbox
      INNER JOIN whatsapp_accounts account
        ON account.id = outbox.whatsapp_account_id
      INNER JOIN whatsapp_business_accounts business
        ON business.id = account.whatsapp_business_account_id
       AND business.organization_id = account.organization_id
      INNER JOIN whatsapp_messages message ON message.id = outbox.message_id
      INNER JOIN whatsapp_conversations conversation
        ON conversation.id = message.conversation_id
      WHERE outbox.id = ${claimed.id}
    `;
    if (!job) throw new Error("Claimed Cloud outbox entry could not be loaded");

    return {
      organizationId: String(job.organization_id),
      accountId: String(job.whatsapp_account_id),
      outboxId: String(job.outbox_id),
      messageId: String(job.message_id),
      idempotencyKey: String(job.idempotency_key),
      phoneNumber: String(job.contact_phone_number),
      phoneNumberId: String(job.cloud_phone_number_id),
      credentialReference: String(job.credential_reference),
      credentialKeyVersion: String(job.credential_key_version),
      messageType: job.message_type as CloudOutboxJob["messageType"],
      templateSnapshot: parseTemplateSnapshot(job.cloud_template_snapshot),
      body: (job.body as string | null | undefined) ?? null,
      caption: (job.caption as string | null | undefined) ?? null,
      attachmentStorageKey:
        (job.attachment_storage_key as string | null | undefined) ?? null,
      attachmentFileName:
        (job.attachment_file_name as string | null | undefined) ?? null,
      attachmentMimeType:
        (job.attachment_mime_type as string | null | undefined) ?? null,
      attemptCount: Number(job.attempt_count),
      leaseOwner: String(job.lease_owner),
    };
  });
};

const parseTemplateSnapshot = (value: unknown): CloudTemplateSendSnapshot | null => {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.bindingId !== "string" || typeof snapshot.assetId !== "string" || typeof snapshot.version !== "number" || typeof snapshot.name !== "string" || typeof snapshot.languageCode !== "string" || !Array.isArray(snapshot.components)) return null;
  return {
    bindingId: snapshot.bindingId,
    assetId: snapshot.assetId,
    version: snapshot.version,
    name: snapshot.name,
    languageCode: snapshot.languageCode,
    category: snapshot.category as CloudTemplateSendSnapshot["category"],
    intent: snapshot.intent as CloudTemplateSendSnapshot["intent"],
    components: snapshot.components as CloudTemplateSendSnapshot["components"],
    ...(Array.isArray(snapshot.templateComponents) ? { templateComponents: snapshot.templateComponents } : {}),
  };
};

export const markCloudOutboxReconciling = async (
  job: Pick<CloudOutboxJob, "outboxId" | "leaseOwner">,
  code: string,
  message: string,
): Promise<boolean> => {
  const rows = await pg`
    UPDATE whatsapp_outbox
    SET status = 'reconciling',
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = LEFT(${code}, 100),
        last_error_message = LEFT(${message}, 1_000),
        updated_at = NOW()
    WHERE id = ${job.outboxId}
      AND status = 'processing'
      AND lease_owner = ${job.leaseOwner}
      AND EXISTS (
        SELECT 1
        FROM whatsapp_accounts account
        WHERE account.id = whatsapp_outbox.whatsapp_account_id
          AND account.provider = 'cloud_api'
      )
  `;
  return rows.count === 1;
};

/**
 * Resolves an unknown provider submission after its bounded reconciliation
 * window. A message already marked delivered/read is settled; all other
 * unresolved submissions are dead-lettered and never automatically resent.
 */
export const expireStaleCloudOutboxReconciliations = async (
  limit = 100,
  organizationId?: string,
): Promise<number> => {
  const timeoutSeconds = cloudReconciliationTimeoutSeconds();
  return pg.begin(async tx => {
    const rows = await tx`
      WITH candidates AS (
        SELECT outbox.id,
               outbox.message_id,
               outbox.cloud_quota_reservation_id,
               message.status AS message_status
        FROM whatsapp_outbox outbox
        INNER JOIN whatsapp_accounts account
          ON account.id = outbox.whatsapp_account_id
        INNER JOIN whatsapp_messages message
          ON message.id = outbox.message_id
        WHERE outbox.status = 'reconciling'
          AND account.provider = 'cloud_api'
          AND (${organizationId ?? null}::uuid IS NULL OR outbox.organization_id = ${organizationId ?? null})
          AND outbox.updated_at <= NOW() - make_interval(secs => ${timeoutSeconds})
        ORDER BY outbox.updated_at ASC, outbox.id ASC
        FOR UPDATE OF outbox SKIP LOCKED
        LIMIT ${safeLimit(limit)}
      )
      UPDATE whatsapp_outbox outbox
      SET status = CASE
            WHEN candidates.message_status IN ('delivered', 'read') THEN 'sent'::whatsapp_outbox_status_enum
            ELSE 'dead_letter'::whatsapp_outbox_status_enum
          END,
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = CASE
            WHEN candidates.message_status IN ('delivered', 'read') THEN NULL
            ELSE 'cloud_submission_unresolved'
          END,
          last_error_message = CASE
            WHEN candidates.message_status IN ('delivered', 'read') THEN NULL
            ELSE 'Cloud submission remained unresolved after the reconciliation window'
          END,
          updated_at = NOW()
      FROM candidates
      WHERE outbox.id = candidates.id
      RETURNING outbox.id,
                outbox.message_id,
                outbox.cloud_quota_reservation_id,
                outbox.status,
                candidates.message_status
    `;

    for (const row of rows as Array<Record<string, unknown>>) {
      const resolved = row.status === "sent";
      if (resolved) {
        await tx`
          UPDATE whatsapp_messages
          SET sent_at = COALESCE(sent_at, NOW())
          WHERE id = ${row.message_id}
        `;
      } else {
        await tx`
          UPDATE whatsapp_messages
          SET status = CASE
                WHEN status IN ('queued', 'sending', 'sent') THEN 'failed'::whatsapp_message_status_enum
                ELSE status
              END,
              failure_code = CASE
                WHEN status IN ('queued', 'sending', 'sent') THEN 'cloud_submission_unresolved'
                ELSE failure_code
              END,
              failure_message = CASE
                WHEN status IN ('queued', 'sending', 'sent') THEN 'Cloud submission remained unresolved after the reconciliation window'
                ELSE failure_message
              END
          WHERE id = ${row.message_id}
        `;
      }

      if (row.cloud_quota_reservation_id) {
        if (resolved) {
          await settleCloudQuota(tx, String(row.cloud_quota_reservation_id));
        } else {
          await releaseCloudQuota(tx, String(row.cloud_quota_reservation_id));
        }
      }

      await tx`
        UPDATE whatsapp_campaign_recipients
        SET status = ${resolved ? "sent" : "dead_letter"}::whatsapp_outbox_status_enum,
            failure_code = ${resolved ? null : "cloud_submission_unresolved"},
            failure_message = ${resolved ? null : "Cloud submission remained unresolved after the reconciliation window"},
            updated_at = NOW()
        WHERE outbox_id = ${row.id}
          AND status NOT IN ('dead_letter', 'cancelled')
      `;

      await tx`
        UPDATE whatsapp_campaigns campaign
        SET sent_recipients = (
              SELECT COUNT(*)
              FROM whatsapp_campaign_recipients recipient
              WHERE recipient.campaign_id = campaign.id
                AND recipient.status = 'sent'
            ),
            failed_recipients = (
              SELECT COUNT(*)
              FROM whatsapp_campaign_recipients recipient
              WHERE recipient.campaign_id = campaign.id
                AND recipient.status IN ('dead_letter', 'cancelled')
            ),
            status = CASE
              WHEN EXISTS (
                SELECT 1
                FROM whatsapp_campaign_recipients recipient
                WHERE recipient.campaign_id = campaign.id
                  AND recipient.status IN ('dead_letter', 'cancelled')
              ) THEN 'failed'::whatsapp_campaign_status_enum
              WHEN NOT EXISTS (
                SELECT 1
                FROM whatsapp_campaign_recipients recipient
                WHERE recipient.campaign_id = campaign.id
                  AND recipient.status IN ('pending', 'processing', 'retryable')
              ) THEN 'completed'::whatsapp_campaign_status_enum
              ELSE campaign.status
            END,
            updated_at = NOW()
        WHERE id = (
          SELECT campaign_id
          FROM whatsapp_campaign_recipients
          WHERE outbox_id = ${row.id}
          LIMIT 1
        )
      `;
    }

    return rows.length;
  });
};

export const completeCloudOutbox = completeInvoiceOutbox;
