import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SaleDetailDTO } from "@repo/types";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import { buildInvoiceDocument } from "./invoice-document";
import {
  loadInvoiceLogoAssets,
  loadInvoiceRenderAssets,
  toInvoiceBranding,
} from "./invoice-appearance-resolution";
import { createInvoicePdfContext, renderSalePdf } from "./invoice-pdf";
import * as repository from "./public-invoice.repository";
import {
  buildSamplePublicInvoiceView,
  renderPublicInvoiceHtml,
  type PublicInvoiceBranding,
} from "./public-invoice-html";
import type { InvoiceDocument } from "./invoice-document";

export type { PublicInvoiceBranding };
export { buildSamplePublicInvoiceView, renderPublicInvoiceHtml };
export type { InvoiceDocument };

const publicLinkSecret = (): string =>
  process.env.WHATSAPP_PUBLIC_INVOICE_LINK_SECRET?.trim() || process.env.JWT_SECRET?.trim() || "";

const publicLinkBaseUrl = (): string =>
  process.env.WHATSAPP_PUBLIC_INVOICE_BASE_URL?.trim().replace(/\/+$/, "") || "";

const tokenPayload = (organizationId: string, storeId: string, saleId: string, salt: string): string =>
  `invoice:${organizationId}:${storeId}:${saleId}:${salt}`;

const deriveToken = (secret: string, organizationId: string, storeId: string, saleId: string, salt: string): string =>
  createHmac("sha256", secret).update(tokenPayload(organizationId, storeId, saleId, salt)).digest("base64url");

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const requirePublicLinkConfig = (): { secret: string; baseUrl: string } => {
  const secret = publicLinkSecret();
  if (secret.length < 32) {
    throw new Error("Public invoice links require WHATSAPP_PUBLIC_INVOICE_LINK_SECRET or a 32-character JWT_SECRET");
  }
  const baseUrl = publicLinkBaseUrl();
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Public invoice links require WHATSAPP_PUBLIC_INVOICE_BASE_URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Public invoice link base URL must use HTTPS");
  }
  return { secret, baseUrl };
};

export const getPublicInvoiceTemplateUrl = (): string =>
  `${requirePublicLinkConfig().baseUrl}/{{1}}`;

export const createPublicInvoiceUrl = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<string> => {
  const { secret, baseUrl } = requirePublicLinkConfig();
  const existing = await repository.getPublicInvoiceLinkBySale(organizationId, storeId, saleId);
  const salt = existing?.tokenSalt || randomBytes(24).toString("hex");
  const token = deriveToken(secret, organizationId, storeId, saleId, salt);
  const link = existing && !existing.revokedAt && existing.tokenHash === hashToken(token)
    ? existing
    : await repository.createOrRestorePublicInvoiceLink({
      organizationId,
      storeId,
      saleId,
      tokenHash: hashToken(token),
      tokenSalt: salt,
    });
  const finalToken = deriveToken(secret, link.organizationId, link.storeId, link.saleId, link.tokenSalt);
  return `${baseUrl}/${finalToken}`;
};

export const revokePublicInvoiceLink = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<boolean> => repository.revokePublicInvoiceLink(organizationId, storeId, saleId);

export type PublicInvoiceData = {
  token: string;
  sale: SaleDetailDTO;
  organization: { id: string; name: string; tagline: string | null };
  store: {
    id: string;
    name: string;
    address: string | null;
    reviewPlatform: string | null;
    reviewLink: string | null;
    socialMediaName: string | null;
    socialMediaLink: string | null;
    whatsappLinks: PublicInvoiceBranding["whatsappLinks"];
    phone: string | null;
  };
};

const loadSaleDetail = async (organizationId: string, storeId: string, saleId: string): Promise<SaleDetailDTO | null> => {
  const sale = await billingRepository.getSaleById(organizationId, storeId, saleId);
  if (!sale) return null;
  const [items, payments] = await Promise.all([
    billingRepository.getSaleItemsBySaleId(saleId),
    billingRepository.getPaymentsBySaleId(saleId),
  ]);
  return { ...sale, items, payments, orderDiscountAmount: Number(sale.discountTotal) };
};

const loadStorePhone = async (organizationId: string, storeId: string): Promise<string | null> => {
  try {
    const { getAccount } = await import("../whatsapp/whatsapp.repository");
    const account = await getAccount(organizationId, storeId);
    return account?.phoneNumber?.trim() || null;
  } catch {
    return null;
  }
};

