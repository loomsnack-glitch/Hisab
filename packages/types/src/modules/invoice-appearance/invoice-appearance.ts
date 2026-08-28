import type { z } from "zod";
import type {
  InvoiceAppearanceSettingsSchema,
  InvoiceAppearanceVisibilitySchema,
  UpdateInvoiceAppearanceSettingsSchema,
} from "./invoice-appearance.schema";

export type InvoiceAppearanceSettings = z.infer<typeof InvoiceAppearanceSettingsSchema>;
export type InvoiceAppearanceVisibility = z.infer<typeof InvoiceAppearanceVisibilitySchema>;
export type UpdateInvoiceAppearanceSettings = z.infer<typeof UpdateInvoiceAppearanceSettingsSchema>;

export type InvoiceAppearanceSource = "fallback" | "organization" | "store";

export type InvoiceAppearanceTokens = {
  accentColor: string;
  accentContrastColor: string;
  headerBackground: string;
  headerText: string;
  pageBackground: string;
  cardBackground: string;
  borderColor: string;
  mutedText: string;
  bodyText: string;
  statusPaidBackground: string;
  statusPaidText: string;
  statusPartialBackground: string;
  statusPartialText: string;
  statusDueBackground: string;
  statusDueText: string;
  statusCancelledBackground: string;
  statusCancelledText: string;
  fontFamily: string;
  fontFamilyPdf: string;
  contentPadding: string;
  itemGap: string;
  borderRadius: string;
  shadow: string;
};

export type ResolvedInvoiceAppearance = {
  settings: InvoiceAppearanceSettings;
  tokens: InvoiceAppearanceTokens;
  source: InvoiceAppearanceSource;
};

export const DEFAULT_INVOICE_APPEARANCE_VISIBILITY: InvoiceAppearanceVisibility = {
  showTagline: true,
  showAddress: true,
  showStorePhone: true,
  showCustomerPhone: true,
  showServiceMode: true,
  showNotes: true,
  showTerms: true,
  showReviewLink: true,
  showSocialLink: true,
  showStoreLinks: true,
  showPdfFooter: true,
};

export const FALLBACK_INVOICE_APPEARANCE: InvoiceAppearanceSettings = {
  preset: "classic",
  logoPath: null,
  accentColor: "#111827",
  headerStyle: "banner",
  fontPreset: "system",
  density: "comfortable",
  visibility: DEFAULT_INVOICE_APPEARANCE_VISIBILITY,
  footerText: null,
  termsText: null,
};

const PRESET_DEFAULTS: Record<
  InvoiceAppearanceSettings["preset"],
  Partial<InvoiceAppearanceSettings>
> = {
  classic: {
    headerStyle: "banner",
    accentColor: "#111827",
  },
  modern: {
    headerStyle: "split",
    accentColor: "#2563eb",
  },
  minimal: {
    headerStyle: "minimal",
    accentColor: "#374151",
  },
};

const FONT_STACKS: Record<InvoiceAppearanceSettings["fontPreset"], { html: string; pdf: string }> = {
  system: {
    html: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    pdf: "Helvetica",
  },
  serif: {
    html: 'Georgia, "Times New Roman", serif',
    pdf: "Times-Roman",
  },
  rounded: {
    html: '"Trebuchet MS", "Segoe UI", sans-serif',
    pdf: "Helvetica",
  },
};

const DENSITY_TOKENS: Record<
  InvoiceAppearanceSettings["density"],
  Pick<InvoiceAppearanceTokens, "contentPadding" | "itemGap">
> = {
  compact: { contentPadding: "16px", itemGap: "8px" },
  comfortable: { contentPadding: "24px", itemGap: "12px" },
};

const stripUnsafeText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();

export const sanitizeInvoiceText = (
  value: string | null | undefined,
  maxLength: number,
): string | null => {
  if (value == null) return null;
  const cleaned = stripUnsafeText(value);
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
};

