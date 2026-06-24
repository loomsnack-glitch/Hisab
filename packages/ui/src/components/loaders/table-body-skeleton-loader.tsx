"use client"
import { Skeleton } from "@repo/ui/components/skeleton";
import { TableBody, TableCell, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";

const TableBodySkeletonLoader = ({ rowCount = 3, columnCount = 3, widthClasses = ["w-10", "w-14", "w-18", "w-22", "w-26"], tableCellClassName = "" }) => {

    const getRandomWidthClass = () => {
        const index = Math.floor(Math.random() * widthClasses.length);
        return widthClasses[index];
    };

    return (
        <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
                <TableRow
                    key={i}
                    className=""
                >
                    {Array.from({ length: columnCount }).map((_, j) => (
                        <TableCell
                            key={j}
                            className={cn("text-blue-500 cursor-pointer hover:bg-indigo-50 border py-2", tableCellClassName)}
                        >
                            <Skeleton className={`${getRandomWidthClass()} h-5`} />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    );
};

export default TableBodySkeletonLoader;
