import { cn } from "@repo/ui/lib/utils";

import { formatAppVersion, localAppVersion } from "@/lib/app-version";

type AppVersionBadgeProps = {
    className?: string;
};

const AppVersionBadge = ({ className }: AppVersionBadgeProps) => (
    <span
        className={cn(
            "inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground",
            className,
        )}
        title={`Build ${localAppVersion.build}`}
    >
        {formatAppVersion(localAppVersion)}
    </span>
);

export default AppVersionBadge;
