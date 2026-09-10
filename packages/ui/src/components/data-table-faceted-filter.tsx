import * as React from "react"
import { type Column } from "@tanstack/react-table"
import { Filter } from "lucide-react"

import { FilterOptionsList } from "@repo/ui/components/filter-options-list"
import {
    DataTableFilterTrigger,
    dataTableFilterIconClassName,
} from "@repo/ui/components/data-table-filter-trigger"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover"

type FacetedFilterOption = {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
}

type ControlledFacetedFilterProps = {
    title?: string
    options: readonly FacetedFilterOption[]
    selectedValues: Set<string>
    onSelectedValuesChange: (values: Set<string>) => void
    icon?: React.ComponentType<{ className?: string }>
}

type ColumnFacetedFilterProps<TData, TValue> = {
    column: Column<TData, TValue>
    title?: string
    options: readonly FacetedFilterOption[]
    selectedValues?: never
    onSelectedValuesChange?: never
    icon?: React.ComponentType<{ className?: string }>
}

type DataTableFacetedFilterProps<TData, TValue> =
    | ControlledFacetedFilterProps
    | ColumnFacetedFilterProps<TData, TValue>

function FacetedFilterContent({
    title,
    options,
    selectedValues,
    onSelectedValuesChange,
    facets,
}: {
    title?: string
    options: readonly FacetedFilterOption[]
    selectedValues: Set<string>
    onSelectedValuesChange: (values: Set<string>) => void
    facets?: Map<unknown, number>
}) {
    const sortedOptions = [...options].sort((a, b) => {
        const aSelected = selectedValues.has(a.value)
        const bSelected = selectedValues.has(b.value)
        return aSelected === bSelected ? 0 : aSelected ? -1 : 1
    })

    const selectedValueList = Array.from(selectedValues)

    return (
        <FilterOptionsList
            title={`Filter ${title ?? "Options"}`}
            mode="multiple"
            options={sortedOptions}
            selectedValues={selectedValueList}
            onToggle={(value) => {
                const nextValues = new Set(selectedValues)
                if (nextValues.has(value)) {
                    nextValues.delete(value)
                } else {
                    nextValues.add(value)
                }
                onSelectedValuesChange(nextValues)
            }}
            onClear={() => onSelectedValuesChange(new Set())}
            getOptionMeta={
                facets
                    ? (option) => {
                          const count = facets.get(option.value)
                          return count ? (
                              <span className="flex size-4 items-center justify-center font-mono text-[10px] text-muted-foreground">
                                  {count}
                              </span>
                          ) : null
                      }
                    : undefined
            }
        />
    )
}

export function DataTableFacetedFilter<TData, TValue>(props: DataTableFacetedFilterProps<TData, TValue>) {
    const title = props.title
    const options = props.options
    const Icon = props.icon ?? Filter

    const columnSelectedValues = "column" in props && props.column
        ? new Set((props.column.getFilterValue() as string[] | undefined) ?? [])
        : new Set<string>()
    const selectedValues = "selectedValues" in props && props.selectedValues
        ? props.selectedValues
        : columnSelectedValues

    const facets = "column" in props && props.column ? props.column.getFacetedUniqueValues() : undefined
    const isActive = selectedValues.size > 0

    const handleSelectedValuesChange = (values: Set<string>) => {
        if ("onSelectedValuesChange" in props && props.onSelectedValuesChange) {
            props.onSelectedValuesChange(values)
            return
        }
        if ("column" in props && props.column) {
            const filterValues = Array.from(values)
            props.column.setFilterValue(filterValues.length ? filterValues : undefined)
        }
    }

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <DataTableFilterTrigger active={isActive}>
                        <Icon className={dataTableFilterIconClassName(isActive)} />
                        <span>{title}</span>
                        {isActive ? (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                {selectedValues.size}
                            </span>
                        ) : null}
                    </DataTableFilterTrigger>
                }
            />
            <PopoverContent
                align="start"
                className="z-50 w-[180px] rounded-xl border-border/50 bg-card p-2 shadow-md"
            >
                <FacetedFilterContent
                    title={title}
                    options={options}
                    selectedValues={selectedValues}
                    onSelectedValuesChange={handleSelectedValuesChange}
                    facets={facets}
                />
            </PopoverContent>
        </Popover>
    )
}
