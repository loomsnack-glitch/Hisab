import { describe, expect, test } from "bun:test";
import { cloudFeatureCallersEnabled } from "./cloud-feature";

describe("Cloud feature caller gate", () => {
  test("fails closed unless explicitly enabled", () => {
    const previous = process.env.WHATSAPP_CLOUD_CALLERS_ENABLED;
    try {
      delete process.env.WHATSAPP_CLOUD_CALLERS_ENABLED;
      expect(cloudFeatureCallersEnabled()).toBe(false);
      process.env.WHATSAPP_CLOUD_CALLERS_ENABLED = "true";
      expect(cloudFeatureCallersEnabled()).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.WHATSAPP_CLOUD_CALLERS_ENABLED;
      else process.env.WHATSAPP_CLOUD_CALLERS_ENABLED = previous;
    }
  });
});
