import {
  WhatsAppCloudTemplateAssetSchema,
  WhatsAppCloudTemplateBindingSchema,
  type WhatsAppCloudTemplateAssetDTO,
  type WhatsAppCloudTemplateBindingDTO,
  type WhatsAppMessageTemplateKind,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import {
  buildDefaultCloudTemplateVariableMapping,
  validateCloudTemplateVariableMapping,
  type CloudTemplateVariableMapping,
} from "./cloud-template-variable-mapping";

export type CloudTemplateAssetInput = {
  organizationId: string;
  whatsappBusinessAccountId: string;
  metaTemplateId: string;
  name: string;
  languageCode: string;
  category: "marketing" | "utility" | "authentication" | "unknown";
  status: "approved" | "rejected" | "paused" | "disabled" | "pending" | "unknown";
  components: unknown[];
  rejectionReason: string | null;
  providerUpdatedAt: string | null;
};

export type CloudTemplateBindingSnapshot = {
  binding: WhatsAppCloudTemplateBindingDTO;
  asset: WhatsAppCloudTemplateAssetDTO;
};

const boundedText = (value: unknown, label: string, maxLength: number): string => {
  if (typeof value !== "string") throw new Error(`Cloud template ${label} is invalid`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new Error(`Cloud template ${label} is invalid`);
  }
  return normalized;
};

const boundedComponentText = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("Cloud template component text is invalid");
  const normalized = value.trim();
  if (!normalized || normalized.length > 4_096) {
    throw new Error("Cloud template component text is invalid");
  }
  return normalized;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeComponents = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || value.length > 20) {
    throw new Error("Cloud template components are invalid");
  }
  for (const component of value) {
    if (!isRecord(component)) throw new Error("Cloud template components are invalid");
    const type = boundedText(component.type, "component type", 32);
    if (!/^[A-Za-z_]+$/.test(type)) {
      throw new Error("Cloud template component type is invalid");
    }
    // Meta returns `text: null` for non-text headers (for example IMAGE).
    // Preserve that provider shape; only validate text when a text value exists.
    // Body/footer text may contain line breaks; Meta preserves them in the
    // provider response and they are valid WhatsApp template content.
    if (component.text !== undefined && component.text !== null) {
      boundedComponentText(component.text);
    }
    if (component.buttons !== undefined && (!Array.isArray(component.buttons) || component.buttons.length > 10)) {
      throw new Error("Cloud template buttons are invalid");
    }
  }
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length > 64 * 1024) {
    throw new Error("Cloud template components are too large");
  }
  return value;
};

const providerTimestamp = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Cloud template update time is invalid");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Cloud template update time is invalid");
  return date.toISOString();
};

const nullableBoundedText = (value: unknown, maxLength: number): string | null => {
  if (value === null || value === undefined) return null;
  return boundedText(value, "rejection reason", maxLength);
};

const normalizeStatus = (value: unknown): CloudTemplateAssetInput["status"] => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "approved" || normalized === "rejected" || normalized === "paused" || normalized === "disabled" || normalized === "pending") return normalized;
  return "unknown";
};

const normalizeCategory = (value: unknown): CloudTemplateAssetInput["category"] => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "marketing" || normalized === "utility" || normalized === "authentication") return normalized;
  return "unknown";
};

const normalizeLanguageCode = (value: unknown): string => {
  const raw = typeof value === "string"
    ? value
    : value && typeof value === "object" && "code" in value
      ? (value as { code?: unknown }).code
      : null;
  const language = boundedText(raw, "language", 64);
  if (!/^[A-Za-z]{2,10}(?:[_-][A-Za-z0-9]{2,10})*$/.test(language)) {
    throw new Error("Cloud template language is invalid");
  }
  return language;
};

/** Normalize provider data before it reaches SQL or the public DTO. */
export const normalizeCloudTemplateAsset = (
  organizationId: string,
  whatsappBusinessAccountId: string,
  providerTemplate: Record<string, unknown>,
): CloudTemplateAssetInput => {
  const name = boundedText(providerTemplate.name, "name", 512);
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error("Cloud template name is invalid");
  return {
    organizationId,
    whatsappBusinessAccountId,
    metaTemplateId: boundedText(providerTemplate.id, "id", 255),
    name,
    languageCode: normalizeLanguageCode(providerTemplate.language),
    category: normalizeCategory(providerTemplate.category),
    status: normalizeStatus(providerTemplate.status),
    components: normalizeComponents(providerTemplate.components),
    rejectionReason: nullableBoundedText(providerTemplate.rejected_reason ?? providerTemplate.rejection_reason, 1000),
    providerUpdatedAt: providerTimestamp(providerTemplate.updated_at),
  };
};

