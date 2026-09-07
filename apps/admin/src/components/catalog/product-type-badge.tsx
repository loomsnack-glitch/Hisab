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
            className="rounded-full border-primary/30 bg-primary/10 text-primary"
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
