import { describe, expect, test } from "bun:test";
import { buildInvoiceCloudComponents } from "./invoice-cloud-components";

describe("Cloud invoice template components", () => {
  test("uses the explicit local-to-Cloud mapping and adds the document header", () => {
    const components = buildInvoiceCloudComponents(
      [
        { type: "HEADER", format: "DOCUMENT" },
        { type: "BODY", text: "Hello {{1}}, bill {{2}}" },
      ],
      "Hello {{bill_number}}, bill {{customer_name}}",
      { customer_name: "Asha", bill_number: "INV-12" },
      "https://storage.example.test/invoice.pdf?signature=abc",
      { "body:1": "bill_number", "body:2": "customer_name" },
    );
    expect(components).toEqual([
      { type: "header", parameters: [{ type: "document", document: { link: "https://storage.example.test/invoice.pdf?signature=abc" } }] },
      { type: "body", parameters: [{ type: "text", text: "INV-12" }, { type: "text", text: "Asha" }] },
    ]);
  });

  test("rejects a Cloud bill template that cannot carry the invoice document", () => {
    expect(() => buildInvoiceCloudComponents(
      [{ type: "BODY", text: "Hello {{1}}" }],
      "Hello {{customer_name}}",
      { customer_name: "Asha" },
      "https://storage.example.test/invoice.pdf",
      { "body:1": "customer_name" },
    )).toThrow("document header");
  });
});
