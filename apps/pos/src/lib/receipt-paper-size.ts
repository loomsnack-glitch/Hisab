export const RECEIPT_PAPER_SIZE_OPTIONS = [
  {
    value: "58mm",
    label: "58 mm",
    description: "2-inch thermal printers",
    width: 32,
  },
  {
    value: "80mm",
    label: "80 mm",
    description: "3-inch thermal printers",
    width: 42,
  },
] as const;

export type ReceiptPaperSize =
  (typeof RECEIPT_PAPER_SIZE_OPTIONS)[number]["value"];
export type ReceiptPaperSizeScope = "admin" | "pos";

const RECEIPT_PAPER_SIZE_STORAGE_KEYS: Record<ReceiptPaperSizeScope, string> = {
  admin: "hisab_admin_receipt_paper_size",
  pos: "hisab_pos_receipt_paper_size",
};

const DEFAULT_RECEIPT_PAPER_SIZE: ReceiptPaperSize = "80mm";

export const isReceiptPaperSize = (value: string): value is ReceiptPaperSize =>
  RECEIPT_PAPER_SIZE_OPTIONS.some((option) => option.value === value);

export const getReceiptPaperSizeOption = (paperSize: ReceiptPaperSize) =>
  RECEIPT_PAPER_SIZE_OPTIONS.find((option) => option.value === paperSize) ??
  RECEIPT_PAPER_SIZE_OPTIONS[1];

export const getReceiptPaperWidth = (paperSize: ReceiptPaperSize) =>
  getReceiptPaperSizeOption(paperSize).width;

export const readReceiptPaperSize = (
  scope: ReceiptPaperSizeScope,
): ReceiptPaperSize => {
  if (typeof window === "undefined") {
    return DEFAULT_RECEIPT_PAPER_SIZE;
  }

  try {
    const storedSize = window.localStorage.getItem(
      RECEIPT_PAPER_SIZE_STORAGE_KEYS[scope],
    );
    return storedSize && isReceiptPaperSize(storedSize)
      ? storedSize
      : DEFAULT_RECEIPT_PAPER_SIZE;
  } catch {
    return DEFAULT_RECEIPT_PAPER_SIZE;
  }
};

export const persistReceiptPaperSize = (
  scope: ReceiptPaperSizeScope,
  paperSize: ReceiptPaperSize,
) => {
  try {
    window.localStorage.setItem(
      RECEIPT_PAPER_SIZE_STORAGE_KEYS[scope],
      paperSize,
    );
  } catch {
    // The setting still applies for the current session when storage is unavailable.
  }
};
