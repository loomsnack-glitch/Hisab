import type { HTMLAttributes, ReactNode } from "react";
import type { ComboProductResponse, ProductResponseDTO } from "@repo/types";
import {
    BillingCategoryPills,
    BillingProductCard,
    BillingProductGrid,
    type BillingCategoryOption,
} from "@repo/ui/components/billing";
import { PriceDisplay } from "@repo/ui/components/price-display";

import ProductTypeBadge from "@/components/catalog/product-type-badge";
import {
    getProductCardAction,
    getProductCardActionLabel,
    type ProductCardAction,
} from "@/lib/product-card-interaction";

type ProductAttachmentGroup = {
    productId: string;
};

export type BillingProductsPanelProps<TProduct extends ProductResponseDTO = ProductResponseDTO> = {
    categories: BillingCategoryOption[];
    categoryFilter: string;
    onCategoryChange: (categoryId: string) => void;
    swipeHandlers?: HTMLAttributes<HTMLDivElement>;
    isPending?: boolean;
    products: TProduct[];
    cartQuantities: Map<string, number>;
    attachmentsByProductId: Map<string, ProductAttachmentGroup[]>;
    combos: ComboProductResponse[];
    combosPending?: boolean;
    combosFailed?: boolean;
    onProductClick: (product: TProduct, action: ProductCardAction) => void;
    scanSlot?: ReactNode;
};

export function BillingProductsPanel<TProduct extends ProductResponseDTO>({
    categories,
    categoryFilter,
    onCategoryChange,
    swipeHandlers,
    isPending,
    products,
    cartQuantities,
    attachmentsByProductId,
    combos,
    combosPending,
    combosFailed,
    onProductClick,
    scanSlot,
}: BillingProductsPanelProps<TProduct>) {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {scanSlot}
            <BillingCategoryPills categories={categories} value={categoryFilter} onChange={onCategoryChange} />
            <BillingProductGrid isPending={isPending} isEmpty={products.length === 0} {...swipeHandlers}>
                {products.map((product) => {
                    const cartQuantity = cartQuantities.get(product.id) ?? 0;
                    const productAttachments = attachmentsByProductId.get(product.id) ?? [];
                    const combo = combos.find((item) => item.product.id === product.id);
                    const comboLoading = product.productType === "combo" && Boolean(combosPending);
                    const cardAction = getProductCardAction(product, {
                        hasAddOns: productAttachments.length > 0,
                        comboAvailable: Boolean(combo),
                        comboHasSettings: Boolean(combo?.choiceGroups.length),
                        comboLoading,
                        comboHasError: Boolean(combosFailed),
                    });
                    const cardActionLabel = getProductCardActionLabel(cardAction);
                    const cardDisabled = cardAction === "disabled" || cardAction === "loading";

                    return (
                        <BillingProductCard
                            key={product.id}
                            name={product.name}
                            inCart={cartQuantity > 0}
                            cartQuantity={cartQuantity}
                            imageUrl={product.imageSignedUrl}
                            disabled={cardDisabled}
                            loading={cardAction === "loading"}
                            hasAddOns={productAttachments.length > 0}
                            isCombo={product.productType === "combo"}
                            ariaLabel={`${cardActionLabel} ${product.name}`}
                            onClick={() => onProductClick(product, cardAction)}
                            price={
                                <PriceDisplay
                                    price={product.price}
                                    discount={product.discount}
                                    size="sm"
                                    align="left"
                                />
                            }
                            badge={<ProductTypeBadge productType={product.productType} />}
                        />
                    );
                })}
            </BillingProductGrid>
        </div>
    );
}