const mapAsset = (row: Record<string, unknown>): WhatsAppCloudTemplateAssetDTO => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return WhatsAppCloudTemplateAssetSchema.parse({
    id: mapped.id,
    organizationId: mapped.organizationId,
    whatsappBusinessAccountId: mapped.whatsappBusinessAccountId,
    metaTemplateId: mapped.metaTemplateId,
    name: mapped.name,
    languageCode: mapped.languageCode,
    category: mapped.category,
    status: mapped.status,
    components: Array.isArray(mapped.components) ? mapped.components : [],
    rejectionReason: mapped.rejectionReason ?? null,
    providerUpdatedAt: mapped.providerUpdatedAt ?? null,
    lastSyncedAt: mapped.lastSyncedAt,
    version: Number(mapped.version),
  });
};

export const mapCloudTemplateAssetFromJoinedRow = (
  row: Record<string, unknown>,
): WhatsAppCloudTemplateAssetDTO => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return mapAsset({
    id: mapped.assetId,
    organization_id: mapped.assetOrganizationId,
    whatsapp_business_account_id: mapped.assetWhatsappBusinessAccountId,
    meta_template_id: mapped.metaTemplateId,
    name: mapped.assetName,
    language_code: mapped.languageCode,
    category: mapped.assetCategory,
    status: mapped.assetStatus,
    components: mapped.components,
    rejection_reason: mapped.rejectionReason,
    provider_updated_at: mapped.providerUpdatedAt,
    last_synced_at: mapped.lastSyncedAt,
    version: mapped.version,
  });
};

const mapBinding = (row: Record<string, unknown>): WhatsAppCloudTemplateBindingDTO => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return WhatsAppCloudTemplateBindingSchema.parse({
    id: mapped.id,
    organizationId: mapped.organizationId,
    storeId: mapped.storeId,
    localTemplateId: mapped.localTemplateId,
    cloudTemplateId: mapped.cloudTemplateId,
    whatsappBusinessAccountId: mapped.whatsappBusinessAccountId,
    localTemplateBody: (mapped.localTemplateBody as string | null | undefined) ?? null,
    variableMapping: (mapped.variableMapping as CloudTemplateVariableMapping | undefined) ?? {},
    kind: mapped.kind,
    isDefault: Boolean(mapped.isDefault),
    isActive: Boolean(mapped.isActive),
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  });
};

export const upsertCloudTemplateAssets = async (
  assets: CloudTemplateAssetInput[],
): Promise<WhatsAppCloudTemplateAssetDTO[]> => {
  if (assets.length === 0) return [];
  return pg.begin(async tx => {
    const result: WhatsAppCloudTemplateAssetDTO[] = [];
    for (const asset of assets) {
      const [row] = await tx`
        INSERT INTO whatsapp_cloud_templates (
          organization_id, whatsapp_business_account_id, meta_template_id, name,
          language_code, category, status, components, rejection_reason,
          provider_updated_at, last_synced_at
        ) VALUES (
          ${asset.organizationId}, ${asset.whatsappBusinessAccountId}, ${asset.metaTemplateId}, ${asset.name},
          ${asset.languageCode}, ${asset.category}, ${asset.status}, ${asset.components}::jsonb,
          ${asset.rejectionReason}, ${asset.providerUpdatedAt}, NOW()
        )
        ON CONFLICT (whatsapp_business_account_id, meta_template_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          language_code = EXCLUDED.language_code,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          components = EXCLUDED.components,
          rejection_reason = EXCLUDED.rejection_reason,
          provider_updated_at = EXCLUDED.provider_updated_at,
          last_synced_at = NOW(),
          version = CASE
            WHEN whatsapp_cloud_templates.name IS DISTINCT FROM EXCLUDED.name
              OR whatsapp_cloud_templates.language_code IS DISTINCT FROM EXCLUDED.language_code
              OR whatsapp_cloud_templates.category IS DISTINCT FROM EXCLUDED.category
              OR whatsapp_cloud_templates.status IS DISTINCT FROM EXCLUDED.status
              OR whatsapp_cloud_templates.components IS DISTINCT FROM EXCLUDED.components
              OR whatsapp_cloud_templates.rejection_reason IS DISTINCT FROM EXCLUDED.rejection_reason
            THEN whatsapp_cloud_templates.version + 1
            ELSE whatsapp_cloud_templates.version
          END,
          updated_at = NOW()
        RETURNING *
      `;
      if (row) result.push(mapAsset(row as Record<string, unknown>));
    }
    return result;
  });
};

