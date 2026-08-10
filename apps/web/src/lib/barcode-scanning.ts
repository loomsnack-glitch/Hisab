import type { InactiveProductCode, ProductResponseDTO } from "@repo/types";

export type ProductCodeScanResult =
    | { kind: "product"; product: ProductResponseDTO; productCode: string }
    | { kind: "inactive"; productCode: string; productName: string }
    | { kind: "ambiguous"; productCode: string }
    | { kind: "unknown"; productCode: string };

export const SCAN_DIAGNOSTIC_LIMIT = 20;

export type ScanDiagnostic = {
    kind: "unknown" | "duplicate-assignment" | "scan-to-cart-failure";
    productCode: string;
    message: string;
    occurredAt: string;
};

/**
 * Keeps the POS troubleshooting history intentionally small. This is a local
 * browser-session diagnostic, not a billing or catalog record.
 */
export const appendScanDiagnostic = (
    diagnostics: ScanDiagnostic[],
    diagnostic: ScanDiagnostic,
): ScanDiagnostic[] => [...diagnostics, diagnostic].slice(-SCAN_DIAGNOSTIC_LIMIT);

export const formatScanDiagnostics = (diagnostics: ScanDiagnostic[]) =>
    diagnostics
        .map(
            (diagnostic) =>
                `${diagnostic.occurredAt}\t${diagnostic.kind}\t${diagnostic.productCode}\t${diagnostic.message}`,
        )
        .join("\n");

export const resolveProductCodeScan = (
    productCode: string,
    products: ProductResponseDTO[],
    inactiveProductCodes: InactiveProductCode[],
): ProductCodeScanResult => {
    const matchingProducts = products.filter((candidate) => candidate.productCode === productCode);
    if (matchingProducts.length > 1) {
        return { kind: "ambiguous", productCode };
    }
    if (matchingProducts.length === 1) {
        return { kind: "product", product: matchingProducts[0]!, productCode };
    }

    const inactiveProduct = inactiveProductCodes.find((candidate) => candidate.productCode === productCode);
    if (inactiveProduct) {
        return {
            kind: "inactive",
            productCode,
            productName: inactiveProduct.productName,
        };
    }

    return { kind: "unknown", productCode };
};

export const shouldCaptureDirectBarcodeScan = (input: {
    enabled: boolean;
    scanFieldOwnsFocus: boolean;
    unrelatedEditableFieldOwnsFocus: boolean;
    dialogOwnsFocus: boolean;
}) =>
    input.enabled &&
    !input.scanFieldOwnsFocus &&
    !input.unrelatedEditableFieldOwnsFocus &&
    !input.dialogOwnsFocus;

export const consumeDirectBarcodeScanKey = (buffer: string, key: string) => {
    if (key === "Enter") {
        return { buffer: "", scannedCode: buffer || null };
    }

    return key.length === 1 ? { buffer: `${buffer}${key}`, scannedCode: null } : { buffer, scannedCode: null };
};

export const incrementPlainProductQuantity = <T extends { key: string; quantity: number }>(
    items: T[],
    itemKey: string,
) => {
    const existingItem = items.find((item) => item.key === itemKey);
    if (!existingItem) {
        return null;
    }

    return items.map((item) => (item.key === existingItem.key ? { ...item, quantity: item.quantity + 1 } : item));
};
