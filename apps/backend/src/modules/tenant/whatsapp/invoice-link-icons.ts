export type InvoiceLinkIconKind =
  | "google_review"
  | "instagram"
  | "facebook"
  | "app_install"
  | "website"
  | "social"
  | "custom"
  | "external";

const ICONS: Record<InvoiceLinkIconKind, string> = {
  google_review: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22 12c0-.8-.1-1.6-.2-2.3H12v4.4h5.7c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3-4.5 3-7.8z"/><path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.2v2.7C3.9 19.8 7.6 22 12 22z"/><path fill="#FBBC05" d="M6.2 13.5c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.8H2.2C1.5 8.3 1 10.1 1 12s.5 3.7 1.2 5.2l4-2.7z"/><path fill="#EA4335" d="M12 5.4c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17.2 2.3 14.8 1.5 12 1.5 7.6 1.5 3.9 3.7 2.2 6.8l4 2.7c.8-2.5 3.1-4.3 5.8-4.3z"/></svg>`,
  instagram: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="#E1306C"/></svg>`,
  facebook: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>`,
  app_install: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 5 10h4v8h6v-8h4L12 3zm-9 16h18v2H3v-2z"/></svg>`,
  website: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9M12 3C9.5 5.8 8.2 9 8.2 12s1.3 6.2 3.8 9"/></svg>`,
  social: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.1L18 9h-4V7a1 1 0 0 1 1-1h3V2z"/></svg>`,
  custom: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 14 21 3m0 0h-6m6 0v6M14 10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h10"/></svg>`,
  external: `<svg class="link-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 14 21 3m0 0h-6m6 0v6M14 10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h10"/></svg>`,
};

const normalize = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? "";

export const resolveInvoiceLinkIconKind = (input: {
  type?: string | null;
  label?: string | null;
  url?: string | null;
}): InvoiceLinkIconKind => {
  const type = normalize(input.type);
  const label = normalize(input.label);
  const url = normalize(input.url);

  if (type === "google_review" || label.includes("google")) return "google_review";
  if (type === "app_install" || label.includes("install") || label.includes("download app")) return "app_install";
  if (type === "website" || label.includes("website")) return "website";
  if (label.includes("instagram") || url.includes("instagram.com")) return "instagram";
  if (label.includes("facebook") || url.includes("facebook.com")) return "facebook";
  if (type === "social" || label.includes("social")) return "social";
  if (type === "custom") return "custom";
  return "external";
};

export const renderInvoiceLinkIcon = (kind: InvoiceLinkIconKind): string => ICONS[kind] ?? ICONS.external;
