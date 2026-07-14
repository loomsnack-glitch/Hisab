"use client"

import * as React from "react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table"
import { Checkbox } from "./checkbox"
import { Input } from "./input"
import { Button } from "./button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Columns,
  Check,
  Filter,
  RotateCw,
  Loader2,
  X
} from "lucide-react"
import { cn } from "@repo/ui/lib/utils"

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  getSortValue?: (row: T) => string | number | boolean;
  className?: string;
  filterOptions?: { label: string; value: string }[];
  getFilterValue?: (row: T) => string;
}

interface PremiumTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  loadingText?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  searchKeys?: ((row: T) => string)[];
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  actions?: (row: T) => React.ReactNode;
  defaultPageSize?: number;
  rowIdKey?: keyof T;
  toolbarActions?: React.ReactNode;
  fullHeight?: boolean;
  onRefresh?: () => void;
  showColumnsToggle?: boolean;
  infoText?: string;
}

export function PremiumTable<T>({
  data,
  columns,
  isLoading = false,
  loadingText = "Loading items...",
  emptyText = "No items found.",
  searchPlaceholder = "Search...",
  searchKeys,
  selectable = false,
  onSelectionChange,
  actions,
  defaultPageSize = 50,
  rowIdKey = "id" as keyof T,
  toolbarActions,
  fullHeight = false,
  onRefresh,
  showColumnsToggle = false,
  infoText,
}: PremiumTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [pageSize, setPageSize] = React.useState(defaultPageSize)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [visibleColumnIds, setVisibleColumnIds] = React.useState<string[]>(
    columns.map((c) => c.id)
  )

  const [sortColumnId, setSortColumnId] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null)
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string[]>>({})
  const [selectedIds, setSelectedIds] = React.useState<Set<string | number>>(new Set())

  const hasActiveFilters = React.useMemo(() => {
    return Object.values(columnFilters).some((vals) => vals && vals.length > 0)
  }, [columnFilters])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, pageSize, columnFilters])

  const handleSort = (columnId: string) => {
    if (sortColumnId === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumnId(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumnId(columnId)
      setSortDirection("asc")
    }
  }

  const filteredData = React.useMemo(() => {
    let result = data

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter((row) => {
        if (searchKeys) {
          return searchKeys.some((fn) => fn(row).toLowerCase().includes(query))
        }
        return Object.values(row as object).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(query)
        )
      })
    }

    Object.entries(columnFilters).forEach(([colId, selectedValues]) => {
      if (selectedValues.length === 0) return
      const col = columns.find((c) => c.id === colId)
      if (!col) return

      result = result.filter((row) => {
        const val = col.getFilterValue ? col.getFilterValue(row) : String(row[colId as keyof T] || "")
        return selectedValues.includes(val)
      })
    })

    return result
  }, [data, searchQuery, searchKeys, columnFilters, columns])

  const sortedData = React.useMemo(() => {
    if (!sortColumnId || !sortDirection) return filteredData

    const col = columns.find((c) => c.id === sortColumnId)
    if (!col) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      let valA = col.getSortValue ? col.getSortValue(a) : (a[sortColumnId as keyof T] as any)
      let valB = col.getSortValue ? col.getSortValue(b) : (b[sortColumnId as keyof T] as any)

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (valA === undefined || valA === null) return 1
      if (valB === undefined || valB === null) return -1

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sortColumnId, sortDirection, columns])

  const totalRows = sortedData.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  const safeCurrentPage = Math.min(currentPage, pageCount)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRows)
  const paginatedData = React.useMemo(() => {
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, startIndex, endIndex])

  const getRowId = (row: T, index: number): string | number => {
    if (row && typeof row === "object" && rowIdKey in row) {
      const val = row[rowIdKey]
      if (typeof val === "string" || typeof val === "number") {
        return val
      }
    }
    return index
  }

  const handleSelectAll = (checked: boolean) => {
    const nextSet = new Set(selectedIds)
    paginatedData.forEach((row, i) => {
      const id = getRowId(row, startIndex + i)
      if (checked) {
        nextSet.add(id)
      } else {
        nextSet.delete(id)
      }
    })
    setSelectedIds(nextSet)

    if (onSelectionChange) {
      const selectedRows = data.filter((row, i) => nextSet.has(getRowId(row, i)))
      onSelectionChange(selectedRows)
    }
  }

  const handleSelectRow = (rowId: string | number, checked: boolean) => {
    const nextSet = new Set(selectedIds)
    if (checked) {
      nextSet.add(rowId)
    } else {
      nextSet.delete(rowId)
    }
    setSelectedIds(nextSet)

    if (onSelectionChange) {
      const selectedRows = data.filter((row, i) => nextSet.has(getRowId(row, i)))
      onSelectionChange(selectedRows)
    }
  }

  const isRowSelected = (rowId: string | number) => selectedIds.has(rowId)

  const isAllPaginatedRowsSelected = React.useMemo(() => {
    if (paginatedData.length === 0) return false
    return paginatedData.every((row, i) => selectedIds.has(getRowId(row, startIndex + i)))
  }, [paginatedData, selectedIds, startIndex])

  const toggleColumnVisibility = (colId: string) => {
    if (visibleColumnIds.includes(colId)) {
      if (visibleColumnIds.length > 1) {
        setVisibleColumnIds(visibleColumnIds.filter((id) => id !== colId))
      }
    } else {
      setVisibleColumnIds([...visibleColumnIds, colId])
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page)
    }
  }

  const showSearch = Boolean(searchKeys && searchKeys.length > 0)
  const activeFilters = columns.filter((col) => col.filterOptions && visibleColumnIds.includes(col.id))
  
  const showToolbar = Boolean(
    showSearch ||
    activeFilters.length > 0 ||
    showColumnsToggle ||
    toolbarActions ||
    onRefresh ||
    infoText
  )

  return (
    <div className={cn("space-y-4 animate-in fade-in duration-300", fullHeight && "flex flex-col flex-1 h-full overflow-hidden")}>
      {/* 1. Header Toolbar */}
      {showToolbar && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search + Refresh Group */}
            {(showSearch || onRefresh) && (
              <div className="flex items-center gap-2 shrink-0">
                {showSearch && (
                  <div className="relative w-[300px] group/search">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-300 group-focus-within/search:text-primary" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "pl-9 h-9 bg-card border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-all duration-300 rounded-xl shadow-2xs text-sm w-full",
                        searchQuery && "pr-8"
                      )}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="size-9 rounded-full bg-card border-border/50 hover:bg-muted/30 shadow-2xs flex items-center justify-center shrink-0"
                  >
                    <RotateCw className={cn("size-3.5 text-muted-foreground", isLoading && "animate-spin")} />
                  </Button>
                )}
              </div>
            )}

            {/* Column Filters */}
            {activeFilters.map((col) => (
              <Popover key={col.id}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 rounded-full bg-card border-border/50 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 shadow-2xs flex items-center gap-1.5 px-3.5 text-xs font-semibold shrink-0 cursor-pointer transition-all duration-200",
                        (columnFilters[col.id]?.length || 0) > 0
                          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                          : "text-muted-foreground"
                      )}
                    >
                      <Filter className={cn(
                        "size-3.5 transition-colors",
                        (columnFilters[col.id]?.length || 0) > 0
                          ? "text-primary stroke-[2.5]"
                          : "text-muted-foreground/70"
                      )} />
                      <span>{col.header}</span>
                      {(columnFilters[col.id]?.length || 0) > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                          {columnFilters[col.id].length}
                        </span>
                      )}
                    </Button>
                  }
                />
                <PopoverContent align="start" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">Filter {col.header}</p>
                    {col.filterOptions!.map((opt) => {
                      const isChecked = (columnFilters[col.id] || []).includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const current = columnFilters[col.id] || []
                            const next = current.includes(opt.value)
                              ? current.filter((v) => v !== opt.value)
                              : [...current, opt.value]
                            setColumnFilters({
                              ...columnFilters,
                              [col.id]: next,
                            })
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left font-medium hover:bg-muted/50 cursor-pointer"
                        >
                          <div className={cn(
                            "flex size-4 items-center justify-center rounded-full border border-muted-foreground/35 transition-colors",
                            isChecked ? "bg-primary text-primary-foreground border-primary" : "bg-transparent"
                          )}>
                            {isChecked && <Check className="size-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      )
                    })}
                    {(columnFilters[col.id]?.length || 0) > 0 && (
                      <button
                        onClick={() => {
                          const next = { ...columnFilters }
                          delete next[col.id]
                          setColumnFilters(next)
                        }}
                        className="w-full text-center text-[10px] font-bold text-primary hover:underline pt-1.5 border-t border-border/40 cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ))}

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={() => setColumnFilters({})}
                className="h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-semibold gap-1.5 px-3 shrink-0 cursor-pointer animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <X className="size-3.5" />
                <span>Clear Filters</span>
              </Button>
            )}

            {infoText && (
              <span className="text-xs text-muted-foreground ml-1.5 select-none font-medium">
                {infoText}
              </span>
            )}
          </div>

          {/* Action Controls */}
          {(toolbarActions || showColumnsToggle) && (
            <div className="flex flex-wrap items-center gap-3">
              {toolbarActions}
              {showColumnsToggle && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full bg-card border-border/50 hover:bg-muted/30 shadow-2xs flex items-center justify-center shrink-0"
                      >
                        <Columns className="size-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-[180px] p-2 bg-card border-border/50 rounded-xl shadow-md z-50">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">Visible Columns</p>
                      {columns.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => toggleColumnVisibility(col.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left font-medium hover:bg-muted/50 cursor-pointer"
                        >
                          <div className={cn(
                            "flex size-4 items-center justify-center rounded-sm border border-border/60 transition-colors",
                            visibleColumnIds.includes(col.id) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent"
                          )}>
                            {visibleColumnIds.includes(col.id) && <Check className="size-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{col.header}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Unified Card (Table Container + Pagination Footer) */}
      <div className={cn(
        "rounded-2xl border border-border/60 bg-card/30 overflow-hidden shadow-sm flex flex-col",
        fullHeight && "flex-1 min-h-0"
      )}>
          <Table
            className="min-w-full text-sm"
            tableContainerClassname={cn(
              "w-full overflow-auto relative border-0 shadow-none rounded-none",
              fullHeight
                ? "flex-1 min-h-0 max-h-none"
                : "max-h-[calc(100dvh-240px)] md:max-h-[calc(100dvh-340px)]"
            )}
          >
            <TableHeader className="border-b border-border/50 bg-card/90 text-muted-foreground sticky top-0 backdrop-blur-md z-10">
              <TableRow className="border-0 hover:bg-transparent">
                {/* Select All Checkbox */}
                {selectable && (
                  <TableHead className="w-12 pl-4 pr-0 h-11">
                    <Checkbox
                      checked={isAllPaginatedRowsSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                )}

                {/* Headers */}
                {columns
                  .filter((c) => visibleColumnIds.includes(c.id))
                  .map((col) => (
                    <TableHead
                      key={col.id}
                      className={cn(
                        "h-11 px-4 text-left align-middle font-medium whitespace-nowrap text-muted-foreground",
                        col.sortable && "select-none hover:bg-muted/20",
                        col.className
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-1.5 group/header",
                        col.className?.includes("text-right") && "justify-end",
                        col.className?.includes("text-center") && "justify-center"
                      )}>
                        <span
                          onClick={() => col.sortable && handleSort(col.id)}
                          className={cn("truncate", col.sortable && "cursor-pointer")}
                        >
                          {col.header}
                        </span>
                        {col.sortable && (
                          <ArrowUpDown
                            onClick={() => handleSort(col.id)}
                            className={cn(
                              "size-3 cursor-pointer transition-colors shrink-0",
                              sortColumnId === col.id
                                ? "text-primary opacity-100"
                                : "text-muted-foreground opacity-40 group-hover/header:opacity-100"
                            )}
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}

                {actions && <TableHead className="text-right pr-4 h-11 text-muted-foreground">Actions</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/40">
              {isLoading ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell
                    colSpan={(selectable ? 1 : 0) + visibleColumnIds.length + (actions ? 1 : 0)}
                    className="h-32 text-center text-muted-foreground font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5 animate-in fade-in duration-300">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-sm font-semibold">{loadingText}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell
                    colSpan={(selectable ? 1 : 0) + visibleColumnIds.length + (actions ? 1 : 0)}
                    className="h-28 text-center text-muted-foreground font-medium p-4"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, i) => {
                  const idx = startIndex + i
                  const rowId = getRowId(row, idx)
                  const isSelected = isRowSelected(rowId)

                  return (
                    <TableRow
                      key={String(rowId)}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn(
                        "transition-colors duration-150 hover:bg-muted/30 border-0",
                        idx % 2 !== 0 ? "bg-muted/10" : "",
                        isSelected && "bg-muted/30"
                      )}
                    >
                      {selectable && (
                        <TableCell className="pl-4 pr-0 py-3.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(rowId, !!checked)}
                            aria-label={`Select row ${String(rowId)}`}
                          />
                        </TableCell>
                      )}

                      {columns
                        .filter((c) => visibleColumnIds.includes(c.id))
                        .map((col) => (
                          <TableCell key={col.id} className={cn("px-4 py-3.5", col.className)}>
                            {col.accessor(row)}
                          </TableCell>
                        ))}

                      {actions && (
                        <TableCell className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {actions(row)}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

        {/* 3. Pagination Footer inside Card */}
        {!isLoading && totalRows > 0 && (
          <div className={cn(
            "flex flex-col gap-4 py-3.5 sm:flex-row sm:items-center sm:justify-between px-4 bg-muted/5 shrink-0 z-10 border-t border-border/40",
            fullHeight ? "" : "mt-0"
          )}>
            <div className="text-xs font-semibold text-muted-foreground">
              Showing <span className="text-foreground">{startIndex + 1}</span> to{" "}
              <span className="text-foreground">{endIndex}</span> of{" "}
              <span className="text-foreground">{totalRows}</span> entries
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5 border border-border/50 bg-card/40 rounded-full p-1 shadow-2xs h-9">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="size-7 rounded-full text-muted-foreground hover:bg-muted/30 disabled:opacity-40 shrink-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                {Array.from({ length: pageCount }).map((_, pageIdx) => {
                  const pageNum = pageIdx + 1
                  const isNear = Math.abs(currentPage - pageNum) <= 1
                  const isFirstOrLast = pageNum === 1 || pageNum === pageCount

                  if (!isNear && !isFirstOrLast) {
                    if (pageNum === 2 || pageNum === pageCount - 1) {
                      return (
                        <span key={pageNum} className="text-muted-foreground text-xs font-semibold px-0.5 select-none">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="xs"
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "size-7 text-xs font-semibold rounded-full shrink-0",
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs shadow-primary/10"
                          : "text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                })}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="size-7 rounded-full text-muted-foreground hover:bg-muted/30 disabled:opacity-40 shrink-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>

              {/* Show Rows selector */}
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
                modal={false}
              >
                <SelectTrigger className="!h-9 w-[125px] rounded-full text-xs font-semibold bg-card/40 border-border/50 shadow-2xs hover:bg-muted/30 focus-visible:ring-primary/20 flex items-center justify-between px-3.5">
                  <span className="text-muted-foreground">Show</span>
                  <SelectValue className="flex-none min-w-[20px] text-center text-foreground font-bold" />
                  <span className="text-muted-foreground">Row</span>
                </SelectTrigger>
                <SelectContent side="top" align="end" className="bg-popover border-border/50 rounded-xl">
                  {[10, 15, 50, 100].map((size) => (
                    <SelectItem
                      key={size}
                      value={String(size)}
                      className="text-xs font-semibold cursor-pointer transition-all duration-150 rounded-lg py-1.5 px-2 my-0.5 mx-1 text-foreground bg-transparent hover:bg-primary/10 focus:bg-primary/10 hover:**:!text-primary focus:**:!text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:**:!text-primary data-[state=checked]:!bg-primary data-[state=checked]:**:!text-primary-foreground data-[state=checked]:focus:!bg-primary/95"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
