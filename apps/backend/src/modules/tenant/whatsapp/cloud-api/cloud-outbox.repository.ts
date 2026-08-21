import { randomUUID } from "node:crypto";
import { pg } from "@/config/db";
import { completeInvoiceOutbox } from "../whatsapp.repository";

export type CloudOutboxJob = {
  organizationId: string;
  accountId: string;
  outboxId: string;
  messageId: string;
  phoneNumber: string;
  phoneNumberId: string;
  credentialReference: string;
  credentialKeyVersion: string;
  messageType: "text" | "document" | "image";
  body: string | null;
  caption: string | null;
  attachmentStorageKey: string | null;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  attemptCount: number;
  leaseOwner: string;
};

export type CloudOutboxPartition = { count: number; index: number };

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
      WHERE outbox.kind IN ('invoice', 'text', 'document', 'promotion')
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
        message.body,
        message.caption,
        message.attachment_storage_key,
        message.attachment_file_name,
        message.attachment_mime_type,
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
      phoneNumber: String(job.contact_phone_number),
      phoneNumberId: String(job.cloud_phone_number_id),
      credentialReference: String(job.credential_reference),
      credentialKeyVersion: String(job.credential_key_version),
      messageType: job.message_type as CloudOutboxJob["messageType"],
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

export const completeCloudOutbox = completeInvoiceOutbox;
