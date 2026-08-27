import {
  isInvoiceLogoPathForOrganization,
  resolveInvoiceAppearance,
  type ResolvedInvoiceAppearance,
} from "@repo/types";
import * as appearanceRepository from "@/modules/tenant/invoice-appearance/invoice-appearance.repository";
import type { InvoiceDocumentBranding } from "./invoice-document";

export type AppearanceResolutionResult =
  | { status: "resolved"; appearance: ResolvedInvoiceAppearance }
  | { status: "fallback"; appearance: ResolvedInvoiceAppearance; reason: string }
  | { status: "error"; appearance: ResolvedInvoiceAppearance; message: string };

const logAppearanceIssue = (message: string, context: Record<string, string>) => {
  console.error(`[invoice-appearance] ${message}`, context);
};

export const resolveStoreInvoiceAppearance = async (
  organizationId: string,
  storeId: string,
): Promise<AppearanceResolutionResult> => {
  try {
    const [organizationSettings, storeRecord] = await Promise.all([
      appearanceRepository.getOrganizationPublishedSettings(organizationId),
      appearanceRepository.getStoreAppearanceRecord(organizationId, storeId),
    ]);

    if (!organizationSettings && !storeRecord?.publishedSettings) {
      return {
        status: "fallback",
        appearance: resolveInvoiceAppearance({}),
        reason: "no_configuration",
      };
    }

    return {
      status: "resolved",
      appearance: resolveInvoiceAppearance({
        organizationSettings,
        storeSettings: storeRecord?.usesOrganizationDefault ? null : storeRecord?.publishedSettings ?? null,
        usesOrganizationDefault: storeRecord?.usesOrganizationDefault ?? true,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "appearance_resolution_failed";
    logAppearanceIssue("Failed to resolve invoice appearance", {
      organizationId,
      storeId,
      message,
    });
    return {
      status: "error",
      appearance: resolveInvoiceAppearance({}),
      message,
    };
  }
};

const storageBucketName = (): string | null => (
  process.env.STORAGE_PROVIDER === "s3"
    ? process.env.AWS_BUCKET_NAME?.trim() || null
    : process.env.MINIO_BUCKET_NAME?.trim() || null
);

export const loadInvoiceLogoAssets = async (
  organizationId: string,
  logoPath: string | null,
): Promise<{ url: string | null; buffer: Buffer | null; dataUrl: string | null }> => {
  if (!logoPath) return { url: null, buffer: null, dataUrl: null };
  if (!isInvoiceLogoPathForOrganization(organizationId, logoPath)) {
    logAppearanceIssue("Rejected invoice logo path outside organization scope", {
      organizationId,
      logoPath,
    });
    return { url: null, buffer: null, dataUrl: null };
  }
  const bucketName = storageBucketName();
  if (!bucketName) return { url: null, buffer: null, dataUrl: null };

  try {
    const storage = await import("@/services/storage");
    const [url, buffer] = await Promise.all([
      storage.generateSignedUrl(bucketName, logoPath),
      storage.getObjectBuffer(bucketName, logoPath, 2 * 1024 * 1024).catch(() => null),
    ]);
    const extension = logoPath.split(".").pop()?.toLowerCase() ?? "png";
    const contentType = extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : extension === "webp"
        ? "image/webp"
        : "image/png";
    const dataUrl = buffer ? `data:${contentType};base64,${buffer.toString("base64")}` : null;
    return { url, buffer, dataUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "logo_load_failed";
    logAppearanceIssue("Failed to load invoice logo", { logoPath, message });
    return { url: null, buffer: null, dataUrl: null };
  }
};

export type InvoiceRenderAssets = {
  appearance: ResolvedInvoiceAppearance;
  logoUrl: string | null;
  logoBuffer: Buffer | null;
  logoDataUrl: string | null;
};

export const loadInvoiceRenderAssets = async (
  organizationId: string,
  storeId: string,
): Promise<InvoiceRenderAssets> => {
  const resolution = await resolveStoreInvoiceAppearance(organizationId, storeId);
  const logoAssets = await loadInvoiceLogoAssets(organizationId, resolution.appearance.settings.logoPath);
  return {
    appearance: resolution.appearance,
    logoUrl: logoAssets.url,
    logoBuffer: logoAssets.buffer,
    logoDataUrl: logoAssets.dataUrl,
  };
};

export const toInvoiceBranding = (input: {
  organizationName: string;
  organizationTagline?: string | null;
  storeName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  reviewPlatform?: string | null;
  reviewLink?: string | null;
  socialMediaName?: string | null;
  socialMediaLink?: string | null;
  whatsappLinks?: InvoiceDocumentBranding["whatsappLinks"];
}): InvoiceDocumentBranding => ({
  organizationName: input.organizationName,
  organizationTagline: input.organizationTagline ?? null,
  storeName: input.storeName,
  storeAddress: input.storeAddress ?? null,
  storePhone: input.storePhone ?? null,
  reviewPlatform: input.reviewPlatform ?? null,
  reviewLink: input.reviewLink ?? null,
  socialMediaName: input.socialMediaName ?? null,
  socialMediaLink: input.socialMediaLink ?? null,
  whatsappLinks: input.whatsappLinks ?? [],
});
