import type { z } from "zod";
import type {
  InvoiceAppearanceSettingsDTOSchema,
  StoreInvoiceAppearanceSettingsDTOSchema,
} from "./invoice-appearance.schema";

export type InvoiceAppearanceSettingsDTO = z.infer<typeof InvoiceAppearanceSettingsDTOSchema>;
export type StoreInvoiceAppearanceSettingsDTO = z.infer<
  typeof StoreInvoiceAppearanceSettingsDTOSchema
>;

export type InvoiceAppearanceSettingsResponse = {
  settings: InvoiceAppearanceSettingsDTO;
};

export type StoreInvoiceAppearanceSettingsResponse = {
  settings: StoreInvoiceAppearanceSettingsDTO;
  organizationDefaults: InvoiceAppearanceSettingsDTO;
};

export type InvoiceAppearancePreviewResponse = {
  html: string | null;
  pdfBase64: string | null;
  viewport: "desktop" | "mobile" | "pdf";
  mode: "screen" | "print" | "preview";
};
