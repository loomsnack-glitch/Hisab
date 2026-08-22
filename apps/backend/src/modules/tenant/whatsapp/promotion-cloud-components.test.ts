import { describe, expect, test } from "bun:test";
import { buildPromotionCloudComponents } from "./promotion-cloud-components";

describe("Cloud promotion template components", () => {
  test("maps marketing values and an optional image header", () => {
    expect(buildPromotionCloudComponents(
      [
        { type: "header", format: "IMAGE" },
        { type: "body", text: "Hello {{1}} from {{2}}" },
      ],
      "Hello {{customer_name}} from {{store_name}}",
      { customer_name: "Asha", store_name: "Central Store" },
      "https://media.example/promotion.jpg",
    )).toEqual([
      { type: "header", parameters: [{ type: "image", image: { link: "https://media.example/promotion.jpg" } }] },
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] },
    ]);
  });

  test("rejects an image when the approved template has no image header", () => {
    expect(() => buildPromotionCloudComponents(
      [{ type: "body", text: "Hello {{1}}" }],
      "Hello {{customer_name}}",
      { customer_name: "Asha" },
      "https://media.example/promotion.jpg",
    )).toThrow("image-header template");
  });
});
