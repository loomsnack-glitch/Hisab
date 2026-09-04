import type { ProductResponseDTO } from "@repo/types";

export type PosCartItem = Pick<
    ProductResponseDTO,
    "id" | "categoryId" | "name" | "price" | "discount" | "productType"
> & {
    quantity: number;
};

export const addProductToCart = (
    items: readonly PosCartItem[],
    product: Pick<
        ProductResponseDTO,
        "id" | "categoryId" | "name" | "price" | "discount" | "productType"
    >,
): PosCartItem[] => {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
        return items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
    }

    return [...items, { ...product, quantity: 1 }];
};

export const getCartItemCount = (items: readonly PosCartItem[]) =>
    items.reduce((total, item) => total + item.quantity, 0);
