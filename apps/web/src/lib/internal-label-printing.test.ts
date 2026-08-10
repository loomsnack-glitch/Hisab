import { describe, expect, test } from "bun:test";

import {
  A4_LABEL_CAPACITY,
  EAN13_MODULE_COUNT,
  EAN13_QUIET_ZONE_MODULES,
  buildInternalLabelDocument,
  buildInternalLabelPreview,
  canPrintInternalLabels,
} from "./internal-label-printing";

const internalCode = "0400000000008";

describe("Internal Product Code label printing", () => {
  test("renders the exact 13-digit Internal Product Code as a black EAN-13 barcode with quiet zones and readable digits", () => {
    const preview = buildInternalLabelPreview({
      productCode: internalCode,
      productName: "House Blend Tea",
      sellingPrice: 125,
      includeProductName: false,
      includeSellingPrice: false,
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
  });

  test("keeps optional Product text outside the barcode quiet zones and warns when selling price is printed", () => {
    const preview = buildInternalLabelPreview({
      productCode: internalCode,
      productName: "House Blend Tea",
      sellingPrice: 125,
      includeProductName: true,
      includeSellingPrice: true,
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

  test("accepts a numeric catalog price string without crashing the preview", () => {
    expect(() =>
      buildInternalLabelPreview({
        productCode: internalCode,
        productName: "House Blend Tea",
        sellingPrice: "125" as unknown as number,
        includeProductName: false,
        includeSellingPrice: true,
      }),
    ).not.toThrow();
  });

  test("carries legible text sizing into the browser preview instead of relying on print-only CSS", () => {
    const preview = buildInternalLabelPreview({
      productCode: internalCode,
      productName: "House Blend Tea",
      sellingPrice: 125,
      includeProductName: true,
      includeSellingPrice: true,
    });

    expect(preview.svg).toContain('class="product-name" font-size="7"');
    expect(preview.svg).toContain(
      'class="human-readable-digits" font-size="6"',
    );
    expect(preview.svg).toContain('class="selling-price" font-size="7"');
  });

  test("places A4 copies after the selected starting position and continues onto a new sheet", () => {
    const document = buildInternalLabelDocument({
      layout: "a4",
      startingPosition: A4_LABEL_CAPACITY - 1,
      copyCount: 3,
      label: {
        productCode: internalCode,
        productName: "House Blend Tea",
        sellingPrice: 125,
        includeProductName: true,
        includeSellingPrice: false,
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
      layout: "a4",
      copyCount: 1,
      label: {
        productCode: internalCode,
        productName: "House Blend Tea",
        sellingPrice: 125,
        includeProductName: true,
        includeSellingPrice: false,
      },
    });

    expect(document.html).toContain('preserveAspectRatio="none"');
    expect(document.html).toContain(
      ".internal-product-label { width: 70mm; height: 35mm; }",
    );
  });

  test("uses a dedicated thermal layout for every requested copy", () => {
    const document = buildInternalLabelDocument({
      layout: "thermal",
      copyCount: 2,
      label: {
        productCode: internalCode,
        productName: "House Blend Tea",
        sellingPrice: 125,
        includeProductName: false,
        includeSellingPrice: false,
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
});
