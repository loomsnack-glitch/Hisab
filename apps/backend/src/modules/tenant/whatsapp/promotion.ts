import { pg } from "@/config/db";
import * as storage from "@/services/storage";
import {
  normalizePhoneNumber,
  STATUS_CODES,
  type ServiceResponse,
  type StoreMessageLink,
  type WhatsAppCreatePromotionJSON,
  type WhatsAppPromotionCooldownDTO,
  type WhatsAppPromotionResponseDTO,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { redis } from "@/config/redis";
import * as repository from "./whatsapp.repository";
import * as messageTemplate from "./message-template";
import { getCloudAccountScope } from "./cloud-api/cloud-account.repository";
import { getCloudTemplateBindingSnapshot } from "./cloud-api/cloud-template.repository";
import { enqueueCloudTemplateSend } from "./cloud-api/cloud-template-send.service";
import { cloudMediaUrlTtlSeconds } from "./cloud-api/cloud-media";
import { buildPromotionCloudComponents } from "./promotion-cloud-components";
import { cloudFeatureCallersEnabled } from "./cloud-api/cloud-feature";
import { retryCloudOutboxNow } from "./cloud-api/cloud-outbox.repository";
import { createCloudTemplateOutbox } from "./cloud-api/cloud-template-outbox.repository";
import type { CloudTemplateSendSnapshot } from "./cloud-api/cloud-template-admission";
import { promotionRecipientResendAvailableAt, promotionRecipientResendIsBlocked } from "./promotion-recipient-actions";

const privateBucket = () => process.env.MINIO_BUCKET_NAME?.trim() || "";
const MAX_CAMPAIGN_RECIPIENTS = 1_000;
const PROMOTION_COOLDOWN_SECONDS = 60 * 60;
const PROMOTION_COOLDOWN_PREFIX = "whatsapp:promotion:cooldown:";
const REDIS_STATUS_TIMEOUT_MS = 1_000;
const promotionCooldownEnabled = () => {
  const configured = process.env.WHATSAPP_PROMOTION_COOLDOWN_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
};

const cooldownKey = (organizationId: string, storeId: string) =>
  `${PROMOTION_COOLDOWN_PREFIX}${organizationId}:${storeId}`;

const cooldownFromLatestCampaign = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  return Math.max(0, PROMOTION_COOLDOWN_SECONDS - elapsed);
};

export const getPromotionCooldown = async (
  organizationId: string,
  storeId: string,
): Promise<WhatsAppPromotionCooldownDTO> => {
  if (!promotionCooldownEnabled()) {
    return { active: false, remainingSeconds: 0, nextAvailableAt: null };
  }
  const latestCampaign = await repository.getLatestPromotionCreatedAt(organizationId, storeId);
  const databaseRemaining = cooldownFromLatestCampaign(latestCampaign);
  let redisRemaining = 0;
  try {
    const ttl = await Promise.race([
      redis.ttl(cooldownKey(organizationId, storeId)),
      new Promise<number>((_, reject) => setTimeout(() => reject(new Error("Redis status timeout")), REDIS_STATUS_TIMEOUT_MS)),
    ]);
    redisRemaining = ttl > 0 ? ttl : 0;
  } catch (error) {
    console.warn("[whatsapp] promotion cooldown Redis read failed", error instanceof Error ? error.message : String(error));
  }
  const remainingSeconds = Math.max(databaseRemaining, redisRemaining);
  return {
    active: remainingSeconds > 0,
    remainingSeconds,
    nextAvailableAt: remainingSeconds > 0 ? new Date(Date.now() + remainingSeconds * 1000).toISOString() : null,
  };
};

const reservePromotionCooldown = async (organizationId: string, storeId: string, campaignId: string) => {
  if (!promotionCooldownEnabled()) return { acquired: true, remainingSeconds: 0 };
  const current = await getPromotionCooldown(organizationId, storeId);
  if (current.active) return { acquired: false, remainingSeconds: current.remainingSeconds };
  const result = await redis.set(
    cooldownKey(organizationId, storeId),
    campaignId,
    "EX",
    String(PROMOTION_COOLDOWN_SECONDS),
    "NX",
  );
  if (result === "OK") return { acquired: true, remainingSeconds: PROMOTION_COOLDOWN_SECONDS };
  const afterRace = await getPromotionCooldown(organizationId, storeId);
  return { acquired: false, remainingSeconds: afterRace.remainingSeconds || PROMOTION_COOLDOWN_SECONDS };
};

