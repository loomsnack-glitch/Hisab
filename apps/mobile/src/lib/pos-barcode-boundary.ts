import type { ProductResponseDTO } from "@repo/types";

export const POS_BARCODE_SCAN_COOLDOWN_MS = 1_200;

export type PosBarcodeResolution =
    | { kind: "product"; product: ProductResponseDTO; productCode: string }
    | { kind: "ambiguous"; productCode: string }
    | { kind: "unknown"; productCode: string };

export const normalizePosBarcodeData = (data: string) => data.trim();

export const resolvePosProductCode = (
    data: string,
    products: readonly ProductResponseDTO[],
): PosBarcodeResolution => {
    const productCode = normalizePosBarcodeData(data);
    const matchingProducts = productCode
        ? products.filter((product) => product.productCode === productCode)
        : [];

    if (matchingProducts.length > 1) {
        return { kind: "ambiguous", productCode };
    }

    if (matchingProducts.length === 1) {
        return { kind: "product", product: matchingProducts[0]!, productCode };
    }

    return { kind: "unknown", productCode };
};

export const shouldAcceptPosBarcodeScan = (input: {
    data: string;
    lastAcceptedData: string | null;
    lastAcceptedAt: number | null;
    now: number;
    cooldownMs?: number;
}) => {
    const data = normalizePosBarcodeData(input.data);
    if (!data) {
        return false;
    }

    if (input.lastAcceptedAt === null || input.lastAcceptedData !== data) {
        return true;
    }

    return input.now - input.lastAcceptedAt >= (input.cooldownMs ?? POS_BARCODE_SCAN_COOLDOWN_MS);
};
