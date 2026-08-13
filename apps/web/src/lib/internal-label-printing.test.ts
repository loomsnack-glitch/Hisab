import { describe, expect, test } from "bun:test";

import {
  A4_LABEL_CAPACITY,
  A4_SHEET_LABEL_TEMPLATE,
  EAN13_MODULE_COUNT,
  EAN13_QUIET_ZONE_MODULES,
  THERMAL_ROLL_LABEL_TEMPLATE,
  buildInternalLabelDocument,
  buildInternalLabelPreview,
  canPrintInternalLabels,
  labelPrintConfirmationKey,
} from "./internal-label-printing";

const internalCode = "0400000000008";

describe("Internal Product Code label printing", () => {
  test("renders the exact 13-digit Internal Product Code as a black EAN-13 barcode with quiet zones and readable digits", () => {
    const preview = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
    });

    expect(preview.encodedCode).toBe(internalCode);
    expect(preview.humanReadableDigits).toBe(internalCode);
    expect(preview.modulePattern).toHaveLength(EAN13_MODULE_COUNT);
    expect(preview.modulePattern).toBe(
      "101" +
        "0100011" +
        "0001101" +
        "0001101" +
        "0001101" +
        "0001101" +
        "0001101" +
        "01010" +
        "1110010" +
        "1110010" +
        "1110010" +
        "1110010" +
        "1110010" +
        "1001000" +
        "101",
    );
    expect(preview.quietZoneModules).toEqual({
      left: EAN13_QUIET_ZONE_MODULES,
      right: EAN13_QUIET_ZONE_MODULES,
    });
    expect(preview.svg).toContain('fill="#fff"');
    expect(preview.svg).toContain('fill="#000"');
    expect(preview.svg).toContain(`>${internalCode}</text>`);
    expect(preview.textAboveBarcode).toBeNull();
    expect(preview.textBelowBarcode).toBeNull();
    expect(preview.sellingPriceWarning).toBeNull();
  });

  test("keeps optional Product text outside the barcode quiet zones and warns when selling price is printed", () => {
    const preview = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "House Blend Tea",
        price: 125,
      },
    });

    expect(preview.textAboveBarcode).toBe("House Blend Tea");
    expect(preview.textBelowBarcode).toBe("₹125.00");
    expect(preview.sellingPriceWarning).toBe(
      "Selling price is printed on this label. Reprint labels after any price change.",
    );
    expect(preview.svg).toContain('class="product-name"');
    expect(preview.svg).toContain('class="selling-price"');
    expect(preview.svg).toContain(
      'class="product-name" font-size="7" font-family="Arial, sans-serif" x="58.5" y="11"',
    );
    expect(preview.svg).toContain(
      'class="selling-price" font-size="7" font-family="Arial, sans-serif" x="58.5" y="90"',
    );
  });

  test("never puts Product text into the encoded barcode payload", () => {
    const named = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "House Blend Tea",
        price: 125,
      },
    });
    const renamed = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "Different Product Name",
        price: 999,
      },
    });

    expect(named.encodedCode).toBe(internalCode);
    expect(renamed.encodedCode).toBe(internalCode);
    expect(named.modulePattern).toBe(renamed.modulePattern);
    expect(named.encodedCode).not.toContain("House Blend Tea");
    expect(named.humanReadableDigits).toBe(internalCode);
  });

  test("accepts a numeric catalog price string without crashing the preview", () => {
    expect(() =>
      buildInternalLabelPreview({
        template: A4_SHEET_LABEL_TEMPLATE,
        product: {
          productCode: internalCode,
          name: "House Blend Tea",
          price: "125",
        },
      }),
    ).not.toThrow();
  });

  test("carries legible text sizing into the browser preview instead of relying on print-only CSS", () => {
    const preview = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "House Blend Tea",
        price: 125,
      },
    });

    expect(preview.svg).toContain('class="product-name" font-size="7"');
    expect(preview.svg).toContain(
      'class="human-readable-digits" font-size="6"',
    );
    expect(preview.svg).toContain('class="selling-price" font-size="7"');
  });

  test("places A4 copies after the selected starting position and continues onto a new sheet", () => {
    const document = buildInternalLabelDocument({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "House Blend Tea",
        price: null,
      },
      job: {
        copyCount: 3,
        startingPosition: A4_LABEL_CAPACITY - 1,
      },
    });

    expect(document.pages).toHaveLength(2);
    expect(document.pages[0]?.occupiedPositions).toEqual([
      A4_LABEL_CAPACITY - 1,
      A4_LABEL_CAPACITY,
    ]);
    expect(document.pages[1]?.occupiedPositions).toEqual([1]);
    expect(document.html.match(/data-label-copy=/g)).toHaveLength(3);
  });

  test("scales the barcode drawing to fill its physical A4 label cell instead of letterboxing it like the preview", () => {
    const document = buildInternalLabelDocument({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "House Blend Tea",
        price: null,
      },
      job: {
        copyCount: 1,
      },
    });

    expect(document.html).toContain('preserveAspectRatio="none"');
    expect(document.html).toContain(
      ".internal-product-label { width: 70mm; height: 35mm; }",
    );
    expect(document.html).toContain("@page { size: 210mm 297mm;");
  });

  test("uses the in-code thermal Label Template for every requested copy", () => {
    const document = buildInternalLabelDocument({
      template: THERMAL_ROLL_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
      job: {
        copyCount: 2,
      },
    });

    expect(document.pages).toHaveLength(2);
    expect(document.html).toContain("@page { size: 58mm 40mm;");
    expect(document.html.match(/data-label-copy=/g)).toHaveLength(2);
  });

  test("requires a test print and an operator-confirmed production-like scan before labels can print", () => {
    expect(
      canPrintInternalLabels({ testPrinted: false, testScanConfirmed: false }),
    ).toBe(false);
    expect(
      canPrintInternalLabels({ testPrinted: true, testScanConfirmed: false }),
    ).toBe(false);
    expect(
      canPrintInternalLabels({ testPrinted: true, testScanConfirmed: true }),
    ).toBe(true);
  });

  test("changing the chosen Label Template produces a different test-scan confirmation key", () => {
    const a4Key = labelPrintConfirmationKey({
      templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      includeProductName: true,
      includeSellingPrice: false,
    });
    const thermalKey = labelPrintConfirmationKey({
      templateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      includeProductName: true,
      includeSellingPrice: false,
    });

    expect(a4Key).not.toBe(thermalKey);
    expect(
      canPrintInternalLabels({
        testPrinted: true,
        testScanConfirmed: true,
      }),
    ).toBe(true);
  });
});