export const listCloudTemplateAssets = async (
  organizationId: string,
  whatsappBusinessAccountId: string,
): Promise<WhatsAppCloudTemplateAssetDTO[]> => {
  const rows = await pg`
    SELECT *
    FROM whatsapp_cloud_templates
    WHERE organization_id = ${organizationId}
      AND whatsapp_business_account_id = ${whatsappBusinessAccountId}
    ORDER BY LOWER(name), language_code
  `;
  return rows.map((row: Record<string, unknown>) => mapAsset(row));
};

export const createCloudTemplateBinding = async (input: {
  organizationId: string;
  storeId: string;
  localTemplateId: string;
  cloudTemplateId: string;
  whatsappBusinessAccountId: string;
  variableMapping?: CloudTemplateVariableMapping;
  kind: WhatsAppMessageTemplateKind;
  isDefault: boolean;
  createdBy: string;
}): Promise<WhatsAppCloudTemplateBindingDTO> => pg.begin(async tx => {
  const [localTemplate] = await tx`
    SELECT id, kind, body
    FROM whatsapp_message_templates
    WHERE id = ${input.localTemplateId}
      AND organization_id = ${input.organizationId}
      AND store_id = ${input.storeId}
      AND kind = ${input.kind}
      AND is_active = TRUE
  `;
  if (!localTemplate) throw new Error("Local WhatsApp template is unavailable");
  const [asset] = await tx`
    SELECT id, status, category, components
    FROM whatsapp_cloud_templates
    WHERE id = ${input.cloudTemplateId}
      AND organization_id = ${input.organizationId}
      AND whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
  `;
  if (!asset) throw new Error("Cloud WhatsApp template is unavailable");
  const expectedCategory = input.kind === "promotion" ? "marketing" : "utility";
  if (asset.status !== "approved" || asset.category !== expectedCategory) {
    throw new Error("Cloud WhatsApp template must be approved and match the message category");
  }
  const variableMapping = validateCloudTemplateVariableMapping(
    input.variableMapping ?? buildDefaultCloudTemplateVariableMapping(String(localTemplate.body), asset.components),
    String(localTemplate.body),
    asset.components,
  );
  const [assignment] = await tx`
    SELECT 1
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts
      ON accounts.id = assignments.whatsapp_account_id
     AND accounts.organization_id = assignments.organization_id
    WHERE assignments.organization_id = ${input.organizationId}
      AND assignments.store_id = ${input.storeId}
      AND accounts.provider = 'cloud_api'
      AND accounts.whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
    LIMIT 1
  `;
  if (!assignment) throw new Error("Cloud WhatsApp account is not assigned to this Store");
  if (input.isDefault) {
    await tx`
      UPDATE whatsapp_cloud_template_bindings
      SET is_default = FALSE, updated_by = ${input.createdBy}, updated_at = NOW()
      WHERE organization_id = ${input.organizationId}
        AND store_id = ${input.storeId}
        AND kind = ${input.kind}
    `;
  }
  const [row] = await tx`
    INSERT INTO whatsapp_cloud_template_bindings (
      organization_id, store_id, local_template_id, cloud_template_id,
      whatsapp_business_account_id, local_template_body, variable_mapping,
      kind, is_default, created_by, updated_by
    ) VALUES (
      ${input.organizationId}, ${input.storeId}, ${input.localTemplateId}, ${asset.id},
      ${input.whatsappBusinessAccountId}, ${localTemplate.body}, ${variableMapping}::jsonb,
      ${input.kind}, ${input.isDefault}, ${input.createdBy}, ${input.createdBy}
    )
    ON CONFLICT (organization_id, store_id, local_template_id, cloud_template_id)
    DO UPDATE SET
      whatsapp_business_account_id = EXCLUDED.whatsapp_business_account_id,
      local_template_body = EXCLUDED.local_template_body,
      variable_mapping = EXCLUDED.variable_mapping,
      kind = EXCLUDED.kind,
      is_default = EXCLUDED.is_default,
      is_active = TRUE,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *
  `;
  if (!row) throw new Error("Cloud WhatsApp template binding could not be saved");
  return mapBinding(row as Record<string, unknown>);
});

