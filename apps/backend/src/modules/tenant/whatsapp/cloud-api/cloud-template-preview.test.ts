import { describe, expect, test } from "bun:test";
import { buildCloudTemplatePreview } from "./cloud-template-preview";

describe("Cloud template preview", () => {
  test("renders the approved definition with the values sent to Meta", () => {
    const preview = buildCloudTemplatePreview(
      [
        { type: "HEADER", format: "TEXT", text: "Hi {{1}}" },
        { type: "BODY", text: "Your order for {{1}} is ready at {{2}}." },
        { type: "FOOTER", text: "Thank you" },
        {
          type: "BUTTONS",
          buttons: [
            { type: "URL", text: "View order", url: "https://example.com/orders/{{1}}" },
            { type: "QUICK_REPLY", text: "Need help" },
          ],
        },
      ],
      [
        { type: "header", parameters: [{ type: "text", text: "Asha" }] },
        {
          type: "body",
          parameters: [
            { type: "text", text: "Panini" },
            { type: "text", text: "Adajan" },
          ],
        },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "abc123" }] },
        { type: "button", sub_type: "quick_reply", index: "1", parameters: [] },
      ],
    );

    expect(preview).toEqual({
      header: { type: "text", text: "Hi Asha" },
      body: "Your order for Panini is ready at Adajan.",
      footer: "Thank you",
      buttons: [
        { type: "url", text: "View order", url: "https://example.com/orders/abc123" },
        { type: "quick_reply", text: "Need help", url: null },
      ],
    });
  });

  test("keeps media headers safe and does not expose non-HTTPS sources", () => {
    expect(buildCloudTemplatePreview(
      [{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "Offer" }],
      [{ type: "header", parameters: [{ type: "image", image: { link: "http://example.com/image.jpg" } }] }],
    )).toEqual({
      header: { type: "image", url: null, label: "Image header" },
      body: "Offer",
      footer: null,
      buttons: [],
    });
  });

  test("returns null when a historical definition is unavailable", () => {
    expect(buildCloudTemplatePreview(null, [])).toBeNull();
    expect(buildCloudTemplatePreview([], [])).toBeNull();
  });

  test("does not throw for malformed historical outbound data", () => {
    expect(buildCloudTemplatePreview(
      [{ type: "BODY", text: "Offer {{1}}" }],
      [null, { type: "body", parameters: [{ type: "unknown" }] }],
    )).toEqual({ header: null, body: "Offer {{1}}", footer: null, buttons: [] });
  });
});
