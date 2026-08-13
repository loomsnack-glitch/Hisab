export const EAN13_MODULE_COUNT = 95;
export const EAN13_QUIET_ZONE_MODULES = 11;
export const A4_LABEL_COLUMNS = 3;
export const A4_LABEL_ROWS = 8;
export const A4_LABEL_CAPACITY = A4_LABEL_COLUMNS * A4_LABEL_ROWS;

export type LabelRotationDeg = 0 | 90 | 180 | 270;

export type LabelStock = {
  widthMm: number;
  heightMm: number;
  labelsPerRow: number;
  horizontalGapMm: number;
  verticalGapMm: number;
  media: "sheet" | "roll";
  sheet?: {
    pageWidthMm: number;
    pageHeightMm: number;
    columns: number;
    rows: number;
  };
};

export type LabelKeepOut = {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type LabelElement =
  | {
      id: string;
      type: "text";
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      rotationDeg: LabelRotationDeg;
      text: {
        source: "static" | "binding";
        staticValue?: string;
        binding?: string;
        fontSizeMm: number;
        fontWeight: "normal" | "bold";
        align: "left" | "center" | "right";
      };
    }
  | {
      id: string;
      type: "barcode";
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      rotationDeg: LabelRotationDeg;
      barcode: {
        symbology: "ean13" | "code128";
        showHumanDigits: boolean;
      };
    }
  | {
      id: string;
      type: "table";
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      rotationDeg: LabelRotationDeg;
      table: { binding: "productLabel.nutrition" };
    }
  | {
      id: string;
      type: "box";
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      rotationDeg: LabelRotationDeg;
      box: { strokeWidthMm: number };
    };

export type LabelTemplate = {
  name: string;
  status: "active" | "inactive";
  stock: LabelStock;
  keepOuts: LabelKeepOut[];
  elements: LabelElement[];
};

export type LabelProductInput = {
  productCode: string;
  name?: string | null;
  price?: number | string | null;
};

export type LabelJobInput = {
  copyCount: number;
  startingPosition?: number;
};

export const A4_SHEET_LABEL_TEMPLATE: LabelTemplate = {
  name: "A4 sheet (3 × 8 labels)",
  status: "active",
  stock: {
    widthMm: 70,
    heightMm: 35,
    labelsPerRow: A4_LABEL_COLUMNS,
    horizontalGapMm: 0,
    verticalGapMm: 0,
    media: "sheet",
    sheet: {
      pageWidthMm: 210,
      pageHeightMm: 297,
      columns: A4_LABEL_COLUMNS,
      rows: A4_LABEL_ROWS,
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

export const THERMAL_ROLL_LABEL_TEMPLATE: LabelTemplate = {
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

type Ean13Parity = "L" | "G";
type Ean13Encoding = Record<string, string>;

const leftEncodings: Ean13Encoding = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

const middleEncodings: Ean13Encoding = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};

const rightEncodings: Ean13Encoding = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};

const parityByLeadingDigit: Record<string, Ean13Parity[]> = {
  "0": ["L", "L", "L", "L", "L", "L"],
  "1": ["L", "L", "G", "L", "G", "G"],
  "2": ["L", "L", "G", "G", "L", "G"],
  "3": ["L", "L", "G", "G", "G", "L"],
  "4": ["L", "G", "L", "L", "G", "G"],
  "5": ["L", "G", "G", "L", "L", "G"],
  "6": ["L", "G", "G", "G", "L", "L"],
  "7": ["L", "G", "L", "G", "L", "G"],
  "8": ["L", "G", "L", "G", "G", "L"],
  "9": ["L", "G", "G", "L", "G", "L"],
};

const guardModuleIndexes = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);

export type LabelPreviewInput = {
  template: LabelTemplate;
  product: LabelProductInput;
};

export type LabelDocumentInput = {
  template: LabelTemplate;
  product: LabelProductInput;
  job: LabelJobInput;
};

type LabelFaceInput = {
  productCode: string;
  productName: string;
  sellingPrice: number | string | null | undefined;
  includeProductName: boolean;
  includeSellingPrice: boolean;
};

const templateHasBinding = (template: LabelTemplate, binding: string) =>
  template.elements.some(
    (element) =>
      element.type === "text" &&
      element.text.source === "binding" &&
      element.text.binding === binding,
  );

const labelInputFromTemplate = (input: LabelPreviewInput): LabelFaceInput => {
  const productName = input.product.name?.trim() ?? "";
  return {
    productCode: input.product.productCode,
    productName,
    sellingPrice: input.product.price,
    includeProductName:
      templateHasBinding(input.template, "product.name") && productName.length > 0,
    includeSellingPrice:
      templateHasBinding(input.template, "product.price") &&
      input.product.price != null &&
      input.product.price !== "",
  };
};

export type InternalLabelPreview = {
  encodedCode: string;
  humanReadableDigits: string;
  modulePattern: string;
  quietZoneModules: { left: number; right: number };
  textAboveBarcode: string | null;
  textBelowBarcode: string | null;
  sellingPriceWarning: string | null;
  svg: string;
};

export type InternalLabelDocument = {
  html: string;
  pages: Array<{ occupiedPositions: number[] }>;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const calculateEan13CheckDigit = (codeWithoutCheckDigit: string) => {
  const digits = Array.from(codeWithoutCheckDigit);
  const sum = digits.reduce(
    (total, digit, index) =>
      total + Number(digit) * ((digits.length - 1 - index) % 2 === 0 ? 3 : 1),
    0,
  );
  return String((10 - (sum % 10)) % 10);
};

const assertInternalProductCode = (productCode: string) => {
  if (!/^04\d{11}$/.test(productCode)) {
    throw new Error(
      "Internal Product Code labels require an exact 13-digit code beginning with 04",
    );
  }

  if (
    calculateEan13CheckDigit(productCode.slice(0, -1)) !== productCode.at(-1)
  ) {
    throw new Error("Internal Product Code has an invalid EAN-13 check digit");
  }
};

const encodeEan13 = (productCode: string) => {
  assertInternalProductCode(productCode);

  const parity = parityByLeadingDigit[productCode[0]];
  const left = Array.from(productCode.slice(1, 7))
    .map((digit, index) =>
      parity[index] === "L" ? leftEncodings[digit] : middleEncodings[digit],
    )
    .join("");
  const right = Array.from(productCode.slice(7))
    .map((digit) => rightEncodings[digit])
    .join("");
  const modules = `101${left}01010${right}101`;

  if (modules.length !== EAN13_MODULE_COUNT) {
    throw new Error("Failed to encode the Internal Product Code as EAN-13");
  }

  return modules;
};

const renderBars = (modulePattern: string) =>
  Array.from(modulePattern)
    .flatMap((module, index) => {
      if (module !== "1") {
        return [];
      }

      const height = guardModuleIndexes.has(index) ? 51 : 46;
      return `<rect x="${EAN13_QUIET_ZONE_MODULES + index}" y="18" width="1" height="${height}" fill="#000"/>`;
    })
    .join("");

const formatSellingPrice = (
  sellingPrice: LabelFaceInput["sellingPrice"],
) => {
  const numericSellingPrice = Number(sellingPrice);
  if (!Number.isFinite(numericSellingPrice) || numericSellingPrice < 0) {
    return null;
  }

  return `₹${numericSellingPrice.toFixed(2)}`;
};

export const buildInternalLabelPreview = (
  input: LabelPreviewInput,
): InternalLabelPreview => {
  const label = labelInputFromTemplate(input);
  const modulePattern = encodeEan13(label.productCode);
  const textAboveBarcode = label.includeProductName ? label.productName : null;
  const textBelowBarcode = label.includeSellingPrice
    ? formatSellingPrice(label.sellingPrice)
    : null;
  const viewBoxHeight = textBelowBarcode ? 94 : 84;
  const svg = `<svg class="internal-product-label-barcode" role="img" aria-label="EAN-13 barcode ${label.productCode}" viewBox="0 0 ${EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2} ${viewBoxHeight}" preserveAspectRatio="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2}" height="${viewBoxHeight}" fill="#fff"/>${textAboveBarcode ? `<text class="product-name" font-size="7" font-family="Arial, sans-serif" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="11" text-anchor="middle">${escapeHtml(textAboveBarcode)}</text>` : ""}${renderBars(modulePattern)}<text class="human-readable-digits" font-size="6" font-family="monospace" letter-spacing="0.5" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="78" text-anchor="middle">${label.productCode}</text>${textBelowBarcode ? `<text class="selling-price" font-size="7" font-family="Arial, sans-serif" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="90" text-anchor="middle">${textBelowBarcode}</text>` : ""}</svg>`;

  return {
    encodedCode: label.productCode,
    humanReadableDigits: label.productCode,
    modulePattern,
    quietZoneModules: {
      left: EAN13_QUIET_ZONE_MODULES,
      right: EAN13_QUIET_ZONE_MODULES,
    },
    textAboveBarcode,
    textBelowBarcode,
    sellingPriceWarning: textBelowBarcode
      ? "Selling price is printed on this label. Reprint labels after any price change."
      : null,
    svg,
  };
};

const renderLabelCopy = (preview: InternalLabelPreview, copyNumber: number) =>
  `<article class="internal-product-label" data-label-copy="${copyNumber}">${preview.svg}</article>`;

export const sheetLabelCapacity = (template: LabelTemplate) => {
  if (template.stock.media === "sheet" && template.stock.sheet) {
    return template.stock.sheet.columns * template.stock.sheet.rows;
  }

  return 1;
};

const sheetPagePaddingMm = (template: LabelTemplate) => {
  const sheet = template.stock.sheet;
  if (!sheet) {
    return { horizontal: 0, vertical: 0 };
  }

  const { widthMm, heightMm, horizontalGapMm, verticalGapMm } = template.stock;
  const usedWidth =
    sheet.columns * widthMm + Math.max(0, sheet.columns - 1) * horizontalGapMm;
  const usedHeight =
    sheet.rows * heightMm + Math.max(0, sheet.rows - 1) * verticalGapMm;

  return {
    horizontal: (sheet.pageWidthMm - usedWidth) / 2,
    vertical: (sheet.pageHeightMm - usedHeight) / 2,
  };
};

const documentStyles = (template: LabelTemplate) => {
  const { widthMm, heightMm, horizontalGapMm, verticalGapMm, media, sheet } =
    template.stock;
  const pageSize =
    media === "sheet" && sheet
      ? `${sheet.pageWidthMm}mm ${sheet.pageHeightMm}mm`
      : `${widthMm}mm ${heightMm}mm`;
  const padding = sheetPagePaddingMm(template);
  const layoutStyles =
    media === "sheet" && sheet
      ? `.internal-label-page { width: ${sheet.pageWidthMm}mm; min-height: ${sheet.pageHeightMm}mm; padding: ${padding.vertical}mm ${padding.horizontal}mm; display: grid; grid-template-columns: repeat(${sheet.columns}, ${widthMm}mm); grid-template-rows: repeat(${sheet.rows}, ${heightMm}mm); column-gap: ${horizontalGapMm}mm; row-gap: ${verticalGapMm}mm; page-break-after: always; } .internal-product-label { width: ${widthMm}mm; height: ${heightMm}mm; } .internal-label-empty { width: ${widthMm}mm; height: ${heightMm}mm; }`
      : `.internal-label-page { width: ${widthMm}mm; height: ${heightMm}mm; page-break-after: always; } .internal-product-label { width: ${widthMm}mm; height: ${heightMm}mm; }`;

  return `
  @page { size: ${pageSize}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  .internal-product-label { background: #fff; color: #000; overflow: hidden; }
  .internal-product-label-barcode { display: block; width: 100%; height: 100%; background: #fff; }
  .internal-product-label-barcode text { fill: #000; font-family: Arial, sans-serif; }
  .internal-product-label-barcode .product-name { font-size: 7px; font-weight: 700; }
  .internal-product-label-barcode .human-readable-digits { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8px; letter-spacing: 1px; }
  .internal-product-label-barcode .selling-price { font-size: 8px; font-weight: 700; }
  ${layoutStyles}
`;
};

const validateCopyCount = (copyCount: number) => {
  if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 1_000) {
    throw new Error("Copy count must be a whole number between 1 and 1000");
  }
};

const buildSheetPages = (
  preview: InternalLabelPreview,
  template: LabelTemplate,
  job: LabelJobInput,
) => {
  const capacity = sheetLabelCapacity(template);
  const startingPosition = job.startingPosition ?? 1;
  if (
    !Number.isInteger(startingPosition) ||
    startingPosition < 1 ||
    startingPosition > capacity
  ) {
    throw new Error(
      `A4 starting position must be between 1 and ${capacity}`,
    );
  }

  const pages: Array<{ occupiedPositions: number[]; html: string }> = [];
  let copyNumber = 1;
  let pageStartingPosition = startingPosition;

  while (copyNumber <= job.copyCount) {
    const occupiedPositions: number[] = [];
    const slots = Array.from({ length: capacity }, (_, index) => {
      const position = index + 1;
      if (position < pageStartingPosition || copyNumber > job.copyCount) {
        return '<div class="internal-label-empty" aria-hidden="true"></div>';
      }

      occupiedPositions.push(position);
      return renderLabelCopy(preview, copyNumber++);
    }).join("");

    pages.push({
      occupiedPositions,
      html: `<section class="internal-label-page">${slots}</section>`,
    });
    pageStartingPosition = 1;
  }

  return pages;
};

const buildRollPages = (preview: InternalLabelPreview, copyCount: number) =>
  Array.from({ length: copyCount }, (_, index) => ({
    occupiedPositions: [1],
    html: `<section class="internal-label-page">${renderLabelCopy(preview, index + 1)}</section>`,
  }));

export const buildInternalLabelDocument = (
  input: LabelDocumentInput,
): InternalLabelDocument => {
  validateCopyCount(input.job.copyCount);
  const preview = buildInternalLabelPreview({
    template: input.template,
    product: input.product,
  });
  const pages =
    input.template.stock.media === "sheet"
      ? buildSheetPages(preview, input.template, input.job)
      : buildRollPages(preview, input.job.copyCount);

  return {
    pages: pages.map(({ occupiedPositions }) => ({ occupiedPositions })),
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Internal Product Labels</title><style>${documentStyles(input.template)}</style></head><body>${pages.map((page) => page.html).join("")}</body></html>`,
  };
};

export const canPrintInternalLabels = (input: {
  testPrinted: boolean;
  testScanConfirmed: boolean;
}) => input.testPrinted && input.testScanConfirmed;

/** Opens an isolated browser print document; receipt printing has no dependency on this path. */
export const printInternalLabelDocument = (
  input: LabelDocumentInput,
) => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) {
    frame.remove();
    return false;
  }

  frameDocument.open();
  frameDocument.write(buildInternalLabelDocument(input).html);
  frameDocument.close();

  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => frame.remove(), 1_000);
  }, 100);

  return true;
};
