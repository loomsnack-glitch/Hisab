import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SaleDetailDTO, StoreMessageLink } from "@repo/types";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as repository from "./public-invoice.repository";

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

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatAmount = (value: number | string | null | undefined): string =>
  `₹${(Number.isFinite(Number(value ?? 0)) ? Number(value ?? 0) : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string | Date | null | undefined): string => {
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

const maskPhone = (value: string | null | undefined): string => {
  const phone = clean(value);
  if (phone.length < 5) return phone ? "••••" : "";
  return `${phone.slice(0, 3)}${"•".repeat(Math.max(2, phone.length - 5))}${phone.slice(-2)}`;
};

const linkMarkup = (links: StoreMessageLink[]): string => links
  .filter(link => link.isActive && /^https:\/\//i.test(link.url))
  .map(link => `<a href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`)
  .join("");

export type PublicInvoiceData = {
  token: string;
  sale: SaleDetailDTO;
  organization: { name: string; tagline: string | null };
  store: { name: string; address: string | null; reviewPlatform: string | null; reviewLink: string | null; socialMediaName: string | null; socialMediaLink: string | null; whatsappLinks: StoreMessageLink[] };
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
  return {
    token,
    sale,
    organization: { name: organization.name, tagline: organization.tagline ?? null },
    store: {
      name: store.name,
      address: store.address ?? null,
      reviewPlatform: store.reviewPlatform ?? null,
      reviewLink: store.reviewLink ?? null,
      socialMediaName: store.socialMediaName ?? null,
      socialMediaLink: store.socialMediaLink ?? null,
      whatsappLinks: store.whatsappLinks,
    },
  };
};

export const renderPublicInvoiceHtml = (data: PublicInvoiceData): string => {
  const { sale, organization, store } = data;
  const customerName = sale.customerNameSnapshot ?? sale.customer?.name ?? "Customer";
  const customerPhone = sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null;
  const links = [...store.whatsappLinks];
  if (store.reviewLink && store.reviewPlatform) links.push({ key: "review", type: "google_review", label: store.reviewPlatform, url: store.reviewLink, isActive: true });
  if (store.socialMediaLink && store.socialMediaName) links.push({ key: "social", type: "social", label: store.socialMediaName, url: store.socialMediaLink, isActive: true });
  const rows = sale.items.map(item => `<tr><td>${escapeHtml(item.productNameSnapshot)}</td><td>${escapeHtml(item.quantity)}</td><td>${formatAmount(item.lineTotal)}</td></tr>`).join("");
  const pdfUrl = `${publicLinkBaseUrl()}/${encodeURIComponent(data.token)}.pdf`;
  const status = sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(organization.name)} invoice ${escapeHtml(sale.saleNumber ?? sale.id)}</title>
<style>body{margin:0;background:#f3f4f6;color:#111827;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:760px;margin:32px auto;padding:0 16px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 8px 30px #11182712;overflow:hidden}.hero{padding:28px 28px 22px;background:#111827;color:#fff}.hero h1{margin:0;font-size:28px}.hero p{margin:6px 0 0;color:#d1d5db}.content{padding:28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:24px}.muted{color:#6b7280;font-size:13px}.value{font-weight:600}.table{width:100%;border-collapse:collapse;margin:10px 0 24px}.table th,.table td{padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:left}.table th:last-child,.table td:last-child{text-align:right}.table th:nth-child(2),.table td:nth-child(2){text-align:center;width:70px}.summary{margin-left:auto;max-width:340px}.summary div{display:flex;justify-content:space-between;padding:6px 0}.summary .total{border-top:2px solid #111827;font-size:18px;font-weight:700;margin-top:6px;padding-top:12px}.badge{display:inline-block;border-radius:999px;background:#dcfce7;color:#166534;padding:4px 10px;font-size:13px;font-weight:600}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.button{display:inline-block;padding:11px 16px;border-radius:10px;background:#111827;color:#fff;text-decoration:none;font-weight:600}.button.secondary{background:#eef2ff;color:#3730a3}.links{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.links a{color:#3730a3}.footer{padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:13px}@media(max-width:560px){.grid{grid-template-columns:1fr}.content{padding:20px}.hero{padding:22px 20px}}</style></head>
<body><main class="shell"><section class="card"><header class="hero"><h1>${escapeHtml(organization.name)}</h1>${organization.tagline ? `<p>${escapeHtml(organization.tagline)}</p>` : ""}<p>${escapeHtml(store.name)}${store.address ? ` · ${escapeHtml(store.address)}` : ""}</p></header><div class="content"><div class="grid"><div><div class="muted">Invoice</div><div class="value">${escapeHtml(sale.saleNumber ?? "-")}</div><div class="muted">${escapeHtml(formatDate(sale.committedAt ?? sale.createdAt))}</div></div><div><div class="muted">Customer</div><div class="value">${escapeHtml(customerName)}</div>${customerPhone ? `<div class="muted">${escapeHtml(maskPhone(customerPhone))}</div>` : ""}</div></div><div><span class="badge">${escapeHtml(status)}</span></div><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No items</td></tr>`}</tbody></table><div class="summary"><div><span>Subtotal</span><span>${formatAmount(sale.subtotal)}</span></div>${Number(sale.discountTotal) > 0 ? `<div><span>Discount</span><span>-${formatAmount(sale.discountTotal)}</span></div>` : ""}<div class="total"><span>Total</span><span>${formatAmount(sale.grandTotal)}</span></div><div><span>Paid</span><span>${formatAmount(sale.paidTotal)}</span></div><div><span>Balance due</span><span>${formatAmount(sale.dueTotal)}</span></div></div><div class="actions"><a class="button" href="${escapeHtml(pdfUrl)}">Download PDF</a>${store.reviewLink ? `<a class="button secondary" href="${escapeHtml(store.reviewLink)}" rel="noopener noreferrer">${escapeHtml(store.reviewPlatform || "Leave a review")}</a>` : ""}</div>${links.length ? `<div class="links">${linkMarkup(links)}</div>` : ""}</div><footer class="footer">This invoice is provided by ${escapeHtml(store.name)}. If you have questions about this bill, please contact the store.</footer></section></main></body></html>`;
};
