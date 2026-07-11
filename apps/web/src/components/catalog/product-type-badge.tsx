import type { ProductType } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

type ProductTypeBadgeProps = {
    productType: ProductType;
};

const ProductTypeBadge = ({ productType }: ProductTypeBadgeProps) => {
    if (productType !== "bundle") {
        return null;
    }

    return (
        <Badge
            variant="outline"
            className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        >
            Bundle
        </Badge>
    );
};

export default ProductTypeBadge;
