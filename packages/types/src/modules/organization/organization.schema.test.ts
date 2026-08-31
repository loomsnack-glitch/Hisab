import { describe, expect, test } from "bun:test";
import {
  OrganizationDTOSchema,
  StoreDTOSchema,
  UpdateOrganizationSchema,
  UpdateOrganizationCatalogSettingsSchema,
  UpdateStoreSchema,
  UpdateStoreDevicePosSettingsSchema,
} from "./organization.schema";
import { DeviceSessionStoreDTOSchema } from "../device-auth/device-auth.schema";

describe("Organization branding contracts", () => {
  test("accepts an optional tagline and preserves trimmed text", () => {
    const result = UpdateOrganizationSchema.safeParse({
      name: "Hisab Foods",
      username: "hisab-foods",
      tagline: "  Fresh taste, every day  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagline).toBe("Fresh taste, every day");
    }
  });

  test("accepts a blank tagline so it can be cleared", () => {
    const result = UpdateOrganizationSchema.safeParse({
      name: "Hisab Foods",
      username: "hisab-foods",
      tagline: "",
    });

    expect(result.success).toBe(true);
  });

  test("rejects a tagline longer than 255 characters", () => {
    const result = UpdateOrganizationSchema.safeParse({
      name: "Hisab Foods",
      username: "hisab-foods",
      tagline: "a".repeat(256),
    });

    expect(result.success).toBe(false);
  });

  test("keeps the DTO tagline contract capped at 255 characters", () => {
    expect(
      OrganizationDTOSchema.shape.tagline.safeParse("a".repeat(255)).success,
    ).toBe(true);
    expect(
      OrganizationDTOSchema.shape.tagline.safeParse("a".repeat(256)).success,
    ).toBe(false);
  });
});

describe("Store customer engagement contracts", () => {
  test("accepts a named review destination with its link", () => {
    const result = UpdateStoreSchema.safeParse({
      name: "Panini House",
      address: "",
      reviewPlatform: "  Google  ",
      reviewLink: "https://g.page/r/example/review",
      socialMediaName: "",
      socialMediaLink: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewPlatform).toBe("Google");
      expect(result.data.reviewLink).toBe("https://g.page/r/example/review");
    }
  });

  test("accepts a named social destination with its link", () => {
    const result = UpdateStoreSchema.safeParse({
      name: "Panini House",
      address: "",
      reviewPlatform: "",
      reviewLink: "",
      socialMediaName: "  Instagram  ",
      socialMediaLink: "https://instagram.com/paninihouse",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialMediaName).toBe("Instagram");
      expect(result.data.socialMediaLink).toBe(
        "https://instagram.com/paninihouse",
      );
    }
  });

  test("rejects incomplete review and social destinations", () => {
    expect(
      UpdateStoreSchema.safeParse({
        name: "Panini House",
        reviewPlatform: "Google",
        reviewLink: "",
      }).success,
    ).toBe(false);
    expect(
      UpdateStoreSchema.safeParse({
        name: "Panini House",
        socialMediaName: "",
        socialMediaLink: "https://instagram.com/paninihouse",
      }).success,
    ).toBe(false);
  });
});

describe("Barcode settings contracts", () => {
  test("accepts explicit boolean settings", () => {
    expect(
      UpdateOrganizationCatalogSettingsSchema.parse({
        barcodeScanningEnabled: false,
      }),
    ).toEqual({
      barcodeScanningEnabled: false,
    });
    expect(
      UpdateStoreDevicePosSettingsSchema.parse({
        directBarcodeScanEnabled: false,
      }),
    ).toEqual({
      directBarcodeScanEnabled: false,
    });
  });

  test("does not allow a Store Device settings request to carry catalog identity fields", () => {
    expect(
      UpdateStoreDevicePosSettingsSchema.safeParse({
        directBarcodeScanEnabled: true,
        productCode: "7622202334009",
      }).success,
    ).toBe(false);
  });
});

describe("Store Money Account Tracking contracts", () => {
  test("Store DTO requires Money Account Tracking and defaults it as a boolean feature", () => {
    const result = StoreDTOSchema.safeParse({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Adajan",
      kotSystemEnabled: false,
      tableManagementEnabled: false,
      moneyAccountTrackingEnabled: false,
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moneyAccountTrackingEnabled).toBe(false);
    }
    expect(
      StoreDTOSchema.safeParse({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Adajan",
        kotSystemEnabled: false,
        tableManagementEnabled: false,
        createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        createdAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  test("Update Store accepts Money Account Tracking enablement without requiring other feature flags", () => {
    const result = UpdateStoreSchema.safeParse({
      name: "Adajan",
      moneyAccountTrackingEnabled: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moneyAccountTrackingEnabled).toBe(true);
    }
  });

  test("device session Store includes Money Account Tracking", () => {
    const result = DeviceSessionStoreDTOSchema.safeParse({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Adajan",
      address: null,
      kotSystemEnabled: false,
      tableManagementEnabled: false,
      moneyAccountTrackingEnabled: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moneyAccountTrackingEnabled).toBe(false);
    }
  });
});