export const getPromotionDashboard = async (
  organizationId: string,
  storeId: string,
  days = 30,
  limit = 20,
  page = 1,
) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const [campaignData, cooldown] = await Promise.all([
    repository.listPromotionCampaigns(organizationId, storeId, safeLimit, days, safePage),
    getPromotionCooldown(organizationId, storeId),
  ]);
  return {
    ...campaignData,
    cooldown,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: campaignData.stats.totalCampaigns,
      totalPages: Math.ceil(campaignData.stats.totalCampaigns / safeLimit),
    },
  };
};

const promotionRecipientActionTarget = async (
  organizationId: string,
  storeId: string,
  campaignId: string,
  recipientId: string,
) => {
  const [row] = await pg`
    SELECT recipient.id, recipient.status, recipient.outbox_id,
           recipient.customer_id, recipient.phone_number,
           recipient.failure_code, recipient.updated_at,
           customer.name AS customer_name,
           outbox.status AS outbox_status,
           outbox.whatsapp_account_id,
           outbox.cloud_template_snapshot
    FROM whatsapp_campaign_recipients recipient
    INNER JOIN whatsapp_campaigns campaign
      ON campaign.id = recipient.campaign_id
     AND campaign.organization_id = recipient.organization_id
     AND campaign.store_id = recipient.store_id
    INNER JOIN customers customer
      ON customer.id = recipient.customer_id
     AND customer.organization_id = recipient.organization_id
      LEFT JOIN whatsapp_outbox outbox
        ON outbox.id = recipient.outbox_id
       AND outbox.organization_id = recipient.organization_id
       AND outbox.store_id = recipient.store_id
    WHERE recipient.id = ${recipientId}
      AND recipient.organization_id = ${organizationId}
      AND recipient.store_id = ${storeId}
      AND recipient.campaign_id = ${campaignId}
  `;
  return row as Record<string, unknown> | undefined;
};

const snapshotForResend = (value: unknown): CloudTemplateSendSnapshot | null => {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;
  if (
    typeof snapshot.bindingId !== "string" ||
    typeof snapshot.assetId !== "string" ||
    typeof snapshot.version !== "number" ||
    typeof snapshot.name !== "string" ||
    typeof snapshot.languageCode !== "string" ||
    typeof snapshot.category !== "string" ||
    typeof snapshot.intent !== "string" ||
    !Array.isArray(snapshot.components)
  ) return null;
  return snapshot as unknown as CloudTemplateSendSnapshot;
};

export const getPromotionRecipients = async (
  organizationId: string,
  storeId: string,
  campaignId: string,
  status: "all" | "failed" | "retryable" = "all",
) => ({ recipients: await repository.listPromotionRecipients(organizationId, storeId, campaignId, status) });

export const retryPromotionRecipient = async (
  userId: string,
  organizationId: string,
  storeId: string,
  campaignId: string,
  recipientId: string,
): Promise<ServiceResponse<{ recipientId: string; action: "retry"; outboxId: string } | null>> => {
  const target = await promotionRecipientActionTarget(organizationId, storeId, campaignId, recipientId);
  if (!target) return { status: "error", message: "Promotion recipient not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (target.status !== "retryable" || target.outbox_status !== "retryable" || !target.outbox_id) {
    return { status: "error", message: "This recipient is no longer waiting for a retry", data: null, code: STATUS_CODES.CONFLICT };
  }
  const result = await retryCloudOutboxNow(organizationId, userId, String(target.outbox_id));
  if (!result.applied) return { status: "error", message: "This recipient is no longer waiting for a retry", data: null, code: STATUS_CODES.CONFLICT };
  return { status: "success", message: "Promotion message queued for retry", data: { recipientId, action: "retry", outboxId: String(target.outbox_id) }, code: STATUS_CODES.SUCCESS };
};

