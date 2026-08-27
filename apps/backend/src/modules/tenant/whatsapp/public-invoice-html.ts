import type { InvoiceAppearanceTokens, ResolvedInvoiceAppearance } from "@repo/types";
import {
  buildInvoiceDocument,
  buildSampleInvoiceDocument,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoicePayments,
  maskInvoicePhone,
  type InvoiceDocument,
  type InvoiceDocumentBranding,
  type InvoicePreviewViewport,
  type InvoiceRenderMode,
} from "./invoice-document";
import { renderInvoiceLinkIcon } from "./invoice-link-icons";

const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const statusStyles = (status: InvoiceDocument["paymentStatus"], tokens: InvoiceAppearanceTokens) => {
  switch (status) {
    case "Paid":
      return { background: tokens.statusPaidBackground, color: tokens.statusPaidText, border: "#86efac" };
    case "Partially Paid":
      return { background: tokens.statusPartialBackground, color: tokens.statusPartialText, border: "#fcd34d" };
    case "Cancelled":
      return { background: tokens.statusCancelledBackground, color: tokens.statusCancelledText, border: tokens.borderColor };
    default:
      return { background: tokens.statusDueBackground, color: tokens.statusDueText, border: "#fca5a5" };
  }
};

const renderLineRows = (document: InvoiceDocument): string =>
  document.lines.map((line) => {
    const indent = line.indent * 16;
    return `<tr>
      <td style="padding-left:${indent}px">${escapeHtml(line.name)}</td>
      <td>${escapeHtml(line.quantity)}</td>
      <td>${line.rate ? escapeHtml(line.rate) : ""}</td>
      <td>${line.amount ? escapeHtml(line.amount) : ""}</td>
    </tr>`;
  }).join("");

const renderLineCards = (document: InvoiceDocument): string =>
  document.lines.map((line) => `<article class="item-card" style="padding-left:${line.indent * 16}px">
    <div class="item-main">
      <div class="item-name">${escapeHtml(line.name)}</div>
      <div class="item-meta">Qty ${escapeHtml(line.quantity)}${line.rate ? ` · Rate ${escapeHtml(line.rate)}` : ""}</div>
    </div>
    <div class="item-amount">${line.amount ? escapeHtml(line.amount) : ""}</div>
  </article>`).join("");

