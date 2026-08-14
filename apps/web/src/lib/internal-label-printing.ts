import {
  A4_SHEET_LABEL_TEMPLATE,
  THERMAL_ROLL_LABEL_TEMPLATE,
  millimetreBoxesIntersect,
} from "@repo/types";
import type { LabelTemplateDocument } from "@repo/types";

export const EAN13_MODULE_COUNT = 95;
export const EAN13_QUIET_ZONE_MODULES = 11;
export const A4_LABEL_COLUMNS = A4_SHEET_LABEL_TEMPLATE.stock.sheet?.columns ?? 3;
export const A4_LABEL_ROWS = A4_SHEET_LABEL_TEMPLATE.stock.sheet?.rows ?? 8;
export const A4_LABEL_CAPACITY = A4_LABEL_COLUMNS * A4_LABEL_ROWS;

export type LabelTemplate = LabelTemplateDocument;
export type LabelElement = LabelTemplate["elements"][number];
export { A4_SHEET_LABEL_TEMPLATE, THERMAL_ROLL_LABEL_TEMPLATE };

const LABEL_TEXT_FONT = "'Noto Sans Gujarati', 'Noto Sans', Arial, sans-serif";

export type LabelProductLabelProfileInput = {
  ingredients?: string | null;
  nutrition?: Array<{ name: string; quantity: string; unit: string }> | null;
  netWeight?: string | null;
  unitSellingPriceText?: string | null;
  mrp?: number | string | null;
  shelfLifeDays?: number | null;
};

export type LabelProductInput = {
  productCode: string;
  name?: string | null;
  price?: number | string | null;
  labelProfile?: LabelProductLabelProfileInput | null;
};

export type LabelJobFields = {
  packedDate?: string | null;
  expiryDate?: string | null;
  batchNumber?: string | null;
};

export type LabelJobInput = LabelJobFields & {
  copyCount: number;
  startingPosition?: number;
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
  job?: LabelJobFields;
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

export const templateBoundJobFields = (template: LabelTemplate) => ({
  packedDate: templateHasBinding(template, "job.packedDate"),
  expiryDate: templateHasBinding(template, "job.expiryDate"),
  batchNumber: templateHasBinding(template, "job.batchNumber"),
});

export const defaultExpiryDateFromPackedDate = (
  packedDate: string,
  shelfLifeDays: number,
) => {
  const packed = new Date(`${packedDate}T00:00:00`);
  packed.setDate(packed.getDate() + shelfLifeDays);
  return packed.toISOString().slice(0, 10);
};

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
  mrpWarning: string | null;
  svg: string;
  printSvg: string;
};

export type LabelLayoutPreviewSlot = {
  filled: boolean;
};

export type InternalLabelLayoutPreview = InternalLabelPreview & {
  slots: LabelLayoutPreviewSlot[];
  widthMm: number;
  heightMm: number;
  horizontalGapMm: number;
  verticalGapMm: number;
  columns: number;
  rows: number;
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

const templateBarcodeElement = (template: LabelTemplate) =>
  template.elements.find((element) => element.type === "barcode");

const assertEan13ProductCode = (productCode: string) => {
  if (!/^\d{13}$/.test(productCode)) {
    throw new Error("Product Code is not a valid EAN-13 value");
  }

  if (
    calculateEan13CheckDigit(productCode.slice(0, -1)) !== productCode.at(-1)
  ) {
    throw new Error("Product Code is not a valid EAN-13 value");
  }
};

const encodeEan13 = (productCode: string) => {
  assertEan13ProductCode(productCode);

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
    throw new Error("Failed to encode the Product Code as EAN-13");
  }

  return modules;
};

// Code 128 patterns from ISO/IEC 15417. Index is the code-set value; 103–106 are
// Start A, Start B, Start C, and Stop. Stop includes the 2-module termination bar.
const CODE128_PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001000",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
];

const CODE128_START_B = 104;
const CODE128_STOP = 106;

