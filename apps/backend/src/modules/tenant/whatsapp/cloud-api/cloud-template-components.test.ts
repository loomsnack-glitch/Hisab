import { describe, expect, test } from "bun:test";
import {
  buildCloudTemplateComponents,
  CloudTemplateComponentError,
} from "./cloud-template-components";

describe("Cloud template component builder", () => {
  test("builds body and document header parameters from the approved definition", () => {
    const components = buildCloudTemplateComponents([
      { type: "HEADER", format: "DOCUMENT" },
      { type: "BODY", text: "Hello {{1}}" },
    ], [
      { type: "header", parameters: [{ type: "document", document: { id: "media-1" } }] },
      { type: "body", parameters: [{ type: "text", text: "Asha" }] },
    ]);
    expect(components).toEqual([
      { type: "header", parameters: [{ type: "document", document: { id: "media-1" } }] },
      { type: "body", parameters: [{ type: "text", text: "Asha" }] },
    ]);
  });

  test("rejects missing, extra, and mismatched parameters", () => {
    expect(() => buildCloudTemplateComponents(
      [{ type: "BODY", text: "Hello {{1}}" }],
      [],
    )).toThrow(CloudTemplateComponentError);
    expect(() => buildCloudTemplateComponents(
      [{ type: "BODY", text: "Hello" }],
      [{ type: "body", parameters: [{ type: "text", text: "extra" }] }],
    )).toThrow("parameter count is invalid");
    expect(() => buildCloudTemplateComponents(
      [{ type: "HEADER", format: "IMAGE" }],
      [{ type: "header", parameters: [{ type: "document", document: { id: "media-1" } }] }],
    )).toThrow("Image header requires an image parameter");
  });

  test("counts repeated provider placeholders once", () => {
    expect(buildCloudTemplateComponents(
      [{ type: "BODY", text: "Hello {{1}}, store {{2}}, again {{2}}" }],
      [{ type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] }],
    )).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Asha" }, { type: "text", text: "Central Store" }] },
    ]);
  });

  test("requires HTTPS for link-based media parameters", () => {
    expect(() => buildCloudTemplateComponents(
      [{ type: "HEADER", format: "IMAGE" }],
      [{ type: "header", parameters: [{ type: "image", image: { link: "http://example.com/image.jpg" } }] }],
    )).toThrow("must use HTTPS");
  });

  test("maps URL button parameters by button index", () => {
    const components = buildCloudTemplateComponents([
      { type: "BUTTONS", buttons: [{ type: "URL", url: "https://example.com/{{1}}" }] },
    ], [
      { type: "button", subType: "url", index: "0", parameters: [{ type: "text", text: "review" }] },
    ]);
    expect(components).toEqual([
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: "review" }] },
    ]);
  });
});
