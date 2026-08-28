import { Hono } from "hono";
import { createInvoicePdfContext, renderSalePdf } from "./invoice-pdf";
import {
  buildPublicInvoiceDocument,
  getPublicInvoiceData,
  renderPublicInvoiceHtml,
} from "./public-invoice.service";
import { renderInvalidInvoiceLinkHtml } from "./public-invoice-states";

const publicInvoiceRoutes = new Hono();

publicInvoiceRoutes.get("/invoices/:token", async c => {
  const rawToken = c.req.param("token") ?? "";
  const isPdf = rawToken.endsWith(".pdf");
  const token = isPdf ? rawToken.slice(0, -4) : rawToken;
  const data = await getPublicInvoiceData(token);
  if (!data) {
    return isPdf
      ? c.json({ status: "error", message: "Invoice link is invalid or unavailable" }, 404)
      : c.html(renderInvalidInvoiceLinkHtml(), 404);
  }

  try {
    const { document, logoBuffer } = await buildPublicInvoiceDocument(data);
    if (isPdf) {
      const pdf = await renderSalePdf(createInvoicePdfContext(document, logoBuffer));
      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${data.sale.saleNumber ?? "document"}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    const response = c.html(renderPublicInvoiceHtml(document, { mode: "screen", viewport: "desktop" }));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invoice_render_failed";
    console.error("[public-invoice] Failed to render invoice", {
      saleNumber: data.sale.saleNumber ?? "unknown",
      message,
    });
    return isPdf
      ? c.json({ status: "error", message: "Unable to generate invoice PDF right now" }, 500)
      : c.html(renderInvalidInvoiceLinkHtml("We could not load this invoice right now."), 500);
  }
});

export default publicInvoiceRoutes;
