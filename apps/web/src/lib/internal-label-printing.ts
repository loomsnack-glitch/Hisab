export const EAN13_MODULE_COUNT = 95;
export const EAN13_QUIET_ZONE_MODULES = 11;
export const A4_LABEL_COLUMNS = 3;
export const A4_LABEL_ROWS = 8;
export const A4_LABEL_CAPACITY = A4_LABEL_COLUMNS * A4_LABEL_ROWS;

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

export type InternalLabelInput = {
  productCode: string;
  productName: string;
  sellingPrice: number | string | null | undefined;
  includeProductName: boolean;
  includeSellingPrice: boolean;
};

export type InternalLabelLayout = "a4" | "thermal";

export type InternalLabelDocumentInput = {
  layout: InternalLabelLayout;
  copyCount: number;
  startingPosition?: number;
  label: InternalLabelInput;
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
  sellingPrice: InternalLabelInput["sellingPrice"],
) => {
  const numericSellingPrice = Number(sellingPrice);
  if (!Number.isFinite(numericSellingPrice) || numericSellingPrice < 0) {
    return null;
  }

  return `₹${numericSellingPrice.toFixed(2)}`;
};

export const buildInternalLabelPreview = (
  input: InternalLabelInput,
): InternalLabelPreview => {
  const modulePattern = encodeEan13(input.productCode);
  const textAboveBarcode = input.includeProductName ? input.productName : null;
  const textBelowBarcode = input.includeSellingPrice
    ? formatSellingPrice(input.sellingPrice)
    : null;
  const viewBoxHeight = textBelowBarcode ? 94 : 84;
  const svg = `<svg class="internal-product-label-barcode" role="img" aria-label="EAN-13 barcode ${input.productCode}" viewBox="0 0 ${EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2} ${viewBoxHeight}" preserveAspectRatio="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2}" height="${viewBoxHeight}" fill="#fff"/>${textAboveBarcode ? `<text class="product-name" font-size="7" font-family="Arial, sans-serif" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="11" text-anchor="middle">${escapeHtml(textAboveBarcode)}</text>` : ""}${renderBars(modulePattern)}<text class="human-readable-digits" font-size="6" font-family="monospace" letter-spacing="0.5" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="78" text-anchor="middle">${input.productCode}</text>${textBelowBarcode ? `<text class="selling-price" font-size="7" font-family="Arial, sans-serif" x="${(EAN13_MODULE_COUNT + EAN13_QUIET_ZONE_MODULES * 2) / 2}" y="90" text-anchor="middle">${textBelowBarcode}</text>` : ""}</svg>`;

  return {
    encodedCode: input.productCode,
    humanReadableDigits: input.productCode,
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

const documentStyles = (layout: InternalLabelLayout) => `
  @page { size: ${layout === "a4" ? "A4" : "58mm 40mm"}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  .internal-product-label { background: #fff; color: #000; overflow: hidden; }
  .internal-product-label-barcode { display: block; width: 100%; height: 100%; background: #fff; }
  .internal-product-label-barcode text { fill: #000; font-family: Arial, sans-serif; }
  .internal-product-label-barcode .product-name { font-size: 7px; font-weight: 700; }
  .internal-product-label-barcode .human-readable-digits { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 8px; letter-spacing: 1px; }
  .internal-product-label-barcode .selling-price { font-size: 8px; font-weight: 700; }
  ${
    layout === "a4"
      ? ".internal-label-page { width: 210mm; min-height: 297mm; padding: 8.5mm 0; display: grid; grid-template-columns: repeat(3, 70mm); grid-template-rows: repeat(8, 35mm); page-break-after: always; } .internal-product-label { width: 70mm; height: 35mm; } .internal-label-empty { width: 70mm; height: 35mm; }"
      : ".internal-label-page { width: 58mm; height: 40mm; page-break-after: always; } .internal-product-label { width: 58mm; height: 40mm; }"
  }
`;

const validateCopyCount = (copyCount: number) => {
  if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 1_000) {
    throw new Error("Copy count must be a whole number between 1 and 1000");
  }
};

const buildA4Pages = (
  preview: InternalLabelPreview,
  input: InternalLabelDocumentInput,
) => {
  const startingPosition = input.startingPosition ?? 1;
  if (
    !Number.isInteger(startingPosition) ||
    startingPosition < 1 ||
    startingPosition > A4_LABEL_CAPACITY
  ) {
    throw new Error(
      `A4 starting position must be between 1 and ${A4_LABEL_CAPACITY}`,
    );
  }

  const pages: Array<{ occupiedPositions: number[]; html: string }> = [];
  let copyNumber = 1;
  let pageStartingPosition = startingPosition;

  while (copyNumber <= input.copyCount) {
    const occupiedPositions: number[] = [];
    const slots = Array.from({ length: A4_LABEL_CAPACITY }, (_, index) => {
      const position = index + 1;
      if (position < pageStartingPosition || copyNumber > input.copyCount) {
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

const buildThermalPages = (preview: InternalLabelPreview, copyCount: number) =>
  Array.from({ length: copyCount }, (_, index) => ({
    occupiedPositions: [1],
    html: `<section class="internal-label-page">${renderLabelCopy(preview, index + 1)}</section>`,
  }));

export const buildInternalLabelDocument = (
  input: InternalLabelDocumentInput,
): InternalLabelDocument => {
  validateCopyCount(input.copyCount);
  const preview = buildInternalLabelPreview(input.label);
  const pages =
    input.layout === "a4"
      ? buildA4Pages(preview, input)
      : buildThermalPages(preview, input.copyCount);

  return {
    pages: pages.map(({ occupiedPositions }) => ({ occupiedPositions })),
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Internal Product Labels</title><style>${documentStyles(input.layout)}</style></head><body>${pages.map((page) => page.html).join("")}</body></html>`,
  };
};

export const canPrintInternalLabels = (input: {
  testPrinted: boolean;
  testScanConfirmed: boolean;
}) => input.testPrinted && input.testScanConfirmed;

/** Opens an isolated browser print document; receipt printing has no dependency on this path. */
export const printInternalLabelDocument = (
  input: InternalLabelDocumentInput,
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
