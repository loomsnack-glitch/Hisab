const escapeHtml = (value: unknown): string => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

export const renderInvalidInvoiceLinkHtml = (message = "Invoice link is invalid or unavailable"): string =>
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice unavailable</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f4f6;color:#111827;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{max-width:420px;margin:24px;padding:28px;border-radius:16px;background:#fff;border:1px solid #e5e7eb;box-shadow:0 8px 30px #11182712;text-align:center}h1{margin:0 0 8px;font-size:22px}p{margin:0;color:#6b7280}</style></head>
<body><main class="card" role="alert"><h1>Invoice unavailable</h1><p>${escapeHtml(message)}</p></main></body></html>`;

export const renderInvoiceErrorHtml = (message = "We could not load this invoice right now."): string =>
  renderInvalidInvoiceLinkHtml(message);
