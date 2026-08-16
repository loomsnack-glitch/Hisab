import { describe, expect, test } from "bun:test";
import {
  OrganizationDTOSchema,
  UpdateOrganizationSchema,
  UpdateOrganizationCatalogSettingsSchema,
  UpdateStoreSchema,
  UpdateStoreDevicePosSettingsSchema,
} from "./organization.schema";

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
