import * as React from "react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { DataListRoot, DataListItem, DataListLabel, DataListValue, } from "./data-list";

interface DataListSkeletonProps {
    rows?: number; // how many items to show while loading
    orientation?: "horizontal" | "vertical";
    size?: "sm" | "default" | "lg";
}

export const DataListSkeleton: React.FC<DataListSkeletonProps> = ({
    rows = 5,
    orientation = "horizontal",
    size = "default",
}) => {
    return (
        <DataListRoot orientation={orientation} size={size}>
            {Array.from({ length: rows }).map((_, idx) => (
                <DataListItem key={idx}>
                    <DataListLabel>
                        <Skeleton className="h-4 w-20" />
                    </DataListLabel>
                    <DataListValue>
                        <Skeleton className="h-4 w-40" />
                    </DataListValue>
                </DataListItem>
            ))}
        </DataListRoot>
    );
};
