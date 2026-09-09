import type { ProductStatus } from "@repo/types";
import { getStoreProductOfferingAvailability } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

import { catalogProductStatusLabel } from "@/lib/catalog-product-status-copy";

type ProductStatusBadgeProps = {
    status: ProductStatus;
};

const statusClassNames: Record<ProductStatus, string> = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    inactive: "border-border/60 bg-muted/40 text-muted-foreground",
};

const ProductStatusBadge = ({ status }: ProductStatusBadgeProps) => {
    return (
        <Badge variant="outline" className={`rounded-full ${statusClassNames[status]}`}>
            {catalogProductStatusLabel(status)}
        </Badge>
    );
};

type StoreOfferingAvailabilityBadgeProps = {
    offering: {
        status: ProductStatus;
        product: { status: ProductStatus };
    };
};

export const StoreOfferingAvailabilityBadge = ({
    offering,
}: StoreOfferingAvailabilityBadgeProps) => {
    const availability = getStoreProductOfferingAvailability(offering);

    if (availability === "sellable") {
        return null;
    }

    if (availability === "inactive_in_org") {
        return (
            <Badge
                variant="outline"
                className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            >
                Inactive in org
            </Badge>
        );
    }

    return <ProductStatusBadge status="inactive" />;
};

export default ProductStatusBadge;
