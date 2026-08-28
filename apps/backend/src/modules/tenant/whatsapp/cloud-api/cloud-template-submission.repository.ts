import {
  WhatsAppCloudTemplateSubmissionSchema,
  type WhatsAppCloudTemplateSubmissionDTO,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

export type CloudTemplateSubmissionInput = {
  organizationId: string;
  whatsappBusinessAccountId: string;
  originatingStoreId?: string | null;
  localTemplateId?: string | null;
  kind: "bill" | "due_reminder" | "promotion";
  friendlyName: string;
  metaTemplateName: string;
  languageCode: string;
  category: "marketing" | "utility" | "authentication" | "unknown";
  requestedComponents: unknown[];
  sampleValues: Record<string, unknown>;
  idempotencyKey: string;
  createdBy: string;
};

const mapSubmission = (row: Record<string, unknown>): WhatsAppCloudTemplateSubmissionDTO => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return WhatsAppCloudTemplateSubmissionSchema.parse({
    id: mapped.id,
    organizationId: mapped.organizationId,
    whatsappBusinessAccountId: mapped.whatsappBusinessAccountId,
    originatingStoreId: mapped.originatingStoreId ?? null,
    localTemplateId: mapped.localTemplateId ?? null,
    kind: mapped.kind,
    friendlyName: mapped.friendlyName,
    metaTemplateName: mapped.metaTemplateName,
    languageCode: mapped.languageCode,
    category: mapped.category,
    requestedComponents: Array.isArray(mapped.requestedComponents) ? mapped.requestedComponents : [],
    sampleValues: mapped.sampleValues && typeof mapped.sampleValues === "object" && !Array.isArray(mapped.sampleValues)
      ? mapped.sampleValues
      : {},
    idempotencyKey: mapped.idempotencyKey,
    metaTemplateId: mapped.metaTemplateId ?? null,
    status: mapped.status,
    rejectionReason: mapped.rejectionReason ?? null,
    lastErrorCode: mapped.lastErrorCode ?? null,
    lastErrorMessage: mapped.lastErrorMessage ?? null,
    submittedAt: mapped.submittedAt ?? null,
    providerUpdatedAt: mapped.providerUpdatedAt ?? null,
    createdBy: mapped.createdBy,
    updatedBy: mapped.updatedBy ?? null,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  });
};

export const mapCloudTemplateSubmission = mapSubmission;

