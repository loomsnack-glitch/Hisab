import * as React from "react"
import { Filter } from "lucide-react"

import { FilterOptionsList } from "@repo/ui/components/filter-options-list"
import {
    DataTableFilterTrigger,
    dataTableFilterIconClassName,
} from "@repo/ui/components/data-table-filter-trigger"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover"

type DataTableSortFilterOption = {
    label: string
    value: string
}

type DataTableSortFilterProps = {
    title?: string
    value: string
    onValueChange: (value: string) => void
    options: readonly DataTableSortFilterOption[]
    icon?: React.ComponentType<{ className?: string }>
}

export function DataTableSortFilter({
    title = "Sort",
    value,
    onValueChange,
    options,
    icon: Icon = Filter,
}: DataTableSortFilterProps) {
    const [open, setOpen] = React.useState(false)
    const isActive = Boolean(value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <DataTableFilterTrigger active={isActive}>
                        <Icon className={dataTableFilterIconClassName(isActive)} />
                        <span>{title}</span>
                        {isActive ? (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                1
                            </span>
                        ) : null}
                    </DataTableFilterTrigger>
                }
            />
            <PopoverContent
                align="start"
                className="z-50 w-[180px] rounded-xl border-border/50 bg-card p-2 shadow-md"
            >
                <FilterOptionsList
                    title={`Filter ${title}`}
                    mode="single"
                    options={options}
                    selectedValues={value ? [value] : []}
                    onToggle={(nextValue) => {
                        onValueChange(nextValue)
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