export const buildPublicInvoiceDocument = async (
  data: PublicInvoiceData,
  options: { showDownloadAction?: boolean } = {},
): Promise<{ document: InvoiceDocument; logoBuffer: Buffer | null }> => {
  const assets = await loadInvoiceRenderAssets(data.organization.id, data.store.id);
  const document = buildInvoiceDocument({
    sale: data.sale,
    branding: toInvoiceBranding({
      organizationName: data.organization.name,
      organizationTagline: data.organization.tagline,
      storeName: data.store.name,
      storeAddress: data.store.address,
      storePhone: data.store.phone,
      reviewPlatform: data.store.reviewPlatform,
      reviewLink: data.store.reviewLink,
      socialMediaName: data.store.socialMediaName,
      socialMediaLink: data.store.socialMediaLink,
      whatsappLinks: data.store.whatsappLinks,
    }),
    appearance: assets.appearance,
    logoUrl: assets.logoUrl,
    logoDataUrl: assets.logoDataUrl,
    token: data.token,
    publicBaseUrl: publicLinkBaseUrl(),
    showDownloadAction: options.showDownloadAction ?? true,
  });
  return { document, logoBuffer: assets.logoBuffer };
};

export const buildInvoiceDocumentForStore = async (input: {
  organizationId: string;
  storeId: string;
  sale: SaleDetailDTO;
  branding: PublicInvoiceBranding;
  token?: string | null;
  publicBaseUrl?: string | null;
  showDownloadAction?: boolean;
}): Promise<{ document: InvoiceDocument; logoBuffer: Buffer | null }> => {
  const assets = await loadInvoiceRenderAssets(input.organizationId, input.storeId);
  const document = buildInvoiceDocument({
    sale: input.sale,
    branding: input.branding,
    appearance: assets.appearance,
    logoUrl: assets.logoUrl,
    logoDataUrl: assets.logoDataUrl,
    token: input.token ?? null,
    publicBaseUrl: input.publicBaseUrl ?? null,
    showDownloadAction: input.showDownloadAction ?? false,
  });
  return { document, logoBuffer: assets.logoBuffer };
};

export const getPublicInvoiceData = async (token: string): Promise<PublicInvoiceData | null> => {
  const secret = publicLinkSecret();
  if (secret.length < 32 || !token || token.length > 256) return null;
  const link = await repository.getPublicInvoiceLinkByTokenHash(hashToken(token));
  if (!link) return null;
  const expected = deriveToken(secret, link.organizationId, link.storeId, link.saleId, link.tokenSalt);
  const actual = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) return null;
  const [sale, organization, store] = await Promise.all([
    loadSaleDetail(link.organizationId, link.storeId, link.saleId),
    organizationRepository.getOrganizationById(link.organizationId),
    organizationRepository.getStoreById(link.organizationId, link.storeId),
  ]);
  if (!sale || sale.status !== "completed" || !organization || !store) return null;
  const storePhone = await loadStorePhone(link.organizationId, link.storeId);
  return {
    token,
    sale,
    organization: { id: organization.id, name: organization.name, tagline: organization.tagline ?? null },
    store: {
      id: store.id,
      name: store.name,
      address: store.address ?? null,
      reviewPlatform: store.reviewPlatform ?? null,
      reviewLink: store.reviewLink ?? null,
      socialMediaName: store.socialMediaName ?? null,
      socialMediaLink: store.socialMediaLink ?? null,
      whatsappLinks: store.whatsappLinks,
      phone: storePhone,
    },
  };
};

export const renderBrandedSalePdf = async (
  organizationId: string,
  storeId: string,
  sale: SaleDetailDTO,
): Promise<Buffer> => {
  const [organization, store] = await Promise.all([
    organizationRepository.getOrganizationById(organizationId),
    organizationRepository.getStoreById(organizationId, storeId),
  ]);
  if (!organization || !store) {
    throw new Error("Organization or store not found");
  }
  const storePhone = await loadStorePhone(organizationId, storeId);
  const { document, logoBuffer } = await buildInvoiceDocumentForStore({
    organizationId,
    storeId,
    sale,
    branding: toInvoiceBranding({
      organizationName: organization.name,
      organizationTagline: organization.tagline,
      storeName: store.name,
      storeAddress: store.address,
      storePhone,
      reviewPlatform: store.reviewPlatform,
      reviewLink: store.reviewLink,
      socialMediaName: store.socialMediaName,
      socialMediaLink: store.socialMediaLink,
      whatsappLinks: store.whatsappLinks,
    }),
    showDownloadAction: false,
  });
  return renderSalePdf(createInvoicePdfContext(document, logoBuffer));
};

export const resolveInvoiceLogoPreviewUrl = loadInvoiceLogoAssets;