export const createCloudTemplateSubmission = async (
  input: CloudTemplateSubmissionInput,
): Promise<WhatsAppCloudTemplateSubmissionDTO> => pg.begin(async tx => {
  const [inserted] = await tx`
    INSERT INTO whatsapp_cloud_template_submissions (
      organization_id, whatsapp_business_account_id, originating_store_id,
      local_template_id, kind, friendly_name, meta_template_name,
      language_code, category, requested_components, sample_values,
      idempotency_key, created_by, updated_by
    ) VALUES (
      ${input.organizationId}, ${input.whatsappBusinessAccountId}, ${input.originatingStoreId ?? null},
      ${input.localTemplateId ?? null}, ${input.kind}, ${input.friendlyName}, ${input.metaTemplateName},
      ${input.languageCode}, ${input.category}, ${input.requestedComponents}::jsonb,
      ${input.sampleValues}::jsonb, ${input.idempotencyKey}, ${input.createdBy}, ${input.createdBy}
    )
    ON CONFLICT DO NOTHING
    RETURNING *
  `;
  if (inserted) return mapSubmission(inserted as Record<string, unknown>);

  const [existing] = await tx`
    SELECT *
    FROM whatsapp_cloud_template_submissions
    WHERE organization_id = ${input.organizationId}
      AND whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
      AND idempotency_key = ${input.idempotencyKey}
  `;
  if (!existing) {
    const [activeByName] = await tx`
      SELECT *
      FROM whatsapp_cloud_template_submissions
      WHERE organization_id = ${input.organizationId}
        AND whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
        AND meta_template_name = ${input.metaTemplateName}
        AND language_code = ${input.languageCode}
        AND status IN ('draft', 'submitting', 'pending')
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (activeByName) return mapSubmission(activeByName as Record<string, unknown>);
    throw new Error("Cloud template submission could not be created");
  }
  const existingSubmission = mapSubmission(existing as Record<string, unknown>);
  if (
    existingSubmission.metaTemplateName !== input.metaTemplateName ||
    existingSubmission.languageCode !== input.languageCode ||
    existingSubmission.kind !== input.kind ||
    JSON.stringify(existingSubmission.requestedComponents) !== JSON.stringify(input.requestedComponents)
  ) {
    throw new Error("Cloud template submission idempotency key was reused with different content");
  }
  return existingSubmission;
});

export const claimCloudTemplateSubmission = async (
  organizationId: string,
  submissionId: string,
  updatedBy: string,
): Promise<WhatsAppCloudTemplateSubmissionDTO | null> => {
  const [row] = await pg`
    UPDATE whatsapp_cloud_template_submissions
    SET status = 'submitting',
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND id = ${submissionId}
      AND (
        status IN ('draft', 'failed')
        OR (status = 'submitting' AND updated_at < NOW() - INTERVAL '10 minutes')
      )
    RETURNING *
  `;
  return row ? mapSubmission(row as Record<string, unknown>) : null;
};

export const getCloudTemplateSubmission = async (
  organizationId: string,
  submissionId: string,
): Promise<WhatsAppCloudTemplateSubmissionDTO | null> => {
  const [row] = await pg`
    SELECT *
    FROM whatsapp_cloud_template_submissions
    WHERE organization_id = ${organizationId}
      AND id = ${submissionId}
  `;
  return row ? mapSubmission(row as Record<string, unknown>) : null;
};

export type CloudTemplateSubmissionUpdate = {
  status?: "draft" | "submitting" | "pending" | "approved" | "rejected" | "paused" | "disabled" | "failed" | "archived";
  metaTemplateId?: string | null;
  rejectionReason?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  submittedAt?: string | null;
  providerUpdatedAt?: string | null;
  updatedBy?: string | null;
  expectedStatus?: "draft" | "submitting" | "pending" | "approved" | "rejected" | "paused" | "disabled" | "failed" | "archived";
};

export const updateCloudTemplateSubmission = async (
  organizationId: string,
  submissionId: string,
  update: CloudTemplateSubmissionUpdate,
): Promise<WhatsAppCloudTemplateSubmissionDTO | null> => {
  const [row] = await pg`
    UPDATE whatsapp_cloud_template_submissions
    SET status = COALESCE(${update.status ?? null}, status),
        meta_template_id = COALESCE(${update.metaTemplateId ?? null}, meta_template_id),
        rejection_reason = ${update.rejectionReason ?? null},
        last_error_code = ${update.lastErrorCode ?? null},
        last_error_message = ${update.lastErrorMessage ?? null},
        submitted_at = COALESCE(${update.submittedAt ?? null}, submitted_at),
        provider_updated_at = COALESCE(${update.providerUpdatedAt ?? null}, provider_updated_at),
        updated_by = COALESCE(${update.updatedBy ?? null}, updated_by),
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND id = ${submissionId}
      AND (${update.expectedStatus ?? null}::text IS NULL OR status = ${update.expectedStatus ?? null})
    RETURNING *
  `;
  return row ? mapSubmission(row as Record<string, unknown>) : null;
};

export const listCloudTemplateSubmissions = async (
  organizationId: string,
  whatsappBusinessAccountId: string,
  originatingStoreId?: string,
): Promise<WhatsAppCloudTemplateSubmissionDTO[]> => {
  const rows = originatingStoreId
    ? await pg`
        SELECT *
        FROM whatsapp_cloud_template_submissions
        WHERE organization_id = ${organizationId}
          AND whatsapp_business_account_id = ${whatsappBusinessAccountId}
          AND originating_store_id = ${originatingStoreId}
        ORDER BY updated_at DESC, id DESC
      `
    : await pg`
        SELECT *
        FROM whatsapp_cloud_template_submissions
        WHERE organization_id = ${organizationId}
          AND whatsapp_business_account_id = ${whatsappBusinessAccountId}
        ORDER BY updated_at DESC, id DESC
      `;
  return rows.map((row: Record<string, unknown>) => mapSubmission(row));
};

export type CloudTemplateProviderStatusUpdate = {
  wabaId: string;
  providerTemplateId: string | null;
  templateName: string | null;
  languageCode: string | null;
  status: "pending" | "approved" | "rejected" | "paused" | "disabled";
  category: "marketing" | "utility" | "authentication" | null;
  reason: string | null;
  occurredAt: string;
};

export const applyCloudTemplateProviderStatus = async (
  input: CloudTemplateProviderStatusUpdate,
): Promise<boolean> => pg.begin(async tx => {
  const category = input.category;
  const templateId = input.providerTemplateId;
  const templateName = input.templateName;
  const languageCode = input.languageCode;
  const reason = input.status === "rejected" ? input.reason : null;

  const updatedAssets = await tx`
    UPDATE whatsapp_cloud_templates assets
    SET status = CASE
          WHEN assets.status IN ('approved', 'rejected', 'paused', 'disabled')
            AND ${input.status} IN ('pending') THEN assets.status
          ELSE ${input.status}
        END,
        category = COALESCE(${category}, assets.category),
        rejection_reason = ${reason},
        provider_updated_at = ${input.occurredAt},
        last_synced_at = NOW(),
        updated_at = NOW()
    FROM whatsapp_business_accounts business
    WHERE business.id = assets.whatsapp_business_account_id
      AND business.waba_id = ${input.wabaId}
      AND (assets.provider_updated_at IS NULL OR assets.provider_updated_at <= ${input.occurredAt}::timestamptz)
      AND (
        (${templateId}::varchar IS NOT NULL AND assets.meta_template_id = ${templateId})
        OR (
          ${templateId}::varchar IS NULL
          AND assets.name = ${templateName}
          AND assets.language_code = ${languageCode}
        )
      )
    RETURNING assets.id, assets.organization_id, assets.whatsapp_business_account_id,
              assets.meta_template_id, assets.name, assets.language_code, assets.status
  `;

  const updatedSubmissions = await tx`
    UPDATE whatsapp_cloud_template_submissions submissions
    SET status = CASE
          WHEN submissions.status IN ('approved', 'rejected', 'paused', 'disabled')
            AND ${input.status} IN ('pending') THEN submissions.status
          ELSE ${input.status}
        END,
        meta_template_id = COALESCE(${templateId}, submissions.meta_template_id),
        category = COALESCE(${category}, submissions.category),
        rejection_reason = ${reason},
        provider_updated_at = ${input.occurredAt},
        updated_at = NOW()
    FROM whatsapp_business_accounts business
    WHERE business.id = submissions.whatsapp_business_account_id
      AND business.waba_id = ${input.wabaId}
      AND (submissions.provider_updated_at IS NULL OR submissions.provider_updated_at <= ${input.occurredAt}::timestamptz)
      AND (
        (${templateId}::varchar IS NOT NULL AND submissions.meta_template_id = ${templateId})
        OR (
          ${templateId}::varchar IS NULL
          AND submissions.meta_template_name = ${templateName}
          AND submissions.language_code = ${languageCode}
        )
      )
    RETURNING submissions.id, submissions.organization_id,
              submissions.whatsapp_business_account_id, submissions.originating_store_id,
              submissions.meta_template_id, submissions.meta_template_name,
              submissions.language_code, submissions.status
  `;

  for (const asset of updatedAssets as Array<Record<string, unknown>>) {
    await tx`
      INSERT INTO whatsapp_cloud_template_audit_events (
        organization_id, whatsapp_business_account_id, event_type, details
      ) VALUES (
        ${asset.organization_id}, ${asset.whatsapp_business_account_id},
        'provider_status_updated', ${{
          resource: "asset",
          assetId: asset.id,
          metaTemplateId: asset.meta_template_id,
          name: asset.name,
          languageCode: asset.language_code,
          status: asset.status,
          reason,
          occurredAt: input.occurredAt,
        }}::jsonb
      )
    `;
  }

  for (const submission of updatedSubmissions as Array<Record<string, unknown>>) {
    await tx`
      INSERT INTO whatsapp_cloud_template_audit_events (
        organization_id, whatsapp_business_account_id, store_id, submission_id,
        event_type, details
      ) VALUES (
        ${submission.organization_id}, ${submission.whatsapp_business_account_id},
        ${submission.originating_store_id ?? null}, ${submission.id},
        'provider_status_updated', ${{
          resource: "submission",
          metaTemplateId: submission.meta_template_id,
          name: submission.meta_template_name,
          languageCode: submission.language_code,
          status: submission.status,
          reason,
          occurredAt: input.occurredAt,
        }}::jsonb
      )
    `;
  }

  return updatedAssets.length > 0 || updatedSubmissions.length > 0;
});
