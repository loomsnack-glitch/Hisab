import type { LabelTemplateDocument } from "./catalog.type";

export const A4_SHEET_LABEL_TEMPLATE: LabelTemplateDocument = {
  name: "A4 sheet (3 × 8 labels)",
  status: "active",
  stock: {
    widthMm: 70,
    heightMm: 35,
    labelsPerRow: 3,
    horizontalGapMm: 0,
    verticalGapMm: 0,
    media: "sheet",
    sheet: {
      pageWidthMm: 210,
      pageHeightMm: 297,
      columns: 3,
      rows: 8,
    },
  },
  keepOuts: [],
  elements: [
    {
      id: "product-name",
      type: "text",
      xMm: 2,
      yMm: 1,
      widthMm: 66,
      heightMm: 5,
      rotationDeg: 0,
      text: {
        source: "binding",
        binding: "product.name",
        fontSizeMm: 2.5,
        fontWeight: "bold",
        align: "center",
      },
    },
    {
      id: "product-code-barcode",
      type: "barcode",
      xMm: 3,
      yMm: 6.5,
      widthMm: 64,
      heightMm: 22,
      rotationDeg: 0,
      barcode: {
        symbology: "ean13",
        showHumanDigits: true,
      },
    },
    {
      id: "selling-price",
      type: "text",
      xMm: 2,
      yMm: 29,
      widthMm: 66,
      heightMm: 5,
      rotationDeg: 0,
      text: {
        source: "binding",
        binding: "product.price",
        fontSizeMm: 2.5,
        fontWeight: "bold",
        align: "center",
      },
    },
  ],
};

export const THERMAL_ROLL_LABEL_TEMPLATE: LabelTemplateDocument = {
  name: "Thermal label (58 × 40 mm)",
  status: "active",
  stock: {
    widthMm: 58,
    heightMm: 40,
    labelsPerRow: 1,
    horizontalGapMm: 0,
    verticalGapMm: 0,
    media: "roll",
  },
  keepOuts: [],
  elements: [
    {
      id: "product-name",
      type: "text",
      xMm: 2,
      yMm: 1.5,
      widthMm: 54,
      heightMm: 5.5,
      rotationDeg: 0,
      text: {
        source: "binding",
        binding: "product.name",
        fontSizeMm: 2.5,
        fontWeight: "bold",
        align: "center",
      },
    },
    {
      id: "product-code-barcode",
      type: "barcode",
      xMm: 2.5,
      yMm: 7.5,
      widthMm: 53,
      heightMm: 25,
      rotationDeg: 0,
      barcode: {
        symbology: "ean13",
        showHumanDigits: true,
      },
    },
    {
      id: "selling-price",
      type: "text",
      xMm: 2,
      yMm: 33.5,
      widthMm: 54,
      heightMm: 5.5,
      rotationDeg: 0,
      text: {
        source: "binding",
        binding: "product.price",
        fontSizeMm: 2.5,
        fontWeight: "bold",
        align: "center",
      },
    },
  ],
};

export const SEEDED_LABEL_TEMPLATES = [
  A4_SHEET_LABEL_TEMPLATE,
  THERMAL_ROLL_LABEL_TEMPLATE,
] as const;
