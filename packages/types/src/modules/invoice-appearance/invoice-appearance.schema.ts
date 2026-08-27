import { z } from "zod";

export const InvoiceAppearancePresetSchema = z.enum(["classic", "modern", "minimal"]);
export const InvoiceHeaderStyleSchema = z.enum(["banner", "split", "minimal"]);
export const InvoiceFontPresetSchema = z.enum(["system", "serif", "rounded"]);
export const InvoiceDensitySchema = z.enum(["compact", "comfortable"]);

export const InvoiceAppearanceVisibilitySchema = z.object({
  showTagline: z.boolean(),
  showAddress: z.boolean(),
  showStorePhone: z.boolean(),
  showCustomerPhone: z.boolean(),
  showServiceMode: z.boolean(),
  showNotes: z.boolean(),
  showTerms: z.boolean(),
  showReviewLink: z.boolean(),
  showSocialLink: z.boolean(),
  showStoreLinks: z.boolean(),
  showPdfFooter: z.boolean(),
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Accent color must be a valid hex color");

const optionalTextSchema = (max: number) =>
  z.union([
    z.literal(""),
    z.string().trim().max(max, `Text must be at most ${max} characters`),
  ]);

const logoPathSchema = z
  .union([
    z.literal(""),
    z.null(),
    z
      .string()
      .trim()
      .max(512)
      .regex(
        /^organizations\/[0-9a-f-]{36}\/invoice-appearance\/[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/i,
        "Logo path is invalid",
      ),
  ])
  .optional();

export const InvoiceAppearanceSettingsSchema = z.object({
  preset: InvoiceAppearancePresetSchema,
  logoPath: z.string().max(512).nullable(),
  accentColor: hexColorSchema,
  headerStyle: InvoiceHeaderStyleSchema,
  fontPreset: InvoiceFontPresetSchema,
  density: InvoiceDensitySchema,
  visibility: InvoiceAppearanceVisibilitySchema,
  footerText: z.string().max(500).nullable(),
  termsText: z.string().max(2000).nullable(),
});

export const UpdateInvoiceAppearanceSettingsSchema = z.object({
  preset: InvoiceAppearancePresetSchema.optional(),
  logoPath: logoPathSchema,
  accentColor: hexColorSchema.optional(),
  headerStyle: InvoiceHeaderStyleSchema.optional(),
  fontPreset: InvoiceFontPresetSchema.optional(),
  density: InvoiceDensitySchema.optional(),
  visibility: InvoiceAppearanceVisibilitySchema.partial().optional(),
  footerText: optionalTextSchema(500).optional(),
  termsText: optionalTextSchema(2000).optional(),
});

export const InvoiceAppearanceSettingsDTOSchema = z.object({
  organizationId: z.uuid(),
  publishedSettings: InvoiceAppearanceSettingsSchema,
  draftSettings: InvoiceAppearanceSettingsSchema.nullable(),
  updatedAt: z.string(),
});

export const StoreInvoiceAppearanceSettingsDTOSchema = z.object({
  organizationId: z.uuid(),
  storeId: z.uuid(),
  usesOrganizationDefault: z.boolean(),
  publishedSettings: InvoiceAppearanceSettingsSchema.nullable(),
  draftSettings: InvoiceAppearanceSettingsSchema.nullable(),
  updatedAt: z.string(),
});

export const InvoiceAppearancePreviewRequestSchema = z.object({
  preset: InvoiceAppearancePresetSchema.optional(),
  logoPath: logoPathSchema,
  accentColor: hexColorSchema.optional(),
  headerStyle: InvoiceHeaderStyleSchema.optional(),
  fontPreset: InvoiceFontPresetSchema.optional(),
  density: InvoiceDensitySchema.optional(),
  visibility: InvoiceAppearanceVisibilitySchema.partial().optional(),
  footerText: optionalTextSchema(500).optional(),
  termsText: optionalTextSchema(2000).optional(),
  usesOrganizationDefault: z.boolean().optional(),
  viewport: z.enum(["desktop", "mobile", "pdf"]).default("desktop"),
  mode: z.enum(["screen", "print", "preview"]).default("screen"),
});