const renderStyles = (
  tokens: InvoiceAppearanceTokens,
  mode: InvoiceRenderMode,
  viewport: InvoicePreviewViewport,
): string => {
  const shellWidth = viewport === "mobile" ? "390px" : viewport === "pdf" ? "794px" : "860px";
  const printRules = mode === "print" || mode === "preview" && viewport === "pdf"
    ? `@page{size:A4;margin:16mm}body{background:#fff}.shell{max-width:none;margin:0;padding:0}.card{box-shadow:none;border:none;border-radius:0}.actions,.screen-only{display:none!important}.items-table{display:block!important}.items-cards{display:none!important}`
    : "";
  const mobilePreviewRules = viewport === "mobile" && mode !== "print"
    ? `body.preview-mobile{width:390px;max-width:100%;margin:0 auto;overflow-x:hidden}body.preview-mobile .shell{width:100%;max-width:none;margin:0;padding:16px}body.preview-mobile .hero{flex-direction:column;gap:14px}body.preview-mobile .status-badge{width:100%}body.preview-mobile .meta-grid{grid-template-columns:1fr}body.preview-mobile .items-table{display:none!important}body.preview-mobile .items-cards{display:grid!important}body.preview-mobile .hero,body.preview-mobile .content{padding:20px}body.preview-mobile .footer{padding:16px 20px}`
    : "";
  return `
:root{
  --accent:${tokens.accentColor};
  --accent-text:${tokens.accentContrastColor};
  --page-bg:${tokens.pageBackground};
  --card-bg:${tokens.cardBackground};
  --border:${tokens.borderColor};
  --muted:${tokens.mutedText};
  --text:${tokens.bodyText};
  --radius:${tokens.borderRadius};
  --shadow:${mode === "print" ? "none" : tokens.shadow};
  --pad:${tokens.contentPadding};
  --gap:${tokens.itemGap};
}
*{box-sizing:border-box}
body{margin:0;background:var(--page-bg);color:var(--text);font:16px/1.5 ${tokens.fontFamily}}
.shell{max-width:${shellWidth};margin:32px auto;padding:0 16px}
.card{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
.hero{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;justify-content:space-between;padding:var(--pad);background:var(--hero-bg, var(--accent));color:var(--hero-text, var(--accent-text))}
.hero.minimal{background:#fff;color:var(--text);border-bottom:1px solid var(--border)}
.brand{display:flex;flex:1 1 0%;gap:16px;align-items:flex-start;min-width:0}
.logo-frame{display:grid;width:64px;height:64px;flex:0 0 64px;place-items:center;border-radius:12px;background:#fff;padding:6px;overflow:hidden}
.logo{display:block;width:100%;height:100%;border-radius:8px;object-fit:contain}
.brand-copy{min-width:0;flex:1 1 auto;overflow-wrap:anywhere}
.brand h1,.brand p{overflow-wrap:anywhere;word-break:break-word}
.brand h1{margin:0;font-size:clamp(22px,4vw,30px);line-height:1.15}
.brand p{margin:6px 0 0;color:inherit;opacity:.88}
.status-badge{display:inline-flex;align-items:center;justify-content:center;min-width:132px;padding:10px 14px;border-radius:999px;border:1px solid var(--status-border);background:var(--status-bg);color:var(--status-color);font-size:14px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}
.content{padding:var(--pad)}
.meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:24px}
.meta-card{padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:#fff}
.meta-label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.meta-value{margin-top:6px;font-weight:600}
.items-table table{width:100%;border-collapse:collapse}
.items-table th,.items-table td{padding:12px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.items-table th:last-child,.items-table td:last-child,.items-table th:nth-child(3),.items-table td:nth-child(3){text-align:right}
.items-cards{display:none;gap:var(--gap)}
.item-card{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}
.item-name{font-weight:600}
.item-meta{margin-top:4px;font-size:13px;color:var(--muted)}
.item-amount{font-weight:700;white-space:nowrap}
.totals{display:grid;gap:10px;margin-top:24px}
.totals-row{display:flex;justify-content:space-between;gap:12px}
.totals-row.total{font-size:20px;font-weight:700;padding-top:10px;border-top:2px solid var(--text)}
.totals-row.balance{font-size:18px;font-weight:700;padding:14px 16px;border-radius:12px;background:#fff7ed;border:1px solid #fdba74}
.totals-row.balance .balance-label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9a3412}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:11px 16px;border-radius:10px;text-decoration:none;font-weight:600;border:1px solid transparent;background:var(--accent);color:var(--accent-text)}
.links{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}
.link-action{display:inline-flex;align-items:center;gap:8px;color:#3730a3;text-decoration:none;font-weight:600}
.link-icon{width:18px;height:18px;flex-shrink:0}
.notes,.terms,.payments{margin-top:24px;padding:16px;border-radius:12px;background:#f9fafb;border:1px solid var(--border)}
.notes h2,.terms h2,.payments h2{margin:0 0 8px;font-size:15px}
.footer{padding:18px var(--pad);background:#f9fafb;color:var(--muted);font-size:13px;border-top:1px solid var(--border)}
.empty-state{padding:18px 0;color:var(--muted)}
@media (max-width:720px){
  .hero{flex-direction:column}
  .status-badge{width:100%}
  .meta-grid{grid-template-columns:1fr}
  .items-table{display:none}
  .items-cards{display:grid}
}
${mobilePreviewRules}
${printRules}`;
};

export const renderInvoiceHtml = (
  document: InvoiceDocument,
  options: {
    mode?: InvoiceRenderMode;
    viewport?: InvoicePreviewViewport;
  } = {},
): string => {
  const mode = options.mode ?? "screen";
  const viewport = options.viewport ?? "desktop";
  const { sale, branding, appearance, logoUrl, logoDataUrl } = document;
  const { settings, tokens } = appearance;
  const visibility = settings.visibility;
  const status = statusStyles(document.paymentStatus, tokens);
  const pdfUrl = document.token && document.publicBaseUrl
    ? `${document.publicBaseUrl}/${encodeURIComponent(document.token)}.pdf`
    : null;
  const logoSrc = logoDataUrl ?? logoUrl;
  const logoMarkup = logoSrc && settings.logoPath
    ? `<div class="logo-frame"><img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(branding.organizationName)} logo" width="64" height="64"></div>`
    : "";
  const heroClass = settings.headerStyle === "minimal" ? "hero minimal" : "hero";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(branding.organizationName)} invoice${sale.saleNumber ? ` ${escapeHtml(sale.saleNumber)}` : ""}</title>
