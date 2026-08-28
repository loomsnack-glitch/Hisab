import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

export type PublicInvoiceLinkRecord = {
  id: string;
  organizationId: string;
  storeId: string;
  saleId: string;
  tokenHash: string;
  tokenSalt: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mapLink = (row: Record<string, unknown>): PublicInvoiceLinkRecord =>
  snakeToCamel(row) as PublicInvoiceLinkRecord;

export const getPublicInvoiceLinkBySale = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<PublicInvoiceLinkRecord | null> => {
  const [row] = await pg`
    SELECT *
    FROM whatsapp_public_invoice_links
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
      AND sale_id = ${saleId}
  `;
  return row ? mapLink(row) : null;
};

export const createOrRestorePublicInvoiceLink = async (input: {
  organizationId: string;
  storeId: string;
  saleId: string;
  tokenHash: string;
  tokenSalt: string;
}): Promise<PublicInvoiceLinkRecord> => {
  const [row] = await pg`
    INSERT INTO whatsapp_public_invoice_links (
      organization_id,
      store_id,
      sale_id,
      token_hash,
      token_salt
    ) VALUES (
      ${input.organizationId},
      ${input.storeId},
      ${input.saleId},
      ${input.tokenHash},
      ${input.tokenSalt}
    )
    ON CONFLICT (organization_id, store_id, sale_id) DO UPDATE
    SET token_hash = EXCLUDED.token_hash,
        token_salt = EXCLUDED.token_salt,
        revoked_at = NULL,
        updated_at = NOW()
    RETURNING *
  `;
  if (!row) throw new Error("Public invoice link could not be stored");
  return mapLink(row);
};

export const getPublicInvoiceLinkByTokenHash = async (
  tokenHash: string,
): Promise<PublicInvoiceLinkRecord | null> => {
  const [row] = await pg`
    SELECT *
    FROM whatsapp_public_invoice_links
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
  `;
  return row ? mapLink(row) : null;
};

export const revokePublicInvoiceLink = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<boolean> => {
  const [row] = await pg`
    UPDATE whatsapp_public_invoice_links
    SET revoked_at = COALESCE(revoked_at, NOW()),
        updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND store_id = ${storeId}
      AND sale_id = ${saleId}
    RETURNING id
  `;
  return Boolean(row);
};
