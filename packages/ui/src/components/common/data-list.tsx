import * as React from "react";
import { cn } from "@repo/ui/lib/utils";

interface DataListRootProps extends React.HTMLAttributes<HTMLDListElement> {
    className?: string;
    orientation?: "horizontal" | "vertical";
    size?: "sm" | "default" | "lg";
    ref?: React.ForwardedRef<HTMLDListElement>;
}

const DataListRoot = ({ className, orientation = "horizontal", size = "default", ref, ...props }: DataListRootProps) => {
    return (
        <dl
            ref={ref}
            className={cn(
                "w-full font-normal text-left text-sm",
                orientation === "horizontal" ? "grid grid-cols-[auto_1fr] gap-x-2" : "flex flex-col gap-y-2",
                {
                    "gap-1": size === "sm",
                    "gap-2": size === "default",
                    "gap-4": size === "lg",
                },
                className
            )}
            {...props}
            data-size={size}
        />
    );
};
DataListRoot.displayName = "DataList.Root";

interface DataListItemProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: "start" | "center" | "end" | "baseline" | "stretch";
    ref?: React.ForwardedRef<HTMLDivElement>;
}

const DataListItem = ({ className, align = "baseline", children, ref, ...props }: DataListItemProps) => {
    return (
        <div
            ref={ref}
            className={cn(
                "grid grid-cols-subgrid col-span-2 px-2 pt-1 h-fit",
                "border-b hover:border-b-indigo-300 dark:hover:border-b-indigo-700 last:border-none",
                "[[data-size=sm]_&]:pb-1 [[data-size=default]_&]:pb-2 [[data-size=lg]_&]:pb-4",
                {
                    "items-start": align === "start",
                    "items-center": align === "center",
                    "items-end": align === "end",
                    "items-baseline": align === "baseline",
                    "items-stretch": align === "stretch",
                },
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
DataListItem.displayName = "DataList.Item";

interface DataListLabelProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: string;
    ref?: React.ForwardedRef<HTMLDivElement>;
}

const DataListLabel = ({ className, width = "min-w-32", ref, ...props }: DataListLabelProps) => {
    return (
        <dt
            ref={ref}
            className={cn(
                "flex font-normal border-t first:border-none",
                width,
                className
            )}
            {...props}
        />
    );
};
DataListLabel.displayName = "DataList.Label";

interface DataListValueProps extends React.HTMLAttributes<HTMLDivElement> {
    ref?: React.ForwardedRef<HTMLDivElement>;
}

const DataListValue = ({ className, ref, ...props }: DataListValueProps) => {
    return (
        <dd
            ref={ref}
            className={cn("min-w-0 break-words font-medium mb-0", className)}
            {...props}
        />
    );
};
DataListValue.displayName = "DataList.Value";

export {
    DataListRoot,
    DataListItem,
    DataListLabel,
    DataListValue,
};