<style>${renderStyles(tokens, mode, viewport)}</style></head>
<body class="preview-${viewport}">
<main class="shell">
  <section class="card" aria-labelledby="invoice-title">
    <header class="${heroClass}" style="--hero-bg:${tokens.headerBackground};--hero-text:${tokens.headerText};--status-bg:${status.background};--status-color:${status.color};--status-border:${status.border}">
      <div class="brand">
        ${logoMarkup}
        <div class="brand-copy">
          <h1 id="invoice-title">${escapeHtml(branding.organizationName)}</h1>
          ${visibility.showTagline && branding.organizationTagline ? `<p>${escapeHtml(branding.organizationTagline)}</p>` : ""}
          <p>${escapeHtml(branding.storeName)}${visibility.showAddress && branding.storeAddress ? ` · ${escapeHtml(branding.storeAddress)}` : ""}${visibility.showStorePhone && branding.storePhone ? ` · ${escapeHtml(branding.storePhone)}` : ""}</p>
        </div>
      </div>
      <div class="status-badge" role="status" aria-label="Payment status ${escapeHtml(document.paymentStatus)}">${escapeHtml(document.paymentStatus)}</div>
    </header>
    <div class="content">
      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Invoice</div>
          <div class="meta-value">${escapeHtml(sale.saleNumber ?? "-")}</div>
          <div class="meta-label" style="margin-top:10px">Date</div>
          <div class="meta-value">${escapeHtml(formatInvoiceDate(sale.committedAt ?? sale.createdAt))}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Customer</div>
          <div class="meta-value">${escapeHtml(document.customerName)}</div>
          ${visibility.showCustomerPhone && document.customerPhone ? `<div class="meta-label" style="margin-top:10px">Phone</div><div class="meta-value">${escapeHtml(maskInvoicePhone(document.customerPhone))}</div>` : ""}
          ${visibility.showServiceMode ? `<div class="meta-label" style="margin-top:10px">Service</div><div class="meta-value">${escapeHtml(document.serviceModeLabel)}</div>` : ""}
        </div>
      </div>
      <div class="items items-table" role="region" aria-label="Invoice items">
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>${renderLineRows(document) || `<tr><td colspan="4">No items on this invoice.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="items items-cards" role="list">${renderLineCards(document) || `<div class="empty-state">No items on this invoice.</div>`}</div>
      <div class="totals" aria-label="Invoice totals">
        <div class="totals-row"><span>Subtotal</span><span>${formatInvoiceAmount(sale.subtotal)}</span></div>
        ${Number(sale.discountTotal) > 0 ? `<div class="totals-row"><span>Order discount</span><span>-${formatInvoiceAmount(sale.discountTotal)}</span></div>` : ""}
        <div class="totals-row total"><span>Total</span><span>${formatInvoiceAmount(sale.grandTotal)}</span></div>
        <div class="totals-row"><span>Paid</span><span>${formatInvoiceAmount(sale.paidTotal)}</span></div>
        <div class="totals-row balance" aria-label="Balance due"><div><span class="balance-label">Balance due</span>${formatInvoiceAmount(sale.dueTotal)}</div></div>
      </div>
      ${document.showDownloadAction && pdfUrl && mode === "screen" ? `<div class="actions screen-only"><a class="button" href="${escapeHtml(pdfUrl)}">Download PDF</a></div>` : ""}
      ${document.links.length ? `<div class="links">${document.links.map((link) => `<a class="link-action" href="${escapeHtml(link.url)}" rel="noopener noreferrer">${renderInvoiceLinkIcon(link.icon)}<span>${escapeHtml(link.label)}</span></a>`).join("")}</div>` : ""}
      ${visibility.showNotes && sale.notes ? `<section class="notes" aria-label="Notes"><h2>Notes</h2><p>${escapeHtml(sale.notes)}</p></section>` : ""}
      ${sale.payments.length > 0 ? `<section class="payments" aria-label="Payments"><h2>Payments</h2>${formatInvoicePayments(sale.payments).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</section>` : ""}
      ${visibility.showTerms && settings.termsText ? `<section class="terms" aria-label="Terms"><h2>Terms</h2><p>${escapeHtml(settings.termsText)}</p></section>` : ""}
    </div>
    <footer class="footer">${escapeHtml(document.footerText)}</footer>
  </section>
</main>
</body></html>`;
};

// Backward-compatible exports used by existing imports.
export type PublicInvoiceBranding = InvoiceDocumentBranding;

export const renderPublicInvoiceHtml = (
  document: InvoiceDocument,
  options?: { mode?: InvoiceRenderMode; viewport?: InvoicePreviewViewport },
): string => renderInvoiceHtml(document, options);

export const buildSamplePublicInvoiceView = (
  appearance: ResolvedInvoiceAppearance,
  overrides: Partial<{
    branding: InvoiceDocumentBranding;
    token: string;
    publicBaseUrl: string;
    logoUrl: string | null;
    logoDataUrl: string | null;
    showDownloadAction: boolean;
  }> = {},
): InvoiceDocument => buildSampleInvoiceDocument(appearance, overrides);

export const buildPublicInvoiceDocument = buildInvoiceDocument;