export const createCloudTemplateDefaultBinding = async (input: {
  organizationId: string;
  storeId: string;
  cloudTemplateId: string;
  whatsappBusinessAccountId: string;
  kind: WhatsAppMessageTemplateKind;
  localTemplateName: string;
  localTemplateBody: string;
  createdBy: string;
}): Promise<WhatsAppCloudTemplateBindingDTO> => pg.begin(async tx => {
  const [assignment] = await tx`
    SELECT 1
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts ON accounts.id = assignments.whatsapp_account_id AND accounts.organization_id = assignments.organization_id
    WHERE assignments.organization_id = ${input.organizationId}
      AND assignments.store_id = ${input.storeId}
      AND accounts.provider = 'cloud_api'
      AND accounts.whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
    LIMIT 1
  `;
  if (!assignment) throw new Error("Cloud WhatsApp account is not assigned to this Store");

  const [existing] = await tx`
    SELECT *
    FROM whatsapp_cloud_template_bindings
    WHERE organization_id = ${input.organizationId}
      AND store_id = ${input.storeId}
      AND cloud_template_id = ${input.cloudTemplateId}
      AND kind = ${input.kind}
      AND is_active = TRUE
    LIMIT 1
  `;
  if (existing) {
    const [existingAsset] = await tx`
      SELECT status, category
      FROM whatsapp_cloud_templates
      WHERE id = ${input.cloudTemplateId}
        AND organization_id = ${input.organizationId}
        AND whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
    `;
    if (!existingAsset || existingAsset.status !== "approved" || existingAsset.category !== (input.kind === "promotion" ? "marketing" : "utility")) {
      throw new Error("Cloud WhatsApp template must be approved and match the message category");
    }
    await tx`
      UPDATE whatsapp_cloud_template_bindings
      SET is_default = TRUE, updated_by = ${input.createdBy}, updated_at = NOW()
      WHERE organization_id = ${input.organizationId} AND store_id = ${input.storeId} AND kind = ${input.kind}
    `;
    const [updated] = await tx`
      SELECT * FROM whatsapp_cloud_template_bindings
      WHERE organization_id = ${input.organizationId} AND id = ${existing.id}
    `;
    if (!updated) throw new Error("Cloud WhatsApp template binding could not be loaded");
    return mapBinding(updated as Record<string, unknown>);
  }
  const [asset] = await tx`
    SELECT id, status, category, components
    FROM whatsapp_cloud_templates
    WHERE id = ${input.cloudTemplateId}
      AND organization_id = ${input.organizationId}
      AND whatsapp_business_account_id = ${input.whatsappBusinessAccountId}
  `;
  if (!asset || asset.status !== "approved" || asset.category !== (input.kind === "promotion" ? "marketing" : "utility")) {
    throw new Error("Cloud WhatsApp template must be approved and match the message category");
  }
  const variableMapping = validateCloudTemplateVariableMapping(
    buildDefaultCloudTemplateVariableMapping(input.localTemplateBody, Array.isArray(asset.components) ? asset.components : []),
    input.localTemplateBody,
    Array.isArray(asset.components) ? asset.components : [],
  );
  await tx`
    UPDATE whatsapp_cloud_template_bindings
    SET is_default = FALSE, updated_by = ${input.createdBy}, updated_at = NOW()
    WHERE organization_id = ${input.organizationId} AND store_id = ${input.storeId} AND kind = ${input.kind}
  `;
  await tx`
    UPDATE whatsapp_message_templates
    SET is_default = FALSE, updated_by = ${input.createdBy}, updated_at = NOW()
    WHERE organization_id = ${input.organizationId}
      AND store_id = ${input.storeId}
      AND kind = ${input.kind}
      AND is_default = TRUE
      AND is_active = TRUE
  `;
  const [localTemplate] = await tx`
    INSERT INTO whatsapp_message_templates (organization_id, store_id, kind, name, body, is_default, created_by, updated_by)
    VALUES (${input.organizationId}, ${input.storeId}, ${input.kind}, ${input.localTemplateName.slice(0, 120)}, ${input.localTemplateBody}, TRUE, ${input.createdBy}, ${input.createdBy})
    RETURNING id
  `;
  if (!localTemplate) throw new Error("Local WhatsApp template could not be created");
  const [row] = await tx`
    INSERT INTO whatsapp_cloud_template_bindings (
      organization_id, store_id, local_template_id, cloud_template_id,
      whatsapp_business_account_id, local_template_body, variable_mapping,
      kind, is_default, created_by, updated_by
    ) VALUES (
      ${input.organizationId}, ${input.storeId}, ${localTemplate.id}, ${input.cloudTemplateId},
      ${input.whatsappBusinessAccountId}, ${input.localTemplateBody}, ${variableMapping}::jsonb,
      ${input.kind}, TRUE, ${input.createdBy}, ${input.createdBy}
    ) RETURNING *
  `;
  if (!row) throw new Error("Cloud WhatsApp template binding could not be created");
  return mapBinding(row as Record<string, unknown>);
});

