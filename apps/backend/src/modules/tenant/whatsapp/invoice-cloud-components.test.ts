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

  test("supports a text-only Cloud bill template without generating an invoice document", () => {
    expect(buildInvoiceCloudComponents(
      [{ type: "BODY", text: "Hello World" }],
      "Hello World",
      {},
      null,
      {},
    )).toEqual([]);
  });

  test("requires an invoice PDF when the Cloud bill template has a document header", () => {
    expect(() => buildInvoiceCloudComponents(
      [{ type: "HEADER", format: "DOCUMENT" }, { type: "BODY", text: "Hello {{1}}" }],
      "Hello {{customer_name}}",
      { customer_name: "Asha" },
      null,
      { "body:1": "customer_name" },
    )).toThrow("invoice PDF");
  });
});
