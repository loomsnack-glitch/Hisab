import { describe, expect, test } from "bun:test";

import { leftoverPrintableBox, mapLabelElementsIntoBox } from "@repo/types";

import type { LabelTemplateDocument } from "@repo/types";

import {
  A4_LABEL_CAPACITY,
  A4_SHEET_LABEL_TEMPLATE,
  EAN13_MODULE_COUNT,
  EAN13_QUIET_ZONE_MODULES,
  THERMAL_ROLL_LABEL_TEMPLATE,
  buildInternalLabelDocument,
  buildInternalLabelLayoutPreview,
  buildInternalLabelPreview,
  canOfferProductLabelPrint,
  canPrintInternalLabels,
  labelPrintConfirmationKey,
} from "./internal-label-printing";

const internalCode = "0400000000008";
const opaqueStoreCode = "VR000001";
const CODE128_START_B = "11010010000";

const barcodeTemplate = (
  barcode: {
    symbology: "ean13" | "code128";
    showHumanDigits?: boolean;
    rotationDeg?: 0 | 90 | 180 | 270;
  },
): LabelTemplateDocument => ({
  ...THERMAL_ROLL_LABEL_TEMPLATE,
  name: "Barcode only",
  keepOuts: [],
  elements: [
    {
      id: "product-code-barcode",
      type: "barcode",
      xMm: 2,
      yMm: 8,
      widthMm: 54,
      heightMm: 24,
      rotationDeg: barcode.rotationDeg ?? 0,
      barcode: {
        symbology: barcode.symbology,
        showHumanDigits: barcode.showHumanDigits ?? true,
      },
    },
  ],
});

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
      'class="product-name-box" x="2" y="1" width="66" height="5"',
    );
    expect(preview.svg).toContain(
      'class="selling-price-box" x="2" y="29" width="66" height="5"',
    );
    expect(preview.svg).toContain("Noto Sans Gujarati");
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

    expect(preview.svg).toContain('class="product-name" font-size="2.5"');
    expect(preview.svg).toContain(
      'class="human-readable-digits" font-size="8"',
    );
    expect(preview.svg).toContain('class="selling-price" font-size="2.5"');
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

  test("sizes a 1-across roll print page to the saved Label Stock millimetres", () => {
    const document = buildInternalLabelDocument({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        stock: {
          ...THERMAL_ROLL_LABEL_TEMPLATE.stock,
          widthMm: 50,
          heightMm: 40,
        },
      },
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
      job: {
        copyCount: 1,
      },
    });

    expect(document.html).toContain("@page { size: 50mm 40mm;");
    expect(document.html).toContain(
      ".internal-product-label { width: 50mm; height: 40mm; }",
    );
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
      elements: A4_SHEET_LABEL_TEMPLATE.elements,
    });
    const thermalKey = labelPrintConfirmationKey({
      templateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      elements: THERMAL_ROLL_LABEL_TEMPLATE.elements,
    });

    expect(a4Key).not.toBe(thermalKey);
    expect(
      canPrintInternalLabels({
        testPrinted: true,
        testScanConfirmed: true,
      }),
    ).toBe(true);
  });

  test("places 2-across roll labels using Label Stock millimetres and the horizontal gap", () => {
    const document = buildInternalLabelDocument({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        name: "Two-across roll",
        stock: {
          widthMm: 40,
          heightMm: 30,
          labelsPerRow: 2,
          horizontalGapMm: 2,
          verticalGapMm: 3,
          media: "roll",
        },
        elements: [],
      },
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
      job: {
        copyCount: 3,
      },
    });

    expect(document.html).toContain("@page { size: 82mm 30mm;");
    expect(document.html).toContain(
      "grid-template-columns: repeat(2, 40mm)",
    );
    expect(document.html).toContain("column-gap: 2mm");
    expect(document.html).toContain(".internal-product-label { width: 40mm; height: 30mm; }");
    expect(document.pages).toHaveLength(2);
    expect(document.html.match(/data-label-copy=/g)).toHaveLength(3);
  });

  test("layout preview shows an empty second slot for one copy on a 2-across roll", () => {
    const preview = buildInternalLabelLayoutPreview({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        stock: {
          widthMm: 38,
          heightMm: 50,
          labelsPerRow: 2,
          horizontalGapMm: 2,
          verticalGapMm: 0,
          media: "roll",
        },
      },
      product: {
        productCode: internalCode,
        name: "Sample product name",
        price: 80,
      },
      job: {
        copyCount: 1,
      },
    });

    expect(preview.columns).toBe(2);
    expect(preview.rows).toBe(1);
    expect(preview.slots).toEqual([{ filled: true }, { filled: false }]);
    expect(preview.svg).toContain("Sample product name");
  });

  test("layout preview fills both slots for two copies on a 2-across roll", () => {
    const preview = buildInternalLabelLayoutPreview({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        stock: {
          widthMm: 38,
          heightMm: 50,
          labelsPerRow: 2,
          horizontalGapMm: 2,
          verticalGapMm: 0,
          media: "roll",
        },
      },
      product: {
        productCode: internalCode,
        name: "Sample product name",
        price: 80,
      },
      job: {
        copyCount: 2,
      },
    });

    expect(preview.slots).toEqual([{ filled: true }, { filled: true }]);
  });

  test("sizes a sheet print page from Label Stock millimetres and places labels with both gaps", () => {
    const document = buildInternalLabelDocument({
      template: {
        ...A4_SHEET_LABEL_TEMPLATE,
        name: "Custom sheet",
        stock: {
          widthMm: 60,
          heightMm: 40,
          labelsPerRow: 2,
          horizontalGapMm: 4,
          verticalGapMm: 3,
          media: "sheet",
          sheet: {
            pageWidthMm: 210,
            pageHeightMm: 297,
            columns: 2,
            rows: 6,
          },
        },
      },
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
      job: {
        copyCount: 1,
        startingPosition: 2,
      },
    });

    expect(document.html).toContain("@page { size: 210mm 297mm;");
    expect(document.html).toContain(
      "grid-template-columns: repeat(2, 60mm)",
    );
    expect(document.html).toContain("grid-template-rows: repeat(6, 40mm)");
    expect(document.html).toContain("column-gap: 4mm");
    expect(document.html).toContain("row-gap: 3mm");
    expect(document.pages[0]?.occupiedPositions).toEqual([2]);
  });

  test("shades Keep-Outs on the preview and leaves them undrawn in the print document", () => {
    const template = {
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      keepOuts: [{ xMm: 0, yMm: 0, widthMm: 2, heightMm: 40 }],
    };
    const product = {
      productCode: internalCode,
      name: null,
      price: null,
    };
    const preview = buildInternalLabelPreview({ template, product });
    const document = buildInternalLabelDocument({
      template,
      product,
      job: { copyCount: 1 },
    });

    expect(preview.svg).toContain('width="2" height="40"');
    expect(preview.svg).toMatch(/fill-opacity="0\.\d+"/);
    expect(document.html).toContain('width="2" height="40"');
    expect(document.html).not.toMatch(/fill-opacity="0\.\d+"/);
    expect(document.html).toContain('fill="#fff"');
  });

  test("draws barcode content in leftover space below a top Keep-Out instead of covering it", () => {
    const preview = buildInternalLabelPreview({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        stock: {
          ...THERMAL_ROLL_LABEL_TEMPLATE.stock,
          widthMm: 38,
          heightMm: 50,
        },
        keepOuts: [{ xMm: 0, yMm: 0, widthMm: 38, heightMm: 20 }],
        elements: [
          {
            id: "product-code-barcode",
            type: "barcode",
            xMm: 2,
            yMm: 22,
            widthMm: 34,
            heightMm: 26,
            rotationDeg: 0,
            barcode: {
              symbology: "ean13",
              showHumanDigits: true,
            },
          },
        ],
      },
      product: {
        productCode: internalCode,
        name: "Sample Product",
        price: 125,
      },
    });

    expect(preview.svg).toContain(
      'class="internal-product-label-barcode" role="img" aria-label="EAN-13 barcode 0400000000008" x="2" y="22" width="34" height="26"',
    );
    expect(preview.svg).toContain('x="0" y="0" width="38" height="20"');
  });

  test("rejects print when a Label Element intersects a Keep-Out", () => {
    const template = {
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      keepOuts: [{ xMm: 0, yMm: 0, widthMm: 58, heightMm: 12 }],
    };
    const product = {
      productCode: internalCode,
      name: null,
      price: null,
    };

    const preview = buildInternalLabelPreview({ template, product });
    expect(preview.svg).toContain('width="58" height="12"');
    expect(preview.svg).toMatch(/fill-opacity="0\.\d+"/);

    expect(() =>
      buildInternalLabelDocument({
        template,
        product,
        job: { copyCount: 1 },
      }),
    ).toThrow("Label Element intersects a Keep-Out");
  });

  test("prints a branded header Keep-Out when Label Elements sit in leftover space", () => {
    const stock = {
      ...THERMAL_ROLL_LABEL_TEMPLATE.stock,
      widthMm: 38,
      heightMm: 50,
      labelsPerRow: 2,
      horizontalGapMm: 2,
      verticalGapMm: 2,
    };
    const keepOuts = [{ xMm: 0, yMm: 0, widthMm: 38, heightMm: 20 }];
    const leftover = leftoverPrintableBox(stock, keepOuts);
    const elements = mapLabelElementsIntoBox(
      THERMAL_ROLL_LABEL_TEMPLATE.elements,
      THERMAL_ROLL_LABEL_TEMPLATE.stock,
      leftover,
    );

    const barcode = elements.find((element) => element.type === "barcode");

    const document = buildInternalLabelDocument({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        stock,
        keepOuts,
        elements,
      },
      product: {
        productCode: internalCode,
        name: "Sample Product",
        price: 125,
      },
      job: { copyCount: 1 },
    });

    expect(barcode).toBeDefined();
    expect(barcode?.yMm).toBeGreaterThanOrEqual(20);
    expect(document.html).toContain(`y="${barcode?.yMm}"`);
    expect(document.html).toContain('x="0" y="0" width="38" height="20"');
    expect(document.html).toContain('fill="#fff"');
  });

  test("encodes an opaque Product Code such as VR000001 as Code 128", () => {
    const preview = buildInternalLabelPreview({
      template: barcodeTemplate({ symbology: "code128" }),
      product: {
        productCode: opaqueStoreCode,
        name: null,
        price: null,
      },
    });

    expect(preview.encodedCode).toBe(opaqueStoreCode);
    expect(preview.humanReadableDigits).toBe(opaqueStoreCode);
    expect(preview.modulePattern.startsWith(CODE128_START_B)).toBe(true);
    expect(preview.modulePattern).not.toHaveLength(EAN13_MODULE_COUNT);
    expect(preview.svg).toContain('fill="#fff"');
    expect(preview.svg).toContain('fill="#000"');
    expect(preview.svg).toContain(`>${opaqueStoreCode}</text>`);
  });

  test("refuses EAN-13 print when the Product Code is not a valid EAN-13 value", () => {
    expect(() =>
      buildInternalLabelPreview({
        template: barcodeTemplate({ symbology: "ean13" }),
        product: {
          productCode: opaqueStoreCode,
          name: null,
          price: null,
        },
      }),
    ).toThrow("Product Code is not a valid EAN-13 value");
  });

  test("rotating a barcode 90 degrees still encodes the same Product Code", () => {
    const product = {
      productCode: internalCode,
      name: null,
      price: null,
    };
    const upright = buildInternalLabelPreview({
      template: barcodeTemplate({ symbology: "ean13", rotationDeg: 0 }),
      product,
    });
    const rotated = buildInternalLabelPreview({
      template: barcodeTemplate({ symbology: "ean13", rotationDeg: 90 }),
      product,
    });

    expect(rotated.encodedCode).toBe(internalCode);
    expect(rotated.modulePattern).toBe(upright.modulePattern);
    expect(rotated.svg).toContain("rotate(90");
  });

  test("changing barcode rotation produces a different test-scan confirmation key", () => {
    const templateId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const upright = labelPrintConfirmationKey({
      templateId,
      elements: barcodeTemplate({ symbology: "ean13", rotationDeg: 0 }).elements,
    });
    const rotated = labelPrintConfirmationKey({
      templateId,
      elements: barcodeTemplate({ symbology: "ean13", rotationDeg: 90 }).elements,
    });

    expect(upright).not.toBe(rotated);
  });

  test("offers label printing when Barcode Scanning is enabled and the Product has a Product Code", () => {
    expect(
      canOfferProductLabelPrint({
        barcodeScanningEnabled: true,
        productCode: opaqueStoreCode,
      }),
    ).toBe(true);
    expect(
      canOfferProductLabelPrint({
        barcodeScanningEnabled: true,
        productCode: internalCode,
      }),
    ).toBe(true);
    expect(
      canOfferProductLabelPrint({
        barcodeScanningEnabled: true,
        productCode: null,
      }),
    ).toBe(false);
    expect(
      canOfferProductLabelPrint({
        barcodeScanningEnabled: false,
        productCode: opaqueStoreCode,
      }),
    ).toBe(false);
  });

  test("omits missing optional Product text instead of printing a placeholder", () => {
    const preview = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
    });

    expect(preview.textAboveBarcode).toBeNull();
    expect(preview.textBelowBarcode).toBeNull();
    expect(preview.svg).not.toContain("class=\"product-name\"");
    expect(preview.svg).not.toContain("class=\"selling-price\"");
    expect(preview.svg).not.toContain("undefined");
  });

  test("prints static text and a box Label Element", () => {
    const preview = buildInternalLabelPreview({
      template: {
        ...THERMAL_ROLL_LABEL_TEMPLATE,
        keepOuts: [],
        elements: [
          {
            id: "static-taxes",
            type: "text",
            xMm: 4,
            yMm: 4,
            widthMm: 50,
            heightMm: 6,
            rotationDeg: 0,
            text: {
              source: "static",
              staticValue: "Inc. of all Taxes",
              fontSizeMm: 2.5,
              fontWeight: "normal",
              align: "left",
            },
          },
          {
            id: "frame",
            type: "box",
            xMm: 2,
            yMm: 12,
            widthMm: 54,
            heightMm: 16,
            rotationDeg: 0,
            box: { strokeWidthMm: 0.4 },
          },
        ],
      },
      product: {
        productCode: internalCode,
        name: null,
        price: null,
      },
    });

    expect(preview.svg).toContain("Inc. of all Taxes");
    expect(preview.svg).toContain('class="label-box"');
    expect(preview.svg).toContain('stroke-width="0.4"');
    expect(preview.modulePattern).toBe("");
  });

  test("renders Gujarati Product name with a Gujarati-capable web font", () => {
    const preview = buildInternalLabelPreview({
      template: A4_SHEET_LABEL_TEMPLATE,
      product: {
        productCode: internalCode,
        name: "જીરા ભાખરી",
        price: null,
      },
    });

    expect(preview.svg).toContain("જીરા ભાખરી");
    expect(preview.svg).toContain("Noto Sans Gujarati");
  });

  test("prints a manufacturer EAN-13 Product Code", () => {
    const manufacturerCode = "8901030865428";
    const preview = buildInternalLabelPreview({
      template: barcodeTemplate({ symbology: "ean13" }),
      product: {
        productCode: manufacturerCode,
        name: null,
        price: null,
      },
    });

    expect(preview.encodedCode).toBe(manufacturerCode);
    expect(preview.modulePattern).toHaveLength(EAN13_MODULE_COUNT);
    expect(preview.svg).toContain(`>${manufacturerCode}</text>`);
  });
});
