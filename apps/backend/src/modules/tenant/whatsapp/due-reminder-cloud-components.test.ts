import { describe, expect, test } from "bun:test";
import { buildDueReminderCloudComponents } from "./due-reminder-cloud-components";

describe("Cloud due-reminder template components", () => {
  test("maps utility tokens and dynamic links in component order", () => {
    const components = buildDueReminderCloudComponents(
      [
        { type: "body", text: "Hello {{1}}, your {{2}} bills total {{3}}." },
        { type: "buttons", buttons: [{ type: "URL", text: "Pay", url: "https://pay.example/{{1}}" }] },
      ],
      "Hello {{customer_name}}, your {{bill_count}} bills total {{total_due}}. Pay: {{link_pay}}",
      {
        customer_name: "Asha",
        bill_count: "2",
        total_due: "₹400.00",
        link_pay: "https://pay.example/customer",
      },
      { "body:1": "customer_name", "body:2": "bill_count", "body:3": "total_due", "button:0:1": "link_pay" },
    );

    expect(components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "2" }, { type: "text", text: "₹400.00" }] },
      { type: "button", subType: "url", index: "0", parameters: [{ type: "text", text: "customer" }] },
    ]);
  });

  test("adds the dynamic PDF for a document header", () => {
    const components = buildDueReminderCloudComponents(
      [{ type: "header", format: "DOCUMENT" }, { type: "body", text: "Reminder for {{1}}" }],
      "Reminder for {{customer_name}}",
      { customer_name: "Asha" },
      { "body:1": "customer_name" },
      "https://storage.example.test/due.pdf",
    );
    expect(components[0]).toEqual({ type: "header", parameters: [{ type: "document", document: { link: "https://storage.example.test/due.pdf" } }] });
  });

  test("sends one body parameter for a repeated provider placeholder", () => {
    expect(buildDueReminderCloudComponents(
      [{ type: "body", text: "Hello {{1}}, store {{2}}, again {{2}}" }],
      "Hello {{customer_name}}, store {{store_name}}, again {{store_name}}",
      { customer_name: "Asha", store_name: "Central Store" },
      { "body:1": "customer_name", "body:2": "store_name" },
    )).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] },
    ]);
  });

  test("rejects unsupported media headers", () => {
    expect(() => buildDueReminderCloudComponents(
      [{ type: "header", format: "IMAGE" }],
      "Reminder",
      {},
      {},
    )).toThrow("only support document headers");
  });
});