const encodeCode128 = (productCode: string) => {
  if (productCode.length === 0) {
    throw new Error("Code 128 requires a Product Code");
  }

  const values = Array.from(productCode, (character) => {
    const codeValue = character.charCodeAt(0) - 32;
    if (codeValue < 0 || codeValue > 94) {
      throw new Error("Code 128 cannot encode this Product Code");
    }
    return codeValue;
  });

  const checksum =
    (CODE128_START_B +
      values.reduce((total, value, index) => total + value * (index + 1), 0)) %
    103;
  const symbols = [CODE128_START_B, ...values, checksum, CODE128_STOP];
  return symbols
    .map((symbol) => {
      const pattern = CODE128_PATTERNS[symbol];
      if (!pattern) {
        throw new Error("Failed to encode the Product Code as Code 128");
      }
      return pattern;
    })
    .join("");
};

const encodeProductCode = (
  productCode: string,
  symbology: "ean13" | "code128",
) => {
  if (symbology === "code128") {
    return encodeCode128(productCode);
  }

  return encodeEan13(productCode);
};

const renderBars = (
  modulePattern: string,
  options: { quietZoneModules: number; useEan13Guards: boolean },
) =>
  Array.from(modulePattern)
    .flatMap((module, index) => {
      if (module !== "1") {
        return [];
      }

      const height =
        options.useEan13Guards && guardModuleIndexes.has(index) ? 51 : 46;
      return `<rect x="${options.quietZoneModules + index}" y="2" width="1" height="${height}" fill="#000"/>`;
    })
    .join("");

const formatCurrencyAmount = (amount: number | string | null | undefined) => {
  if (amount == null || amount === "") {
    return null;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return null;
  }

  return `₹${numericAmount.toFixed(2)}`;
};

const formatSellingPrice = (
  sellingPrice: LabelFaceInput["sellingPrice"],
) => formatCurrencyAmount(sellingPrice);

const formatLabelDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return null;
  }
  return `${day}/${month}/${year}`;
};

const resolveBoundText = (
  binding: string,
  product: LabelProductInput,
  job?: LabelJobFields,
): string | null => {
  const profile = product.labelProfile;
  if (binding === "product.name") {
    const name = product.name?.trim() ?? "";
    return name.length > 0 ? name : null;
  }
  if (binding === "product.productCode") {
    return product.productCode.length > 0 ? product.productCode : null;
  }
  if (binding === "product.price") {
    return formatSellingPrice(product.price);
  }
  if (binding === "productLabel.mrp") {
    return formatCurrencyAmount(profile?.mrp);
  }
  if (binding === "productLabel.ingredients") {
    const ingredients = profile?.ingredients?.trim() ?? "";
    return ingredients.length > 0 ? ingredients : null;
  }
  if (binding === "productLabel.netWeight") {
    const netWeight = profile?.netWeight?.trim() ?? "";
    return netWeight.length > 0 ? netWeight : null;
  }
  if (binding === "productLabel.unitSellingPriceText") {
    const unitSellingPriceText = profile?.unitSellingPriceText?.trim() ?? "";
    return unitSellingPriceText.length > 0 ? unitSellingPriceText : null;
  }
  if (binding === "job.packedDate") {
    const packedDate = job?.packedDate?.trim() ?? "";
    return packedDate.length > 0 ? formatLabelDate(packedDate) : null;
  }
  if (binding === "job.expiryDate") {
    const expiryDate = job?.expiryDate?.trim() ?? "";
    return expiryDate.length > 0 ? formatLabelDate(expiryDate) : null;
  }
  if (binding === "job.batchNumber") {
    const batchNumber = job?.batchNumber?.trim() ?? "";
    return batchNumber.length > 0 ? batchNumber : null;
  }
  return null;
};

const resolveTextElementValue = (
  element: Extract<LabelElement, { type: "text" }>,
  product: LabelProductInput,
  job?: LabelJobFields,
): string | null => {
  if (element.text.source === "static") {
    const value = element.text.staticValue?.trim() ?? "";
    return value.length > 0 ? value : null;
  }
  if (!element.text.binding) {
    return null;
  }
  return resolveBoundText(element.text.binding, product, job);
};

const textAnchor = (align: "left" | "center" | "right") => {
  if (align === "center") {
    return "middle";
  }
  return align === "right" ? "end" : "start";
};

const textX = (
  element: Extract<LabelElement, { type: "text" }>,
  widthMm: number,
) => {
  if (element.text.align === "center") {
    return widthMm / 2;
  }
  return element.text.align === "right" ? widthMm : 0;
};

