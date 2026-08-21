import type { StoreDeviceStatus } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";

const statusStyles: Record<StoreDeviceStatus, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    inactive: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
    revoked: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
};

type DeviceStatusBadgeProps = {
    status: StoreDeviceStatus;
    className?: string;
};

const DeviceStatusBadge = ({ status, className }: DeviceStatusBadgeProps) => {
    return (
        <Badge variant="outline" className={cn("capitalize", statusStyles[status], className)}>
            {status}
        </Badge>
    );
};

export default DeviceStatusBadge;
