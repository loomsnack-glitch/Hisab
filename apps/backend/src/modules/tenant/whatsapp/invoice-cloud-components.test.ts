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

  test("sends a dynamic invoice button without generating an invoice document", () => {
    expect(buildInvoiceCloudComponents(
      [
        { type: "BODY", text: "Hello {{1}}" },
        {
          type: "BUTTONS",
          buttons: [{
            type: "URL",
            text: "View invoice",
            url: "https://api.example.test/invoices/{{1}}",
          }],
        },
      ],
      "Hello {{customer_name}}\n\nView your invoice online: {{invoice_url}}",
      {
        customer_name: "Asha",
        invoice_url: "https://api.example.test/invoices/invoice-token",
      },
      null,
      { "body:1": "customer_name", "button:0:1": "invoice_url" },
    )).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Asha" }] },
      {
        type: "button",
        subType: "url",
        index: "0",
        parameters: [{
          type: "text",
          text: "https://api.example.test/invoices/invoice-token",
        }],
      },
    ]);
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

  test("sends one body parameter per unique placeholder in numeric order", () => {
    const body = [
      "Hello {{1}},",
      "Thank you for shopping with {{6}}.",
      "Bill number: {{2}}",
      "Total amount: {{3}}",
      "Paid: {{4}}",
      "Balance due: {{5}}",
      "Regards from {{6}}.",
    ].join("\n");

    expect(buildInvoiceCloudComponents(
      [{ type: "HEADER", format: "DOCUMENT" }, { type: "BODY", text: body }],
      "Hello {{customer_name}}, {{organization_name}}, {{bill_number}}, {{total}}, {{paid}}, {{balance_due}}",
      {
        customer_name: "Asha",
        bill_number: "INV-1001",
        total: "₹1,250.00",
        paid: "₹1,000.00",
        balance_due: "₹250.00",
        organization_name: "Ganatri",
      },
      "https://storage.example.test/invoice.pdf?signature=abc",
      {
        "body:1": "customer_name",
        "body:2": "bill_number",
        "body:3": "total",
        "body:4": "paid",
        "body:5": "balance_due",
        "body:6": "organization_name",
      },
    )).toEqual([
      { type: "header", parameters: [{ type: "document", document: { link: "https://storage.example.test/invoice.pdf?signature=abc" } }] },
      { type: "body", parameters: [
        { type: "text", text: "Asha" },
        { type: "text", text: "INV-1001" },
        { type: "text", text: "₹1,250.00" },
        { type: "text", text: "₹1,000.00" },
        { type: "text", text: "₹250.00" },
        { type: "text", text: "Ganatri" },
      ] },
    ]);
  });
});
