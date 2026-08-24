import { describe, expect, test } from "bun:test";
import {
  buildDefaultCloudTemplateVariableMapping,
  uniqueProviderPlaceholderIndexes,
  validateCloudTemplateVariableMapping,
} from "./cloud-template-variable-mapping";

describe("Cloud template variable mapping", () => {
  const definitions = [{ type: "BODY", text: "Hello {{1}}, bill {{2}}" }];

  test("creates and validates an explicit mapping", () => {
    const mapping = buildDefaultCloudTemplateVariableMapping(
      "Hello {{customer_name}}, bill {{bill_number}}",
      definitions,
    );
    expect(mapping).toEqual({ "body:1": "customer_name", "body:2": "bill_number" });
    expect(validateCloudTemplateVariableMapping(mapping, "Hello {{customer_name}}, bill {{bill_number}}", definitions)).toEqual(mapping);
  });

  test("rejects a mapping after the local template changes", () => {
    expect(() => validateCloudTemplateVariableMapping(
      { "body:1": "customer_name", "body:2": "bill_number" },
      "Hello {{customer_name}}, total {{total_due}}",
      definitions,
    )).toThrow("missing body:2");
  });

  test("supports repeated provider placeholders and local variables", () => {
    const repeatedDefinitions = [{
      type: "BODY",
      text: "Hello {{1}}, store {{2}}, again {{2}}",
    }];
    const localBody = "Hello {{customer_name}}, store {{store_name}}, again {{store_name}}";

    const mapping = buildDefaultCloudTemplateVariableMapping(
      localBody,
      repeatedDefinitions,
    );

    expect(mapping).toEqual({
      "body:1": "customer_name",
      "body:2": "store_name",
    });
    expect(validateCloudTemplateVariableMapping(mapping, localBody, repeatedDefinitions)).toEqual(mapping);
  });

  test("returns unique provider placeholders in numeric order", () => {
    expect(uniqueProviderPlaceholderIndexes("Hello {{1}}, store {{6}}, bill {{2}}, again {{6}}")).toEqual([
      "1",
      "2",
      "6",
    ]);
  });
});