const textClassName = (
  element: Extract<LabelElement, { type: "text" }>,
) => {
  if (element.text.binding === "product.name") {
    return "product-name";
  }
  if (element.text.binding === "product.price") {
    return "selling-price";
  }
  if (element.text.binding === "productLabel.mrp") {
    return "on-pack-mrp";
  }
  return "label-text";
};

const rotatedDrawSize = (element: LabelElement) => {
  const swapped = element.rotationDeg === 90 || element.rotationDeg === 270;
  return {
    widthMm: swapped ? element.heightMm : element.widthMm,
    heightMm: swapped ? element.widthMm : element.heightMm,
  };
};

const wrapRotatedElement = (element: LabelElement, inner: string) => {
  if (element.rotationDeg === 0) {
    return inner;
  }

  const { widthMm, heightMm } = rotatedDrawSize(element);
  const cx = element.xMm + element.widthMm / 2;
  const cy = element.yMm + element.heightMm / 2;
  return `<g transform="translate(${cx} ${cy}) rotate(${element.rotationDeg}) translate(${-widthMm / 2} ${-heightMm / 2})">${inner}</g>`;
};

const placedBox = (element: LabelElement) => {
  if (element.rotationDeg === 0) {
    return {
      x: element.xMm,
      y: element.yMm,
      width: element.widthMm,
      height: element.heightMm,
    };
  }
  const size = rotatedDrawSize(element);
  return { x: 0, y: 0, width: size.widthMm, height: size.heightMm };
};

const renderTextElement = (
  element: Extract<LabelElement, { type: "text" }>,
  value: string,
) => {
  const box = placedBox(element);
  const svg = `<svg class="${textClassName(element)}-box" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" overflow="hidden" xmlns="http://www.w3.org/2000/svg"><text class="${textClassName(element)}" font-size="${element.text.fontSizeMm}" font-family="${LABEL_TEXT_FONT}" font-weight="${element.text.fontWeight === "bold" ? "700" : "400"}" x="${textX(element, box.width)}" y="${element.text.fontSizeMm}" text-anchor="${textAnchor(element.text.align)}">${escapeHtml(value)}</text></svg>`;
  return wrapRotatedElement(element, svg);
};

const renderBarcodeElement = (
  element: Extract<LabelElement, { type: "barcode" }>,
  productCode: string,
  modulePattern: string,
) => {
  const box = placedBox(element);
  const quietZoneModules =
    element.barcode.symbology === "ean13" ? EAN13_QUIET_ZONE_MODULES : 10;
  const viewBoxWidth = modulePattern.length + quietZoneModules * 2;
  const viewBoxHeight = element.barcode.showHumanDigits ? 70 : 54;
  const digits = element.barcode.showHumanDigits
    ? `<text class="human-readable-digits" font-size="8" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" letter-spacing="0.5" x="${viewBoxWidth / 2}" y="66" text-anchor="middle">${escapeHtml(productCode)}</text>`
    : "";
  const svg = `<svg class="internal-product-label-barcode" role="img" aria-label="${element.barcode.symbology === "ean13" ? "EAN-13" : "Code 128"} barcode ${escapeHtml(productCode)}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#fff"/>${renderBars(modulePattern, { quietZoneModules, useEan13Guards: element.barcode.symbology === "ean13" })}${digits}</svg>`;
  return wrapRotatedElement(element, svg);
};

const renderBoxElement = (element: Extract<LabelElement, { type: "box" }>) => {
  const box = placedBox(element);
  const svg = `<svg class="label-box" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><rect x="${element.box.strokeWidthMm / 2}" y="${element.box.strokeWidthMm / 2}" width="${Math.max(0, box.width - element.box.strokeWidthMm)}" height="${Math.max(0, box.height - element.box.strokeWidthMm)}" fill="none" stroke="#000" stroke-width="${element.box.strokeWidthMm}"/></svg>`;
  return wrapRotatedElement(element, svg);
};

