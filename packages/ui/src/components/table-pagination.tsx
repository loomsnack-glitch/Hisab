import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, } from "lucide-react";
import { type Table } from '@tanstack/react-table';
import { cn } from "@repo/ui/lib/utils";

import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "./select";

const pageOptions = [10, 25, 50, 100];

interface PaginationProps<TData> { table: Table<TData>; maxPageNumbers?: number }
function Pagination<TData>({ table, maxPageNumbers = 5 }: PaginationProps<TData>) {
    if (!table) return null;

    const pageCount = table.getPageCount();
    const pageIndex = table.getState().pagination.pageIndex;

    let startPage = Math.max(0, pageIndex - Math.floor(maxPageNumbers / 2));
    let endPage = Math.min(pageCount - 1, startPage + maxPageNumbers - 1);

    if (pageIndex < Math.floor(maxPageNumbers / 2)) {
        endPage = Math.min(maxPageNumbers - 1, pageCount - 1);
    }
    if (pageIndex >= pageCount - Math.floor(maxPageNumbers / 2)) {
        startPage = Math.max(0, pageCount - maxPageNumbers);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex justify-center space-x-1 md:space-x-2 px-1 md:px-2">
            {startPage > 0 && (
                <>
                    <Button variant="outline" className='px-1 md:px-2 py-1 text-xs md:text-sm' onClick={() => table.setPageIndex(0)}>1</Button>
                    {startPage > 1 && <span className="text-xs md:text-sm">...</span>}
                </>
            )}
            {pages.map(page => (
                <Button
                    key={page}
                    variant="outline"
                    size={'icon'}
                    onClick={() => table.setPageIndex(page)}
                    className={cn('px-1 md:px-2 py-1 transition-none text-xs md:text-sm', {
                        'font-bold bg-primary text-white border-primary hover:text-white hover:bg-primary hover:border-primary': pageIndex === page
                    })}
                >
                    {page + 1}
                </Button>
            ))}
            {endPage < pageCount - 1 && (
                <>
                    {endPage < pageCount - 2 && <span className="text-xs md:text-sm">...</span>}
                    <Button variant="outline" className='px-1 md:px-2 py-1 text-xs md:text-sm' onClick={() => table.setPageIndex(pageCount - 1)}>{pageCount}</Button>
                </>
            )}
        </div>
    );
}

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
    count?: number;
    customPerPageOptions?: number[];
    className?: string;
}

export function DataTablePagination<TData>({ table, count, customPerPageOptions, className }: DataTablePaginationProps<TData>) {
    if (!table) return null;
    const perPageOptions = customPerPageOptions || pageOptions;

    return (
        <div className={cn("flex flex-col md:flex-row items-center justify-between px-2 pb-4 space-y-2 md:space-y-0", className)}>
            <div className="text-xs md:text-sm text-muted-foreground hidden md:block">
                showing {
                    table?.getState().pagination.pageIndex * table?.getState().pagination.pageSize + 1
                } to {
                    table?.getState().pagination.pageIndex * table?.getState().pagination.pageSize + table?.getState().pagination.pageSize
                } of {count || table.getFilteredRowModel().rows.length} rows
            </div>
            <div className="flex flex-row items-center space-y-0 space-x-4 lg:space-x-8">
                <div className="flex items-center gap-x-2">
                    <p className="text-xs md:text-sm font-medium m-0 hidden md:block">Rows per page</p>
                    <Select
                        value={`${table?.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table?.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 !w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {perPageOptions.map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-1 md:space-x-2">
                    <div className="hidden md:flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table?.getState().pagination.pageIndex + 1} of{" "}
                        {table?.getPageCount()}
                    </div>
                    <Button
                        variant="outline"
                        className='p-1'
                        onClick={() => table?.setPageIndex(0)}
                        disabled={!table?.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        className='p-1'
                        onClick={() => table?.previousPage()}
                        disabled={!table?.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft size={16} />
                    </Button>
                    <Pagination table={table} maxPageNumbers={3} />
                    <Button
                        variant="outline"
                        className='p-1'
                        onClick={() => table?.nextPage()}
                        disabled={!table?.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        className='p-1'
                        onClick={() => table?.setPageIndex(table?.getPageCount() - 1)}
                        disabled={!table?.getCanNextPage()}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
}