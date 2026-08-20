import type { CategoryStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

type CategoryStatusBadgeProps = {
    status: CategoryStatus;
};

const statusClassNames: Record<CategoryStatus, string> = {
    active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    inactive: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const CategoryStatusBadge = ({ status }: CategoryStatusBadgeProps) => {
    return (
        <Badge variant="outline" className={`rounded-full capitalize ${statusClassNames[status]}`}>
            {status}
        </Badge>
    );
};

export default CategoryStatusBadge;