const normalizeHexColor = (value: string): string => {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

export const getRelativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const transform = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = [transform(r), transform(g), transform(b)];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const getContrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(getRelativeLuminance(foreground), getRelativeLuminance(background));
  const darker = Math.min(getRelativeLuminance(foreground), getRelativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableTextColor = (background: string): string =>
  getRelativeLuminance(background) > 0.45 ? "#111827" : "#ffffff";

export const hasLowContrastAccent = (accentColor: string): boolean => {
  const normalized = normalizeHexColor(accentColor);
  const onWhite = getContrastRatio(normalized, "#ffffff");
  const textOnAccent = getContrastRatio(getReadableTextColor(normalized), normalized);
  return onWhite < 3 || textOnAccent < 4.5;
};

export const normalizeInvoiceAppearanceSettings = (
  input: Partial<InvoiceAppearanceSettings> | null | undefined,
): InvoiceAppearanceSettings => {
  const preset = input?.preset ?? FALLBACK_INVOICE_APPEARANCE.preset;
  const presetDefaults = PRESET_DEFAULTS[preset];
  const accentColor = normalizeHexColor(
    input?.accentColor ?? presetDefaults.accentColor ?? FALLBACK_INVOICE_APPEARANCE.accentColor,
  );

  return {
    preset,
    logoPath: input?.logoPath?.trim() ? input.logoPath.trim() : null,
    accentColor,
    headerStyle: input?.headerStyle ?? presetDefaults.headerStyle ?? FALLBACK_INVOICE_APPEARANCE.headerStyle,
    fontPreset: input?.fontPreset ?? FALLBACK_INVOICE_APPEARANCE.fontPreset,
    density: input?.density ?? FALLBACK_INVOICE_APPEARANCE.density,
    visibility: {
      ...DEFAULT_INVOICE_APPEARANCE_VISIBILITY,
      ...input?.visibility,
    },
    footerText: sanitizeInvoiceText(input?.footerText, 500),
    termsText: sanitizeInvoiceText(input?.termsText, 2000),
  };
};

export const mergeInvoiceAppearanceUpdates = (
  current: InvoiceAppearanceSettings,
  updates: UpdateInvoiceAppearanceSettings,
): InvoiceAppearanceSettings =>
  normalizeInvoiceAppearanceSettings({
    ...current,
    ...updates,
    logoPath:
      updates.logoPath === ""
        ? null
        : updates.logoPath === undefined
          ? current.logoPath
          : updates.logoPath,
    footerText:
      updates.footerText === ""
        ? null
        : updates.footerText === undefined
          ? current.footerText
          : updates.footerText,
    termsText:
      updates.termsText === ""
        ? null
        : updates.termsText === undefined
          ? current.termsText
          : updates.termsText,
    visibility: {
      ...current.visibility,
      ...updates.visibility,
    },
  });

export const buildInvoiceAppearanceTokens = (
  settings: InvoiceAppearanceSettings,
): InvoiceAppearanceTokens => {
  const accentColor = normalizeHexColor(settings.accentColor);
  const accentContrastColor = getReadableTextColor(accentColor);
  const fonts = FONT_STACKS[settings.fontPreset];
  const density = DENSITY_TOKENS[settings.density];
  const headerBackground =
    settings.headerStyle === "minimal" ? "#ffffff" : accentColor;
  const headerText =
    settings.headerStyle === "minimal" ? accentColor : accentContrastColor;

  return {
    accentColor,
    accentContrastColor,
    headerBackground,
    headerText,
    pageBackground: settings.preset === "minimal" ? "#ffffff" : "#f3f4f6",
    cardBackground: "#ffffff",
    borderColor: "#e5e7eb",
    mutedText: "#6b7280",
    bodyText: "#111827",
    statusPaidBackground: "#dcfce7",
    statusPaidText: "#166534",
    statusPartialBackground: "#fef3c7",
    statusPartialText: "#92400e",
    statusDueBackground: "#fee2e2",
    statusDueText: "#991b1b",
    statusCancelledBackground: "#f3f4f6",
    statusCancelledText: "#374151",
    fontFamily: fonts.html,
    fontFamilyPdf: fonts.pdf,
    contentPadding: density.contentPadding,
    itemGap: density.itemGap,
    borderRadius: settings.preset === "modern" ? "20px" : settings.preset === "minimal" ? "8px" : "16px",
    shadow: settings.preset === "minimal" ? "none" : "0 8px 30px #11182712",
  };
};

export const resolveInvoiceAppearance = (input: {
  organizationSettings?: InvoiceAppearanceSettings | null;
  storeSettings?: InvoiceAppearanceSettings | null;
  usesOrganizationDefault?: boolean;
}): ResolvedInvoiceAppearance => {
  if (input.storeSettings && input.usesOrganizationDefault === false) {
    const settings = normalizeInvoiceAppearanceSettings(input.storeSettings);
    return {
      settings,
      tokens: buildInvoiceAppearanceTokens(settings),
      source: "store",
    };
  }

  if (input.organizationSettings) {
    const settings = normalizeInvoiceAppearanceSettings(input.organizationSettings);
    return {
      settings,
      tokens: buildInvoiceAppearanceTokens(settings),
      source: "organization",
    };
  }

  const settings = normalizeInvoiceAppearanceSettings(FALLBACK_INVOICE_APPEARANCE);
  return {
    settings,
    tokens: buildInvoiceAppearanceTokens(settings),
    source: "fallback",
  };
};

export const buildInvoiceLogoStoragePath = (
  organizationId: string,
  fileId: string,
  extension: string,
): string =>
  `organizations/${organizationId}/invoice-appearance/${fileId}.${extension.toLowerCase()}`;

export const isInvoiceLogoPathForOrganization = (
  organizationId: string,
  logoPath: string | null | undefined,
): boolean => {
  if (!logoPath) return true;
  return logoPath.startsWith(`organizations/${organizationId}/invoice-appearance/`);
};
