import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import {
  FALLBACK_INVOICE_APPEARANCE,
  normalizeInvoiceAppearanceSettings,
  type InvoiceAppearanceSettings,
} from "@repo/types";

export type OrganizationInvoiceAppearanceRecord = {
  organizationId: string;
  publishedSettings: InvoiceAppearanceSettings;
  draftSettings: InvoiceAppearanceSettings | null;
  updatedAt: string;
  updatedBy: string | null;
};

export type StoreInvoiceAppearanceRecord = {
  organizationId: string;
  storeId: string;
  usesOrganizationDefault: boolean;
  publishedSettings: InvoiceAppearanceSettings | null;
  draftSettings: InvoiceAppearanceSettings | null;
  updatedAt: string;
  updatedBy: string | null;
};

const parseStoredSettings = (value: unknown): Partial<InvoiceAppearanceSettings> | null => {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Partial<InvoiceAppearanceSettings>)
    : null;
};

const mapSettings = (value: unknown): InvoiceAppearanceSettings =>
  normalizeInvoiceAppearanceSettings(parseStoredSettings(value) ?? FALLBACK_INVOICE_APPEARANCE);

const mapOrganizationRow = (row: Record<string, unknown>): OrganizationInvoiceAppearanceRecord => {
  const mapped = snakeToCamel(row) as OrganizationInvoiceAppearanceRecord;
  return {
    ...mapped,
    publishedSettings: mapSettings(row.published_settings),
    draftSettings: row.draft_settings ? mapSettings(row.draft_settings) : null,
  };
};

const mapStoreRow = (row: Record<string, unknown>): StoreInvoiceAppearanceRecord => {
  const mapped = snakeToCamel(row) as StoreInvoiceAppearanceRecord;
  return {
    ...mapped,
    publishedSettings: row.published_settings ? mapSettings(row.published_settings) : null,
    draftSettings: row.draft_settings ? mapSettings(row.draft_settings) : null,
  };
};

export const ensureOrganizationInvoiceAppearance = async (
  organizationId: string,
): Promise<OrganizationInvoiceAppearanceRecord> => {
  const [row] = await pg`
    INSERT INTO organization_invoice_appearance_settings (organization_id)
    VALUES (${organizationId})
    ON CONFLICT (organization_id) DO NOTHING
    RETURNING *
  `;
  if (row) return mapOrganizationRow(row);
  const existing = await getOrganizationInvoiceAppearanceRecord(organizationId);
  if (!existing) throw new Error("Failed to initialize organization invoice appearance");
  return existing;
};

export const getOrganizationInvoiceAppearanceRecord = async (
  organizationId: string,
): Promise<OrganizationInvoiceAppearanceRecord | null> => {
  const [row] = await pg`
    SELECT *
    FROM organization_invoice_appearance_settings
    WHERE organization_id = ${organizationId}
  `;
  return row ? mapOrganizationRow(row) : null;
};

export const getOrganizationPublishedSettings = async (
  organizationId: string,
): Promise<InvoiceAppearanceSettings | null> => {
  const record = await getOrganizationInvoiceAppearanceRecord(organizationId);
  return record?.publishedSettings ?? null;
};

export const saveOrganizationInvoiceAppearanceDraft = async (
  organizationId: string,
  draftSettings: InvoiceAppearanceSettings,
  updatedBy: string,
): Promise<OrganizationInvoiceAppearanceRecord> => {
  await ensureOrganizationInvoiceAppearance(organizationId);
  const [row] = await pg`
    UPDATE organization_invoice_appearance_settings
    SET draft_settings = ${JSON.stringify(draftSettings)}::jsonb,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
    RETURNING *
  `;
  return mapOrganizationRow(row);
};

export const publishOrganizationInvoiceAppearance = async (
  organizationId: string,
  updatedBy: string,
): Promise<OrganizationInvoiceAppearanceRecord> => {
  const record = await ensureOrganizationInvoiceAppearance(organizationId);
  const nextSettings = record.draftSettings ?? record.publishedSettings;
  const [row] = await pg`
    UPDATE organization_invoice_appearance_settings
    SET published_settings = ${JSON.stringify(nextSettings)}::jsonb,
        draft_settings = NULL,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
    RETURNING *
  `;
  return mapOrganizationRow(row);
};

export const resetOrganizationInvoiceAppearance = async (
  organizationId: string,
  updatedBy: string,
): Promise<OrganizationInvoiceAppearanceRecord> => {
  await ensureOrganizationInvoiceAppearance(organizationId);
  const [row] = await pg`
    UPDATE organization_invoice_appearance_settings
    SET published_settings = ${JSON.stringify(FALLBACK_INVOICE_APPEARANCE)}::jsonb,
        draft_settings = NULL,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
    RETURNING *
  `;
  return mapOrganizationRow(row);
};

export const getStoreAppearanceRecord = async (
  organizationId: string,
  storeId: string,
): Promise<StoreInvoiceAppearanceRecord | null> => {
  const [row] = await pg`
    SELECT *
    FROM store_invoice_appearance_settings
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
  `;
  return row ? mapStoreRow(row) : null;
};

export const ensureStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
): Promise<StoreInvoiceAppearanceRecord> => {
  const [row] = await pg`
    INSERT INTO store_invoice_appearance_settings (organization_id, store_id)
    VALUES (${organizationId}, ${storeId})
    ON CONFLICT (organization_id, store_id) DO NOTHING
    RETURNING *
  `;
  if (row) return mapStoreRow(row);
  const existing = await getStoreAppearanceRecord(organizationId, storeId);
  if (!existing) throw new Error("Failed to initialize store invoice appearance");
  return existing;
};

export const saveStoreInvoiceAppearanceDraft = async (
  organizationId: string,
  storeId: string,
  input: {
    usesOrganizationDefault: boolean;
    draftSettings: InvoiceAppearanceSettings | null;
  },
  updatedBy: string,
): Promise<StoreInvoiceAppearanceRecord> => {
  await ensureStoreInvoiceAppearance(organizationId, storeId);
  const [row] = await pg`
    UPDATE store_invoice_appearance_settings
    SET uses_organization_default = ${input.usesOrganizationDefault},
        draft_settings = ${input.draftSettings ? JSON.stringify(input.draftSettings) : null}::jsonb,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
    RETURNING *
  `;
  return mapStoreRow(row);
};

export const publishStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
  updatedBy: string,
): Promise<StoreInvoiceAppearanceRecord> => {
  const record = await ensureStoreInvoiceAppearance(organizationId, storeId);
  const nextSettings = record.draftSettings ?? record.publishedSettings;
  const [row] = await pg`
    UPDATE store_invoice_appearance_settings
    SET published_settings = ${nextSettings ? JSON.stringify(nextSettings) : null}::jsonb,
        draft_settings = NULL,
        uses_organization_default = FALSE,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
    RETURNING *
  `;
  return mapStoreRow(row);
};

export const resetStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
  updatedBy: string,
): Promise<StoreInvoiceAppearanceRecord> => {
  await ensureStoreInvoiceAppearance(organizationId, storeId);
  const [row] = await pg`
    UPDATE store_invoice_appearance_settings
    SET uses_organization_default = TRUE,
        published_settings = NULL,
        draft_settings = NULL,
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
    RETURNING *
  `;
  return mapStoreRow(row);
};
