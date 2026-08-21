import type { ProductType } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Boxes } from "lucide-react";

type ProductTypeBadgeProps = {
    productType: ProductType;
};

const ProductTypeBadge = ({ productType }: ProductTypeBadgeProps) => {
    if (productType === "single") {
        return null;
    }

    return (
        <Badge
            variant="outline"
            className="rounded-full border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        >
            {productType === "combo" ? (
                <>
                    <Boxes className="size-3" aria-hidden="true" />
                    Combo
                </>
            ) : (
                "Legacy Bundle"
            )}
        </Badge>
    );
};

export default ProductTypeBadge;
