import { Hono } from "hono";
import { renderSalePdf } from "./invoice-pdf";
import { getPublicInvoiceData, renderPublicInvoiceHtml } from "./public-invoice.service";

const publicInvoiceRoutes = new Hono();

publicInvoiceRoutes.get("/invoices/:token.pdf", async c => {
  const data = await getPublicInvoiceData(c.req.param("token") ?? "");
  if (!data) return c.json({ status: "error", message: "Invoice link is invalid or unavailable" }, 404);
  const pdf = await renderSalePdf(data.sale, {
    organizationName: data.organization.name,
    organizationTagline: data.organization.tagline,
    storeName: data.store.name,
    storeAddress: data.store.address,
  });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${data.sale.saleNumber ?? "document"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});

publicInvoiceRoutes.get("/invoices/:token", async c => {
  const data = await getPublicInvoiceData(c.req.param("token") ?? "");
  if (!data) return c.text("Invoice link is invalid or unavailable", 404);
  return c.html(renderPublicInvoiceHtml(data));
});

export default publicInvoiceRoutes;