const renderNutritionTableElement = (
  element: Extract<LabelElement, { type: "table" }>,
  rows: Array<{ name: string; quantity: string; unit: string }>,
) => {
  const box = placedBox(element);
  const rowCount = rows.length + 1;
  const rowHeight = box.height / rowCount;
  const colWidth = box.width / 3;
  const headerCells = ["Name", "Qty", "Unit"]
    .map((label, index) =>
      `<text class="label-nutrition-header" font-size="${Math.min(2, rowHeight * 0.6)}" font-family="${LABEL_TEXT_FONT}" font-weight="700" x="${index * colWidth + colWidth / 2}" y="${rowHeight * 0.75}" text-anchor="middle">${escapeHtml(label)}</text>`,
    )
    .join("");
  const bodyRows = rows
    .map((row, rowIndex) => {
      const y = rowHeight * (rowIndex + 1);
      const values = [row.name, row.quantity, row.unit];
      return values
        .map((value, colIndex) =>
          `<text class="label-nutrition-cell" font-size="${Math.min(2, rowHeight * 0.6)}" font-family="${LABEL_TEXT_FONT}" x="${colIndex * colWidth + colWidth / 2}" y="${y + rowHeight * 0.75}" text-anchor="middle">${escapeHtml(value)}</text>`,
        )
        .join("");
    })
    .join("");
  const svg = `<svg class="label-nutrition-table" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" overflow="hidden" xmlns="http://www.w3.org/2000/svg">${headerCells}${bodyRows}</svg>`;
  return wrapRotatedElement(element, svg);
};

const renderTemplateElements = (
  template: LabelTemplate,
  product: LabelProductInput,
  job?: LabelJobFields,
) =>
  template.elements
    .map((element) => {
      if (element.type === "text") {
        const value = resolveTextElementValue(element, product, job);
        return value ? renderTextElement(element, value) : "";
      }
      if (element.type === "barcode") {
        const modulePattern = encodeProductCode(
          product.productCode,
          element.barcode.symbology,
        );
        return renderBarcodeElement(element, product.productCode, modulePattern);
      }
      if (element.type === "box") {
        return renderBoxElement(element);
      }
      if (element.type === "table") {
        const nutrition = product.labelProfile?.nutrition ?? [];
        if (nutrition.length === 0) {
          return "";
        }
        return renderNutritionTableElement(element, nutrition);
      }
      return "";
    })
    .join("");

const assertKeepOutsDoNotIntersectElements = (template: LabelTemplate) => {
  for (const keepOut of template.keepOuts) {
    for (const element of template.elements) {
      if (millimetreBoxesIntersect(element, keepOut)) {
        throw new Error("Label Element intersects a Keep-Out");
      }
    }
  }
};

const renderKeepOutRects = (
  template: LabelTemplate,
  mode: "preview" | "print",
) =>
  template.keepOuts
    .map((keepOut) =>
      mode === "preview"
        ? `<rect x="${keepOut.xMm}" y="${keepOut.yMm}" width="${keepOut.widthMm}" height="${keepOut.heightMm}" fill="#94a3b8" fill-opacity="0.35"/>`
        : `<rect x="${keepOut.xMm}" y="${keepOut.yMm}" width="${keepOut.widthMm}" height="${keepOut.heightMm}" fill="#fff"/>`,
    )
    .join("");

const wrapLabelFaceSvg = (
  content: string,
  template: LabelTemplate,
  mode: "preview" | "print",
) => {
  const { widthMm, heightMm } = template.stock;
  return `<svg class="internal-product-label-face" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm" xmlns="http://www.w3.org/2000/svg">${content}${renderKeepOutRects(template, mode)}</svg>`;
};

export const buildInternalLabelPreview = (
  input: LabelPreviewInput,
): InternalLabelPreview => {
  const label = labelInputFromTemplate(input);
  const barcodeElement = templateBarcodeElement(input.template);
  const symbology = barcodeElement?.barcode.symbology ?? "ean13";
  const modulePattern = barcodeElement
    ? encodeProductCode(label.productCode, symbology)
    : "";
  const quietZoneModules = barcodeElement
    ? symbology === "ean13"
      ? EAN13_QUIET_ZONE_MODULES
      : 10
    : 0;
  const textAboveBarcode = label.includeProductName ? label.productName : null;
  const textBelowBarcode = label.includeSellingPrice
    ? formatSellingPrice(label.sellingPrice)
    : null;
  const mrpText =
    templateHasBinding(input.template, "productLabel.mrp")
      ? formatCurrencyAmount(input.product.labelProfile?.mrp)
      : null;
  const content = renderTemplateElements(
    input.template,
    input.product,
    input.job,
  );

  return {
    encodedCode: label.productCode,
    humanReadableDigits: barcodeElement?.barcode.showHumanDigits
      ? label.productCode
      : barcodeElement
        ? ""
        : label.productCode,
    modulePattern,
    quietZoneModules: {
      left: quietZoneModules,
      right: quietZoneModules,
    },
    textAboveBarcode,
    textBelowBarcode,
    sellingPriceWarning: textBelowBarcode
      ? "Selling price is printed on this label. Reprint labels after any price change."
      : null,
    mrpWarning: mrpText
      ? "On-pack MRP is printed on this label. Reprint labels after any MRP change."
      : null,
    svg: wrapLabelFaceSvg(content, input.template, "preview"),
    printSvg: wrapLabelFaceSvg(content, input.template, "print"),
  };
};

