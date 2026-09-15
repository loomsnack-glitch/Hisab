export const UNCATEGORIZED_CATEGORY_NAME = "Uncategorized";

export type ProductSalesRow = {
    productId: string;
    productName: string;
    categoryName: string | null;
    quantitySold: number;
};

export type CategorySalesSummary = {
    categoryName: string;
    quantitySold: number;
    productCount: number;
};

export const mergeProductSalesByProductId = (
    products: ReadonlyArray<ProductSalesRow>,
): ProductSalesRow[] => {
    const byProductId = new Map<
        string,
        ProductSalesRow & { leadQuantity: number }
    >();

    for (const product of products) {
        const existing = byProductId.get(product.productId);
        if (!existing) {
            byProductId.set(product.productId, {
                productId: product.productId,
                productName: product.productName,
                categoryName: product.categoryName,
                quantitySold: product.quantitySold,
                leadQuantity: product.quantitySold,
            });
            continue;
        }

        existing.quantitySold += product.quantitySold;
        if (product.quantitySold > existing.leadQuantity) {
            existing.productName = product.productName;
            existing.categoryName = product.categoryName;
            existing.leadQuantity = product.quantitySold;
        }
    }

    return [...byProductId.values()]
        .map(({ leadQuantity: _leadQuantity, ...product }) => product)
        .sort((left, right) => {
            if (right.quantitySold !== left.quantitySold) {
                return right.quantitySold - left.quantitySold;
            }

            return left.productName.localeCompare(right.productName);
        });
};

export const aggregateProductSalesByCategory = (
    products: ReadonlyArray<Pick<ProductSalesRow, "categoryName" | "quantitySold">>,
): CategorySalesSummary[] => {
    const byCategory = new Map<string, CategorySalesSummary>();

    for (const product of products) {
        const categoryName = product.categoryName?.trim() || UNCATEGORIZED_CATEGORY_NAME;
        const existing = byCategory.get(categoryName);
        if (existing) {
            existing.quantitySold += product.quantitySold;
            existing.productCount += 1;
            continue;
        }

        byCategory.set(categoryName, {
            categoryName,
            quantitySold: product.quantitySold,
            productCount: 1,
        });
    }

    return [...byCategory.values()].sort((left, right) => {
        if (right.quantitySold !== left.quantitySold) {
            return right.quantitySold - left.quantitySold;
        }

        return left.categoryName.localeCompare(right.categoryName);
    });
};

export const OTHER_SALES_SLICE_NAME = "Other";

export type SalesDistributionSlice = {
    name: string;
    value: number;
};

export const buildSalesDistributionSlices = (
    rows: ReadonlyArray<{ name: string; quantitySold: number }>,
    maxSlices = 8,
): SalesDistributionSlice[] => {
    const positive = rows.filter((row) => row.quantitySold > 0);
    if (positive.length <= maxSlices) {
        return positive.map((row) => ({
            name: row.name,
            value: row.quantitySold,
        }));
    }

    const head = positive.slice(0, maxSlices - 1);
    const otherValue = positive
        .slice(maxSlices - 1)
        .reduce((total, row) => total + row.quantitySold, 0);

    return [
        ...head.map((row) => ({ name: row.name, value: row.quantitySold })),
        { name: OTHER_SALES_SLICE_NAME, value: otherValue },
    ];
};
