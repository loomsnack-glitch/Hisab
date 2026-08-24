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
      { "body:1": "customer_name", "body:2": "store_name" },
    )).toEqual([
      { type: "header", parameters: [{ type: "image", image: { link: "https://media.example/promotion.jpg" } }] },
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] },
    ]);
  });

  test("sends one parameter for a repeated provider placeholder", () => {
    expect(buildPromotionCloudComponents(
      [{ type: "body", text: "Hello {{1}}, store {{2}}, again {{2}}" }],
      "Hello {{customer_name}}, store {{store_name}}, again {{store_name}}",
      { customer_name: "Asha", store_name: "Central Store" },
      null,
      { "body:1": "customer_name", "body:2": "store_name" },
    )).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] },
    ]);
  });

  test("orders body parameters by placeholder number, not first appearance", () => {
    expect(buildPromotionCloudComponents(
      [{ type: "body", text: "Hello {{1}} from {{3}}, store {{2}}" }],
      "Hello {{customer_name}} from {{organization_name}}, store {{store_name}}",
      { customer_name: "Asha", store_name: "Central Store", organization_name: "Ganatri" },
      null,
      { "body:1": "customer_name", "body:2": "store_name", "body:3": "organization_name" },
    )).toEqual([
      { type: "body", parameters: [
        { type: "text", text: "Asha" },
        { type: "text", text: "Central Store" },
        { type: "text", text: "Ganatri" },
      ] },
    ]);
  });

  test("rejects an image when the approved template has no image header", () => {
    expect(() => buildPromotionCloudComponents(
      [{ type: "body", text: "Hello {{1}}" }],
      "Hello {{customer_name}}",
      { customer_name: "Asha" },
      "https://media.example/promotion.jpg",
      { "body:1": "customer_name" },
    )).toThrow("image-header template");
  });
});