export const resendPromotionRecipient = async (
  userId: string,
  organizationId: string,
  storeId: string,
  campaignId: string,
  recipientId: string,
): Promise<ServiceResponse<{ recipientId: string; action: "resend"; outboxId: string } | null>> => {
  const target = await promotionRecipientActionTarget(organizationId, storeId, campaignId, recipientId);
  if (!target) return { status: "error", message: "Promotion recipient not found", data: null, code: STATUS_CODES.NOT_FOUND };
  if (promotionRecipientResendIsBlocked(target.failure_code, target.updated_at)) {
    const availableAt = promotionRecipientResendAvailableAt(target.failure_code, target.updated_at);
    return {
      status: "error",
      message: `Meta temporarily limited this message to protect healthy engagement. Reset & resend is available after ${availableAt ? new Date(availableAt).toLocaleString() : "24 hours"}.`,
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }
  const snapshot = snapshotForResend(target.cloud_template_snapshot);
  if (target.status !== "dead_letter" || target.outbox_status !== "dead_letter" || !target.outbox_id || !snapshot) {
    return { status: "error", message: "This failed recipient cannot be resent because its original Cloud template snapshot is unavailable", data: null, code: STATUS_CODES.CONFLICT };
  }
  let queued: Awaited<ReturnType<typeof createCloudTemplateOutbox>>;
  try {
    queued = await createCloudTemplateOutbox({
      organizationId,
      storeId,
      accountId: String(target.whatsapp_account_id),
      customerId: String(target.customer_id),
      customerPhone: String(target.phone_number),
      customerName: String(target.customer_name),
      campaignId,
      campaignKey: campaignId,
      intent: "promotion",
      snapshot,
      messageId: crypto.randomUUID(),
      idempotencyKey: `promotion:${campaignId}:${recipientId}:resend:${crypto.randomUUID()}`,
      resendLockKey: `promotion-resend:${campaignId}:${recipientId}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Cloud template changed after admission; retry with the current approved template") {
      return {
        status: "error",
        message: "This failed recipient uses an older approved Cloud template. Refresh and assign the current approved template, then start a new promotion.",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    throw error;
  }
  await pg`
    UPDATE whatsapp_campaigns
    SET status = CASE WHEN status <> 'cancelled' THEN 'sending'::whatsapp_campaign_status_enum ELSE status END,
        updated_at = NOW()
    WHERE id = ${campaignId}
      AND organization_id = ${organizationId}
      AND store_id = ${storeId}
  `;
  return { status: "success", message: queued.deduplicated ? "Promotion message was already queued to send again" : "Promotion message queued to send again", data: { recipientId, action: "resend", outboxId: queued.outboxId }, code: STATUS_CODES.SUCCESS };
};

type PromotionCandidate = { id: string; name: string; phone: string };

const eligiblePromotionCustomers = async (organizationId: string): Promise<PromotionCandidate[]> => {
  const rows = await pg`
    SELECT id, name, phone
    FROM customers
    WHERE organization_id = ${organizationId}
      AND is_active = TRUE
      AND marketing_opted_in = TRUE
      AND marketing_opted_out = FALSE
      AND whatsapp_suppressed = FALSE
      AND phone IS NOT NULL
      AND phone ~ '^[+][1-9][0-9]{7,14}$'
    ORDER BY created_at ASC
    LIMIT ${MAX_CAMPAIGN_RECIPIENTS}
  `;
  return rows.flatMap((row: Record<string, unknown>) => {
    const phone = normalizePhoneNumber(String(row.phone ?? ""));
    return phone ? [{ id: String(row.id), name: String(row.name), phone }] : [];
  });
};

const updateCloudCampaignAggregate = async (organizationId: string, campaignId: string) => {
  await pg`
    UPDATE whatsapp_campaigns campaign
    SET failed_recipients = (
          SELECT COUNT(*) FROM whatsapp_campaign_recipients recipient
          WHERE recipient.campaign_id = campaign.id AND recipient.status = 'dead_letter'
        ),
        status = CASE
          WHEN EXISTS (
            SELECT 1 FROM whatsapp_campaign_recipients recipient
            WHERE recipient.campaign_id = campaign.id
              AND recipient.status IN ('pending', 'processing', 'retryable')
          ) THEN 'queued'::whatsapp_campaign_status_enum
          WHEN EXISTS (
            SELECT 1 FROM whatsapp_campaign_recipients recipient
            WHERE recipient.campaign_id = campaign.id AND recipient.status = 'dead_letter'
          ) THEN 'failed'::whatsapp_campaign_status_enum
          ELSE campaign.status
        END,
        updated_at = NOW()
    WHERE campaign.organization_id = ${organizationId} AND campaign.id = ${campaignId}
  `;
};

const markCloudPromotionRecipientFailed = async (
  organizationId: string,
  storeId: string,
  campaignId: string,
  customerId: string,
  message: string,
) => {
  await pg`
    UPDATE whatsapp_campaign_recipients
    SET status = 'dead_letter',
        failure_code = 'cloud_enqueue_failed',
        failure_message = LEFT(${message}, 1_000),
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
      AND campaign_id = ${campaignId}
      AND customer_id = ${customerId}
      AND message_id IS NULL
  `;
};

const createCloudPromotion = async (
  userId: string,
  organizationId: string,
  storeId: string,
  account: { id: string },
  store: { name: string; whatsappLinks: StoreMessageLink[] },
  data: WhatsAppCreatePromotionJSON,
): Promise<ServiceResponse<WhatsAppPromotionResponseDTO | null>> => {
  if (!data.cloudTemplateBindingId) return { status: "error", message: "Choose an approved Cloud promotion template", data: null, code: STATUS_CODES.CONFLICT };
  const scope = await getCloudAccountScope(organizationId, account.id);
  if (!scope?.businessAccountId) return { status: "error", message: "Cloud WhatsApp account is not ready for template sends", data: null, code: STATUS_CODES.CONFLICT };
  const binding = await getCloudTemplateBindingSnapshot(organizationId, data.cloudTemplateBindingId);
  if (!binding || binding.binding.storeId !== storeId || binding.binding.whatsappBusinessAccountId !== scope.businessAccountId || binding.binding.kind !== "promotion") return { status: "error", message: "The selected Cloud promotion template is not linked to this Store", data: null, code: STATUS_CODES.CONFLICT };
  if (!binding.asset || binding.asset.status !== "approved" || binding.asset.category !== "marketing") return { status: "error", message: "The selected Cloud promotion template is not approved for marketing", data: null, code: STATUS_CODES.CONFLICT };
  const localTemplate = await messageTemplate.getTemplate(organizationId, storeId, binding.binding.localTemplateId);
  if (!localTemplate || !localTemplate.isActive || localTemplate.kind !== "promotion") return { status: "error", message: "The selected promotion template is no longer active for this Store", data: null, code: STATUS_CODES.CONFLICT };
  if (data.body.trim() !== localTemplate.body.trim()) return { status: "error", message: "Cloud promotions must use the selected approved promotion template", data: null, code: STATUS_CODES.CONFLICT };
  const candidates = await eligiblePromotionCustomers(organizationId);
  if (candidates.length === 0) return { status: "error", message: "No eligible customers with promotional consent and a phone number", data: null, code: STATUS_CODES.CONFLICT };

  const hasImage = Boolean(data.imageBase64 && data.imageFileName && data.imageMimeType);
  const bucket = privateBucket();
  if (hasImage && !bucket) return { status: "error", message: "Private media storage is not configured", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
  const imageBytes = hasImage ? Buffer.from(data.imageBase64!, "base64") : null;
  if (imageBytes && (!imageBytes.length || imageBytes.length > 10 * 1024 * 1024)) return { status: "error", message: "Promotion image must be 10 MB or smaller", data: null, code: STATUS_CODES.BAD_REQUEST };

  const campaignId = crypto.randomUUID();
  let cooldownReserved = false;
  try {
    const reservation = await reservePromotionCooldown(organizationId, storeId, campaignId);
    if (!reservation.acquired) return { status: "error", message: `Promotion cooldown is active; try again in ${Math.ceil(reservation.remainingSeconds / 60)} minutes`, data: null, code: STATUS_CODES.TOO_MANY_REQUESTS };
    cooldownReserved = true;
    const objectKey = hasImage ? `whatsapp-campaigns/${organizationId}/${storeId}/${campaignId}/image` : null;
    if (hasImage && objectKey) await storage.uploadBuffer(bucket, objectKey, imageBytes!, data.imageMimeType!);
    const imageLink = hasImage && objectKey ? await storage.generateSignedUrl(bucket, objectKey, cloudMediaUrlTtlSeconds()) : null;
    buildPromotionCloudComponents(
      binding.asset.components,
      localTemplate.body,
      { customer_name: candidates[0]!.name, store_name: store.name, ...Object.fromEntries(store.whatsappLinks.filter(link => link.isActive).map(link => [`link_${link.key}`, link.url])) },
      imageLink,
      binding.binding.variableMapping,
    );
    await pg.begin(async tx => {
      const [campaign] = await tx`
        INSERT INTO whatsapp_campaigns (
          id, organization_id, store_id, whatsapp_account_id, title, body,
          image_storage_key, image_file_name, image_mime_type, status,
          total_recipients, created_by
        ) VALUES (
          ${campaignId}, ${organizationId}, ${storeId}, ${account.id}, ${data.title}, ${localTemplate.body},
          ${objectKey}, ${hasImage ? data.imageFileName : null}, ${hasImage ? data.imageMimeType : null}, 'queued', ${candidates.length}, ${userId}
        ) RETURNING id
      `;
      if (!campaign) throw new Error("Failed to create promotion campaign");
      for (const candidate of candidates) {
        await tx`
          INSERT INTO whatsapp_campaign_recipients (
            organization_id, store_id, campaign_id, customer_id, phone_number, status
          ) VALUES (${organizationId}, ${storeId}, ${campaignId}, ${candidate.id}, ${candidate.phone}, 'pending')
        `;
      }
    });

    let queuedCount = 0;
    for (const candidate of candidates) {
      try {
        const componentParameters = buildPromotionCloudComponents(
          binding.asset.components,
          localTemplate.body,
          { customer_name: candidate.name, store_name: store.name, ...Object.fromEntries(store.whatsappLinks.filter(link => link.isActive).map(link => [`link_${link.key}`, link.url])) },
          imageLink,
          binding.binding.variableMapping,
        );
        const queued = await enqueueCloudTemplateSend(userId, organizationId, {
          storeId,
          accountId: account.id,
          customerId: candidate.id,
          campaignId,
          bindingId: binding.binding.id,
          campaignKey: campaignId,
          idempotencyKey: `promotion:${campaignId}:${candidate.id}`,
          intent: "promotion",
          componentParameters,
        });
        if (queued.status === "error" || !queued.data) {
          await markCloudPromotionRecipientFailed(organizationId, storeId, campaignId, candidate.id, queued.message);
          continue;
        }
        queuedCount += 1;
      } catch (error) {
        await markCloudPromotionRecipientFailed(organizationId, storeId, campaignId, candidate.id, error instanceof Error ? error.message : "Cloud promotion recipient could not be queued");
      }
    }
    await updateCloudCampaignAggregate(organizationId, campaignId);
    return { status: "success", message: "Promotion queued for eligible customers", data: { campaignId, recipientCount: candidates.length, queuedCount }, code: STATUS_CODES.CREATED };
  } catch (error) {
    const objectKey = `whatsapp-campaigns/${organizationId}/${storeId}/${campaignId}/image`;
    try { if (bucket && hasImage) await storage.deleteObject(bucket, objectKey); } catch { /* preserve the original failure */ }
    if (cooldownReserved) {
      try { if ((await redis.get(cooldownKey(organizationId, storeId))) === campaignId) await redis.del(cooldownKey(organizationId, storeId)); } catch { /* database campaign remains the fallback */ }
    }
    return { status: "error", message: error instanceof Error ? error.message : "Cloud promotion could not be queued", data: null, code: STATUS_CODES.CONFLICT };
  }
};

export const createPromotion = async (
  userId: string,
  organizationId: string,
  storeId: string,
  data: WhatsAppCreatePromotionJSON,
): Promise<ServiceResponse<WhatsAppPromotionResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(
    organizationId,
    userId,
  );
  const store = await organizationRepository.getStoreById(
    organizationId,
    storeId,
  );
  if (!organization || !store)
    return {
      status: "error",
      message: "Organization or Store not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  const account = await repository.getAccount(organizationId, storeId);
  if (!account)
    return {
      status: "error",
      message: "Link the Store WhatsApp account before sending promotions",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  if (account.status !== "connected")
    return {
      status: "error",
      message: "Connect the Store WhatsApp account before sending promotions",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  if (!cloudFeatureCallersEnabled()) return { status: "error", message: "WhatsApp Cloud feature callers are disabled", data: null, code: STATUS_CODES.CONFLICT };
  if (account.provider !== "cloud_api") return { status: "error", message: "This WhatsApp account uses a retired provider; connect a Cloud API account before sending promotions", data: null, code: STATUS_CODES.CONFLICT };
  return createCloudPromotion(userId, organizationId, storeId, account, { name: store.name, whatsappLinks: store.whatsappLinks }, data);
};
