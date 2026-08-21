import type { ProductResponseDTO } from "@repo/types";

export type ProductCardAction = "add" | "customize" | "configure" | "loading" | "retry" | "disabled";

type ProductCardInteractionContext = {
    hasAddOns?: boolean;
    comboAvailable?: boolean;
    comboHasSettings?: boolean;
    comboLoading?: boolean;
    comboHasError?: boolean;
};

export const getProductCardAction = (
    product: Pick<ProductResponseDTO, "productType" | "status">,
    context: ProductCardInteractionContext = {},
): ProductCardAction => {
    if (product.status !== "active") {
        return "disabled";
    }

    if (product.productType === "single") {
        return context.hasAddOns ? "customize" : "add";
    }

    if (product.productType !== "combo") {
        return "disabled";
    }

    if (context.comboLoading) {
        return "loading";
    }

    if (context.comboHasError) {
        return "retry";
    }

    if (!context.comboAvailable) {
        return "disabled";
    }

    return context.comboHasSettings ? "configure" : "add";
};

export const getProductCardActionLabel = (action: ProductCardAction) => {
    switch (action) {
        case "customize":
            return "Customize";
        case "configure":
            return "Configure Combo";
        case "loading":
            return "Loading product options";
        case "retry":
            return "Retry loading product options";
        case "disabled":
            return "Product unavailable";
        default:
            return "Add";
    }
};
