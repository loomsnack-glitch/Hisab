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
      { type: "button", subType: "url", index: "0", parameters: [{ type: "text", text: "https://pay.example/customer" }] },
    ]);
  });

  test("rejects unsupported media headers", () => {
    expect(() => buildDueReminderCloudComponents(
      [{ type: "header", format: "IMAGE" }],
      "Reminder",
      {},
      {},
    )).toThrow("cannot use media headers");
  });
});
