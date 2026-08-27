import type { PaymentDTO, SaleDetailDTO, StoreMessageLink } from "@repo/types";
import {
  formatSaleServiceModeLabel,
  type InvoiceAppearanceSettings,
  type ResolvedInvoiceAppearance,
} from "@repo/types";
import { resolveInvoiceLinkIconKind, type InvoiceLinkIconKind } from "./invoice-link-icons";

export type InvoiceDocumentBranding = {
  organizationName: string;
  organizationTagline: string | null;
  storeName: string;
  storeAddress: string | null;
  storePhone: string | null;
  reviewPlatform: string | null;
  reviewLink: string | null;
  socialMediaName: string | null;
  socialMediaLink: string | null;
  whatsappLinks: StoreMessageLink[];
};

export type InvoiceDocumentLink = {
  label: string;
  url: string;
  icon: InvoiceLinkIconKind;
};

export type InvoiceDocumentLine = {
  key: string;
  name: string;
  quantity: string;
  rate: string | null;
  amount: string | null;
  indent: number;
  kind: "item" | "addon" | "bundle" | "bundle_addon";
};

export type InvoicePaymentStatusLabel = "Paid" | "Partially Paid" | "Due" | "Cancelled";

export type InvoiceDocument = {
  sale: SaleDetailDTO;
  branding: InvoiceDocumentBranding;
  appearance: ResolvedInvoiceAppearance;
  logoUrl: string | null;
  logoDataUrl: string | null;
  token: string | null;
  publicBaseUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceModeLabel: string;
  paymentStatus: InvoicePaymentStatusLabel;
  lines: InvoiceDocumentLine[];
  links: InvoiceDocumentLink[];
  footerText: string;
  showDownloadAction: boolean;
};

export type InvoiceRenderMode = "screen" | "print" | "preview";
export type InvoicePreviewViewport = "desktop" | "mobile" | "pdf";