const renderLabelCopy = (preview: InternalLabelPreview, copyNumber: number) =>
  `<article class="internal-product-label" data-label-copy="${copyNumber}">${preview.printSvg}</article>`;

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

const rollRowWidthMm = (template: LabelTemplate) => {
  const { widthMm, labelsPerRow, horizontalGapMm } = template.stock;
  return labelsPerRow * widthMm + Math.max(0, labelsPerRow - 1) * horizontalGapMm;
};

const documentStyles = (template: LabelTemplate) => {
  const { widthMm, heightMm, horizontalGapMm, verticalGapMm, media, sheet } =
    template.stock;
  const rollRowWidth = rollRowWidthMm(template);
  const pageSize =
    media === "sheet" && sheet
      ? `${sheet.pageWidthMm}mm ${sheet.pageHeightMm}mm`
      : `${rollRowWidth}mm ${heightMm}mm`;
  const padding = sheetPagePaddingMm(template);
  const layoutStyles =
    media === "sheet" && sheet
      ? `.internal-label-page { width: ${sheet.pageWidthMm}mm; min-height: ${sheet.pageHeightMm}mm; padding: ${padding.vertical}mm ${padding.horizontal}mm; display: grid; grid-template-columns: repeat(${sheet.columns}, ${widthMm}mm); grid-template-rows: repeat(${sheet.rows}, ${heightMm}mm); column-gap: ${horizontalGapMm}mm; row-gap: ${verticalGapMm}mm; page-break-after: always; } .internal-product-label { width: ${widthMm}mm; height: ${heightMm}mm; } .internal-label-empty { width: ${widthMm}mm; height: ${heightMm}mm; }`
      : template.stock.labelsPerRow > 1
        ? `.internal-label-page { width: ${rollRowWidth}mm; height: ${heightMm}mm; display: grid; grid-template-columns: repeat(${template.stock.labelsPerRow}, ${widthMm}mm); column-gap: ${horizontalGapMm}mm; page-break-after: always; } .internal-product-label { width: ${widthMm}mm; height: ${heightMm}mm; } .internal-label-empty { width: ${widthMm}mm; height: ${heightMm}mm; }`
        : `.internal-label-page { width: ${widthMm}mm; height: ${heightMm}mm; page-break-after: always; } .internal-product-label { width: ${widthMm}mm; height: ${heightMm}mm; }`;

  return `
  @page { size: ${pageSize}; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: ${LABEL_TEXT_FONT}; }
  .internal-product-label { background: #fff; color: #000; overflow: hidden; }
  .internal-product-label-face { display: block; width: 100%; height: 100%; }
  .internal-product-label-barcode { background: #fff; }
  .internal-product-label-face text { fill: #000; font-family: ${LABEL_TEXT_FONT}; }
  .internal-product-label-barcode .human-readable-digits { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 1px; }
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
      `Sheet starting position must be between 1 and ${capacity}`,
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

const buildRollPages = (
  preview: InternalLabelPreview,
  template: LabelTemplate,
  copyCount: number,
) => {
  const capacity = template.stock.labelsPerRow;
  if (capacity <= 1) {
    return Array.from({ length: copyCount }, (_, index) => ({
      occupiedPositions: [1],
      html: `<section class="internal-label-page">${renderLabelCopy(preview, index + 1)}</section>`,
    }));
  }

  const pages: Array<{ occupiedPositions: number[]; html: string }> = [];
  let copyNumber = 1;

  while (copyNumber <= copyCount) {
    const occupiedPositions: number[] = [];
    const slots = Array.from({ length: capacity }, (_, index) => {
      if (copyNumber > copyCount) {
        return '<div class="internal-label-empty" aria-hidden="true"></div>';
      }

      occupiedPositions.push(index + 1);
      return renderLabelCopy(preview, copyNumber++);
    }).join("");

    pages.push({
      occupiedPositions,
      html: `<section class="internal-label-page">${slots}</section>`,
    });
  }

  return pages;
};

export const buildInternalLabelLayoutPreview = (
  input: LabelDocumentInput,
): InternalLabelLayoutPreview => {
  validateCopyCount(input.job.copyCount);
  const preview = buildInternalLabelPreview({
    template: input.template,
    product: input.product,
    job: input.job,
  });
  const {
    widthMm,
    heightMm,
    horizontalGapMm,
    verticalGapMm,
    media,
    labelsPerRow,
    sheet,
  } = input.template.stock;

  if (media === "roll") {
    const columns = Math.max(1, labelsPerRow);
    if (columns <= 1) {
      return {
        ...preview,
        slots: [{ filled: true }],
        widthMm,
        heightMm,
        horizontalGapMm,
        verticalGapMm,
        columns: 1,
        rows: 1,
      };
    }

    return {
      ...preview,
      slots: Array.from({ length: columns }, (_, index) => ({
        filled: index + 1 <= input.job.copyCount,
      })),
      widthMm,
      heightMm,
      horizontalGapMm,
      verticalGapMm,
      columns,
      rows: 1,
    };
  }

  const capacity = sheetLabelCapacity(input.template);
  const startingPosition = input.job.startingPosition ?? 1;
  if (
    !Number.isInteger(startingPosition) ||
    startingPosition < 1 ||
    startingPosition > capacity
  ) {
    throw new Error(
      `Sheet starting position must be between 1 and ${capacity}`,
    );
  }

  let copyNumber = 1;
  const slots = Array.from({ length: capacity }, (_, index) => {
    const position = index + 1;
    if (position < startingPosition || copyNumber > input.job.copyCount) {
      return { filled: false };
    }

    copyNumber += 1;
    return { filled: true };
  });

  return {
    ...preview,
    slots,
    widthMm,
    heightMm,
    horizontalGapMm,
    verticalGapMm,
    columns: sheet?.columns ?? 1,
    rows: sheet?.rows ?? 1,
  };
};

export const buildInternalLabelDocument = (
  input: LabelDocumentInput,
): InternalLabelDocument => {
  validateCopyCount(input.job.copyCount);
  assertKeepOutsDoNotIntersectElements(input.template);
  const preview = buildInternalLabelPreview({
    template: input.template,
    product: input.product,
    job: input.job,
  });
  const pages =
    input.template.stock.media === "sheet"
      ? buildSheetPages(preview, input.template, input.job)
      : buildRollPages(preview, input.template, input.job.copyCount);

  return {
    pages: pages.map(({ occupiedPositions }) => ({ occupiedPositions })),
    html: `<!doctype html><html><head><meta charset="utf-8"><title>Product Labels</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap" rel="stylesheet"><style>${documentStyles(input.template)}</style></head><body>${pages.map((page) => page.html).join("")}</body></html>`,
  };
};

export const canPrintInternalLabels = (input: {
  testPrinted: boolean;
  testScanConfirmed: boolean;
}) => input.testPrinted && input.testScanConfirmed;

export const canOfferProductLabelPrint = (input: {
  barcodeScanningEnabled: boolean;
  productCode: string | null | undefined;
}) => Boolean(input.barcodeScanningEnabled && input.productCode?.trim());

const elementConfirmationSignature = (element: LabelElement) => {
  const box = `${element.xMm}:${element.yMm}:${element.widthMm}:${element.heightMm}:${element.rotationDeg}`;
  if (element.type === "barcode") {
    return `barcode:${element.barcode.symbology}:${element.barcode.showHumanDigits}:${box}`;
  }
  if (element.type === "text") {
    return `text:${element.text.source}:${element.text.binding ?? ""}:${element.text.staticValue ?? ""}:${box}`;
  }
  if (element.type === "box") {
    return `box:${element.box.strokeWidthMm}:${box}`;
  }
  return `table:${box}`;
};

export const labelPrintConfirmationKey = (input: {
  templateId: string;
  elements: LabelElement[];
}) =>
  `${input.templateId}:${input.elements.map(elementConfirmationSignature).join("|")}`;

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
