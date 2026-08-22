import { describe, expect, test } from "bun:test";
import { buildInvoiceCloudComponents } from "./invoice-cloud-components";

describe("Cloud invoice template components", () => {
  test("maps local bill tokens in order and adds the document header", () => {
    const components = buildInvoiceCloudComponents(
      [
        { type: "HEADER", format: "DOCUMENT" },
        { type: "BODY", text: "Hello {{1}}, bill {{2}}" },
      ],
      "Hello {{customer_name}}, bill {{bill_number}}",
      { customer_name: "Asha", bill_number: "INV-12" },
      "https://storage.example.test/invoice.pdf?signature=abc",
    );
    expect(components).toEqual([
      { type: "header", parameters: [{ type: "document", document: { link: "https://storage.example.test/invoice.pdf?signature=abc" } }] },
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "INV-12" }] },
    ]);
  });

  test("rejects a Cloud bill template that cannot carry the invoice document", () => {
    expect(() => buildInvoiceCloudComponents(
      [{ type: "BODY", text: "Hello {{1}}" }],
      "Hello {{customer_name}}",
      { customer_name: "Asha" },
      "https://storage.example.test/invoice.pdf",
    )).toThrow("document header");
  });
});