export const listCloudTemplateBindings = async (
  organizationId: string,
  storeId: string,
  whatsappBusinessAccountId?: string,
): Promise<WhatsAppCloudTemplateBindingDTO[]> => {
  const rows = whatsappBusinessAccountId
    ? await pg`
        SELECT * FROM whatsapp_cloud_template_bindings
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND whatsapp_business_account_id = ${whatsappBusinessAccountId}
        ORDER BY kind, is_default DESC, updated_at DESC
      `
    : await pg`
        SELECT * FROM whatsapp_cloud_template_bindings
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY kind, is_default DESC, updated_at DESC
      `;
  return rows.map((row: Record<string, unknown>) => mapBinding(row));
};

export const isCloudAccountAssignedToStore = async (
  organizationId: string,
  storeId: string,
  whatsappBusinessAccountId: string,
): Promise<boolean> => {
  const [row] = await pg`
    SELECT 1
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts
      ON accounts.id = assignments.whatsapp_account_id
     AND accounts.organization_id = assignments.organization_id
    WHERE assignments.organization_id = ${organizationId}
      AND assignments.store_id = ${storeId}
      AND accounts.provider = 'cloud_api'
      AND accounts.whatsapp_business_account_id = ${whatsappBusinessAccountId}
    LIMIT 1
  `;
  return Boolean(row);
};

export const getCloudTemplateBindingSnapshot = async (
  organizationId: string,
  bindingId: string,
): Promise<CloudTemplateBindingSnapshot | null> => {
  const [row] = await pg`
    SELECT bindings.*, assets.id AS asset_id, assets.organization_id AS asset_organization_id,
           assets.whatsapp_business_account_id AS asset_whatsapp_business_account_id,
           assets.meta_template_id, assets.name AS asset_name, assets.language_code,
           assets.category AS asset_category, assets.status AS asset_status,
           assets.components, assets.rejection_reason, assets.provider_updated_at,
           assets.last_synced_at, assets.version
    FROM whatsapp_cloud_template_bindings bindings
    INNER JOIN whatsapp_cloud_templates assets
      ON assets.id = bindings.cloud_template_id
     AND assets.organization_id = bindings.organization_id
    WHERE bindings.organization_id = ${organizationId}
      AND bindings.id = ${bindingId}
      AND bindings.is_active = TRUE
  `;
  if (!row) return null;
  const raw = row as Record<string, unknown>;
  return {
    binding: mapBinding(raw),
    asset: mapCloudTemplateAssetFromJoinedRow(raw),
  };
};

export const getCloudTemplateBindingSnapshotForStore = async (
  organizationId: string,
  storeId: string,
  whatsappBusinessAccountId: string,
  kind: WhatsAppMessageTemplateKind,
  localTemplateId?: string,
): Promise<CloudTemplateBindingSnapshot | null> => {
  const [row] = await pg`
    SELECT id
    FROM whatsapp_cloud_template_bindings
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
      AND whatsapp_business_account_id = ${whatsappBusinessAccountId}
      AND kind = ${kind}
      AND is_active = TRUE
      AND (${localTemplateId ?? null}::uuid IS NULL OR local_template_id = ${localTemplateId ?? null})
    ORDER BY
      CASE WHEN ${localTemplateId ?? null}::uuid IS NOT NULL AND local_template_id = ${localTemplateId ?? null} THEN 0 ELSE 1 END,
      is_default DESC,
      updated_at DESC
    LIMIT 1
  `;
  return row ? getCloudTemplateBindingSnapshot(organizationId, String(row.id)) : null;
};