export const formatInvoiceAmount = (value: number | string | null | undefined): string =>
  `₹${(Number.isFinite(Number(value ?? 0)) ? Number(value ?? 0) : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatInvoiceDate = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const maskInvoicePhone = (value: string | null | undefined): string => {
  const phone = value?.trim() ?? "";
  if (phone.length < 5) return phone ? "••••" : "";
  return `${phone.slice(0, 3)}${"•".repeat(Math.max(2, phone.length - 5))}${phone.slice(-2)}`;
};

const safeHttpsUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  if (!/^https:\/\//i.test(trimmed)) return null;
  return trimmed;
};

export const getInvoicePaymentStatus = (sale: SaleDetailDTO): InvoicePaymentStatusLabel => {
  if (sale.status === "voided") return "Cancelled";
  if (sale.paymentStatus === "paid") return "Paid";
  if (sale.paymentStatus === "partial") return "Partially Paid";
  return "Due";
};

export const flattenInvoiceLines = (sale: SaleDetailDTO): InvoiceDocumentLine[] => {
  const lines: InvoiceDocumentLine[] = [];
  for (const [index, item] of sale.items.entries()) {
    lines.push({
      key: `item-${index}`,
      name: item.productNameSnapshot,
      quantity: String(Number(item.quantity)),
      rate: formatInvoiceAmount(item.unitPriceSnapshot),
      amount: formatInvoiceAmount(item.lineTotal),
      indent: 0,
      kind: "item",
    });
    for (const [addOnIndex, addOn] of (item.addOns ?? []).entries()) {
      lines.push({
        key: `item-${index}-addon-${addOnIndex}`,
        name: `+ ${addOn.addOnNameSnapshot}`,
        quantity: String(Number(addOn.totalQuantity)),
        rate: formatInvoiceAmount(Number(addOn.unitPriceSnapshot) - Number(addOn.unitDiscountSnapshot)),
        amount: formatInvoiceAmount(addOn.lineTotal),
        indent: 1,
        kind: "addon",
      });
    }
    for (const [componentIndex, component] of (item.bundleComponents ?? []).entries()) {
      lines.push({
        key: `item-${index}-bundle-${componentIndex}`,
        name: `• ${component.productNameSnapshot}`,
        quantity: String(Number(component.totalQuantity)),
        rate: "Included",
        amount: null,
        indent: 1,
        kind: "bundle",
      });
      for (const [addOnIndex, addOn] of (component.addOns ?? []).entries()) {
        lines.push({
          key: `item-${index}-bundle-${componentIndex}-addon-${addOnIndex}`,
          name: `+ ${addOn.addOnNameSnapshot}`,
          quantity: String(Number(addOn.totalQuantity)),
          rate: "Included",
          amount: null,
          indent: 2,
          kind: "bundle_addon",
        });
      }
    }
  }
  return lines;
};

export const collectInvoiceLinks = (
  branding: InvoiceDocumentBranding,
  visibility: InvoiceAppearanceSettings["visibility"],
): InvoiceDocumentLink[] => {
  const links: InvoiceDocumentLink[] = [];
  if (visibility.showReviewLink) {
    const url = safeHttpsUrl(branding.reviewLink);
    if (url) {
      links.push({
        label: branding.reviewPlatform || "Leave a review",
        url,
        icon: resolveInvoiceLinkIconKind({ type: "google_review", label: branding.reviewPlatform, url }),
      });
    }
  }
  if (visibility.showSocialLink) {
    const url = safeHttpsUrl(branding.socialMediaLink);
    if (url) {
      links.push({
        label: branding.socialMediaName || "Follow us",
        url,
        icon: resolveInvoiceLinkIconKind({ type: "social", label: branding.socialMediaName, url }),
      });
    }
  }
  if (visibility.showStoreLinks) {
    for (const link of branding.whatsappLinks) {
      if (!link.isActive) continue;
      const url = safeHttpsUrl(link.url);
      if (!url) continue;
      links.push({
        label: link.label,
        url,
        icon: resolveInvoiceLinkIconKind({ type: link.type, label: link.label, url }),
      });
    }
  }
  return links;
};

export const formatInvoicePayments = (payments: PaymentDTO[]): string[] =>
  payments.map((payment) =>
    `${payment.method.toUpperCase()} · ${formatInvoiceAmount(payment.amount)} · ${formatInvoiceDate(payment.paidAt)}${payment.reference ? ` · ${payment.reference}` : ""}`,
  );

export const buildInvoiceDocument = (input: {
  sale: SaleDetailDTO;
  branding: InvoiceDocumentBranding;
  appearance: ResolvedInvoiceAppearance;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
  token?: string | null;
  publicBaseUrl?: string | null;
  showDownloadAction?: boolean;
}): InvoiceDocument => {
  const visibility = input.appearance.settings.visibility;
  const customerName = input.sale.customerNameSnapshot ?? input.sale.customer?.name ?? "Customer";
  const customerPhone = input.sale.customerPhoneSnapshot ?? input.sale.customer?.phone ?? null;
  const footerText = input.appearance.settings.footerText
    ?? `This invoice is provided by ${input.branding.storeName}. If you have questions about this bill, please contact the store.`;

  return {
    sale: input.sale,
    branding: input.branding,
    appearance: input.appearance,
    logoUrl: input.logoUrl ?? null,
    logoDataUrl: input.logoDataUrl ?? null,
    token: input.token ?? null,
    publicBaseUrl: input.publicBaseUrl ?? null,
    customerName,
    customerPhone,
    serviceModeLabel: formatSaleServiceModeLabel(input.sale.serviceMode),
    paymentStatus: getInvoicePaymentStatus(input.sale),
    lines: flattenInvoiceLines(input.sale),
    links: collectInvoiceLinks(input.branding, visibility),
    footerText,
    showDownloadAction: input.showDownloadAction ?? true,
  };
};

export const buildSampleInvoiceDocument = (
  appearance: ResolvedInvoiceAppearance,
  overrides: Partial<{
    branding: InvoiceDocumentBranding;
    sale: SaleDetailDTO;
    token: string;
    publicBaseUrl: string;
  }> = {},
): InvoiceDocument => buildInvoiceDocument({
  sale: {
    id: "00000000-0000-4000-8000-000000000099",
    organizationId: "00000000-0000-4000-8000-000000000001",
    storeId: "00000000-0000-4000-8000-000000000002",
    saleNumber: "INV-42",
    status: "completed",
    serviceMode: "dine_in",
    customerNameSnapshot: "Asha Customer",
    customerPhoneSnapshot: "+919876543210",
    paymentStatus: "partial",
    subtotal: 100,
    discountTotal: 10,
    grandTotal: 90,
    paidTotal: 50,
    dueTotal: 40,
    createdAt: "2026-08-26T10:00:00.000Z",
    committedAt: "2026-08-26T10:01:00.000Z",
    notes: "Thank you for visiting.",
    items: [{
      productNameSnapshot: "Panini",
      quantity: 1,
      unitPriceSnapshot: 90,
      discountAmount: 0,
      lineTotal: 90,
      addOns: [],
      bundleComponents: [],
    }],
    payments: [],
    orderDiscountAmount: 10,
    itemCount: 1,
    paymentMethods: "cash",
    customer: null,
  } as SaleDetailDTO,
  branding: {
    organizationName: "Ganatri & Co.",
    organizationTagline: "Simple billing",
    storeName: "Central Store",
    storeAddress: "Adajan, Surat",
    storePhone: "+91 98765 43210",
    reviewPlatform: "Google review",
    reviewLink: "https://example.com/review",
    socialMediaName: "Instagram",
    socialMediaLink: "https://instagram.com/example",
    whatsappLinks: [],
  },
  appearance,
  token: "sample-token",
  publicBaseUrl: "https://example.test/invoices",
  showDownloadAction: true,
  ...overrides,
});
