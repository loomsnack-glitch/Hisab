import { pg } from "@/config/db";
import * as storage from "@/services/storage";
import {
  normalizePhoneNumber,
  renderWhatsAppMessage,
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

const promotionBody = (
  body: string,
  customerName: string,
  store: { name: string; whatsappLinks: StoreMessageLink[] },
) => {
  return renderWhatsAppMessage({
    kind: "promotion",
    template: body,
    values: { customer_name: customerName, store_name: store.name },
    links: store.whatsappLinks,
  });
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
  const hasImage = Boolean(data.imageBase64 && data.imageFileName && data.imageMimeType);
  const bucket = privateBucket();
  if (hasImage && !bucket)
    return {
      status: "error",
      message: "Private media storage is not configured",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };

  const rows = await pg`
    SELECT id, name, phone
    FROM customers
    WHERE organization_id = ${organizationId}
      AND is_active = TRUE
      AND marketing_opted_out = FALSE
      AND phone IS NOT NULL
      AND phone ~ '^[+][1-9][0-9]{7,14}$'
    ORDER BY created_at ASC
    LIMIT ${MAX_CAMPAIGN_RECIPIENTS}
  `;
  if (rows.length === 0)
    return {
      status: "error",
      message:
        "No eligible customers with promotional consent and a phone number",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  const pendingLimit = Number(
    process.env.WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT ?? 1_000,
  );
  const [pending] = await pg`
    SELECT COUNT(*) AS count FROM whatsapp_outbox
    WHERE whatsapp_account_id = ${account.id} AND status IN ('pending', 'processing', 'retryable')
  `;
  if (
    Number(pending?.count ?? 0) + rows.length >
    (Number.isInteger(pendingLimit) && pendingLimit > 0 ? pendingLimit : 1_000)
  ) {
    return {
      status: "error",
      message:
        "WhatsApp account queue is full; send the promotion after pending messages are processed",
      data: null,
      code: STATUS_CODES.TOO_MANY_REQUESTS,
    };
  }
  if (
    rows.some(
      (row: Record<string, unknown>) =>
        promotionBody(data.body, String(row.name), store).length > 4096,
    )
  ) {
    return {
      status: "error",
      message:
        "Promotion message plus Store links must be 4096 characters or less",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const campaignId = crypto.randomUUID();
  let cooldownReserved = false;
  try {
    const reservation = await reservePromotionCooldown(organizationId, storeId, campaignId);
    if (!reservation.acquired) {
      return {
        status: "error",
        message: `Promotion cooldown is active; try again in ${Math.ceil(reservation.remainingSeconds / 60)} minutes`,
        data: null,
        code: STATUS_CODES.TOO_MANY_REQUESTS,
      };
    }
    cooldownReserved = true;
  } catch (error) {
    console.error("[whatsapp] promotion cooldown reservation failed", error instanceof Error ? error.message : String(error));
    return {
      status: "error",
      message: "Promotion cooldown is temporarily unavailable; retry shortly",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
  const objectKey = hasImage
    ? `whatsapp-campaigns/${organizationId}/${storeId}/${campaignId}/${data.imageFileName}`
    : null;
  try {
    if (hasImage && objectKey) {
      await storage.uploadBuffer(
        bucket,
        objectKey,
        Buffer.from(data.imageBase64!, "base64"),
        data.imageMimeType!,
      );
    }
    const result = await pg.begin(async (tx) => {
      const [campaign] = await tx`
        INSERT INTO whatsapp_campaigns (
          id, organization_id, store_id, whatsapp_account_id, title, body,
          image_storage_key, image_file_name, image_mime_type, status,
          total_recipients, created_by
        ) VALUES (
          ${campaignId}, ${organizationId}, ${storeId}, ${account.id}, ${data.title}, ${data.body},
            ${objectKey}, ${hasImage ? data.imageFileName : null}, ${hasImage ? data.imageMimeType : null}, 'queued', ${rows.length}, ${userId}
        ) RETURNING id
      `;
      if (!campaign) throw new Error("Failed to create promotion campaign");
      for (const row of rows) {
        const phone = normalizePhoneNumber(String(row.phone));
        if (!phone) continue;
        const externalChatId = `${phone.slice(1)}@s.whatsapp.net`;
        const [conversation] = await tx`
          INSERT INTO whatsapp_conversations (
            organization_id, store_id, whatsapp_account_id, customer_id,
            external_chat_id, contact_phone_number, display_name
          ) VALUES (
            ${organizationId}, ${storeId}, ${account.id}, ${row.id}, ${externalChatId}, ${phone}, ${row.name}
          )
          ON CONFLICT (whatsapp_account_id, store_id, external_chat_id)
          DO UPDATE SET customer_id = EXCLUDED.customer_id, contact_phone_number = EXCLUDED.contact_phone_number,
            display_name = EXCLUDED.display_name, updated_at = NOW()
          RETURNING id
        `;
        if (!conversation)
          throw new Error("Failed to create campaign conversation");
        const messageId = crypto.randomUUID();
        const [message] = await tx`
          INSERT INTO whatsapp_messages (
            id, organization_id, store_id, whatsapp_account_id, conversation_id,
            direction, message_type, body, caption, attachment_storage_key,
            attachment_file_name, attachment_mime_type, status, idempotency_key
          ) VALUES (
            ${messageId}, ${organizationId}, ${storeId}, ${account.id}, ${conversation.id},
            'outbound', ${hasImage ? 'image' : 'text'}, ${hasImage ? null : promotionBody(data.body, String(row.name), store)}, ${hasImage ? promotionBody(data.body, String(row.name), store) : null},
            ${objectKey}, ${hasImage ? data.imageFileName : null}, ${hasImage ? data.imageMimeType : null}, 'queued', ${`promotion:${campaignId}:${row.id}`}
          ) RETURNING id
        `;
        if (!message) throw new Error("Failed to create campaign message");
        const [outbox] = await tx`
          INSERT INTO whatsapp_outbox (organization_id, store_id, whatsapp_account_id, message_id, kind, status)
          VALUES (${organizationId}, ${storeId}, ${account.id}, ${message.id}, 'promotion', 'pending') RETURNING id
        `;
        if (!outbox) throw new Error("Failed to create campaign outbox");
        await tx`
          INSERT INTO whatsapp_campaign_recipients (
            organization_id, store_id, campaign_id, customer_id, phone_number, message_id, outbox_id, status
          ) VALUES (${organizationId}, ${storeId}, ${campaignId}, ${row.id}, ${phone}, ${message.id}, ${outbox.id}, 'pending')
        `;
      }
      return { recipientCount: rows.length };
    });
    return {
      status: "success",
      message: "Promotion queued for eligible customers",
      data: {
        campaignId,
        recipientCount: result.recipientCount,
        queuedCount: result.recipientCount,
      },
      code: STATUS_CODES.CREATED,
    };
  } catch (error) {
    try {
      if (bucket && objectKey) await storage.deleteObject(bucket, objectKey);
    } catch {
      /* keep original error */
    }
    if (cooldownReserved) {
      try {
        if ((await redis.get(cooldownKey(organizationId, storeId))) === campaignId) {
          await redis.del(cooldownKey(organizationId, storeId));
        }
      } catch {
        /* the database campaign remains the cooldown fallback */
      }
    }
    if (error instanceof repository.WhatsAppOutboxLimitError)
      return {
        status: "error",
        message: "WhatsApp account queue is full; retry shortly",
        data: null,
        code: STATUS_CODES.TOO_MANY_REQUESTS,
      };
    throw error;
  }
};
