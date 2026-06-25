import type { ProductStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

type ProductStatusBadgeProps = {
    status: ProductStatus;
};

const statusClassNames: Record<ProductStatus, string> = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    inactive: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const ProductStatusBadge = ({ status }: ProductStatusBadgeProps) => {
    return (
        <Badge variant="outline" className={`rounded-full capitalize ${statusClassNames[status]}`}>
            {status}
        </Badge>
    );
};

export default ProductStatusBadge;
