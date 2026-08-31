import type { ExpenseLifecycle, ExpensePayableStatus } from "@repo/types";
import { EXPENSE_LIFECYCLE_LABELS, EXPENSE_PAYABLE_STATUS_LABELS } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

const lifecycleClassNames: Record<ExpenseLifecycle, string> = {
    draft: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    recorded: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    voided: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const payableClassNames: Record<ExpensePayableStatus, string> = {
    due: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    partial: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export const ExpenseLifecycleBadge = ({ lifecycle }: { lifecycle: ExpenseLifecycle }) => (
    <Badge variant="outline" className={`rounded-full ${lifecycleClassNames[lifecycle]}`}>
        {EXPENSE_LIFECYCLE_LABELS[lifecycle]}
    </Badge>
);

export const ExpensePayableStatusBadge = ({ status }: { status: ExpensePayableStatus | null }) => {
    if (!status) {
        return null;
    }

    return (
        <Badge variant="outline" className={`rounded-full ${payableClassNames[status]}`}>
            {EXPENSE_PAYABLE_STATUS_LABELS[status]}
        </Badge>
    );
};
