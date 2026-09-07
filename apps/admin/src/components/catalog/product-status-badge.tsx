import type { ProductStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

type ProductStatusBadgeProps = {
    status: ProductStatus;
};

const statusClassNames: Record<ProductStatus, string> = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    inactive: "border-border/60 bg-muted/40 text-muted-foreground",
};

const ProductStatusBadge = ({ status }: ProductStatusBadgeProps) => {
    return (
        <Badge variant="outline" className={`rounded-full capitalize ${statusClassNames[status]}`}>
            {status}
        </Badge>
    );
};

export default ProductStatusBadge;
