import type { ProductStatus } from "@repo/types";

export const catalogProductStatusLabel = (status: ProductStatus): string =>
    status === "active" ? "Active" : "Inactive";

export const markCatalogProductStatusLabel = (nextStatus: ProductStatus): string =>
    nextStatus === "active" ? "Mark active" : "Mark inactive";

export const markCatalogProductStatusProgress = (nextStatus: ProductStatus): string =>
    nextStatus === "active" ? "Marking active..." : "Marking inactive...";

export const markCatalogProductStatusTitle = (productName: string, nextStatus: ProductStatus): string =>
    `${markCatalogProductStatusLabel(nextStatus)}: ${productName}?`;

export const markCatalogProductStatusAriaLabel = (productName: string, nextStatus: ProductStatus): string =>
    `${markCatalogProductStatusLabel(nextStatus)} ${productName}`;

export const catalogProductStatusChangedMessage = (productName: string, status: ProductStatus): string =>
    status === "active" ? `${productName} is now active` : `${productName} is now inactive`;

export const bulkCatalogProductStatusChangedMessage = (count: number, status: ProductStatus): string => {
    const noun = `${count} product${count === 1 ? "" : "s"}`;
    return status === "active" ? `${noun} are now active` : `${noun} are now inactive`;
};

export const markCatalogProductStatusForStoreLabel = (nextStatus: ProductStatus): string =>
    nextStatus === "active" ? "Mark active for this store" : "Mark inactive for this store";
