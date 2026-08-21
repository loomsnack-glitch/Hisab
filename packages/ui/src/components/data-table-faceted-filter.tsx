import * as React from "react"
import { type Column } from "@tanstack/react-table"
import { Check, PlusCircle } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"
import { Badge } from "@repo/ui/components/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command"
import { DataTableFilterTrigger, DataTableFilterValue } from "@repo/ui/components/data-table-filter-trigger"
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
}

type ColumnFacetedFilterProps<TData, TValue> = {
    column: Column<TData, TValue>
    title?: string
    options: readonly FacetedFilterOption[]
    selectedValues?: never
    onSelectedValuesChange?: never
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
        const aSelected = selectedValues.has(a.value);
        const bSelected = selectedValues.has(b.value);
        return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    });

    return (
        <Command>
            <CommandInput placeholder={title} />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    {sortedOptions.map((option) => {
                        const isSelected = selectedValues.has(option.value)
                        return (
                            <CommandItem
                                key={option.value}
                                onSelect={() => {
                                    const nextValues = new Set(selectedValues)
                                    if (isSelected) {
                                        nextValues.delete(option.value)
                                    } else {
                                        nextValues.add(option.value)
                                    }
                                    onSelectedValuesChange(nextValues)
                                }}
                            >
                                <div
                                    className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "opacity-50 [&_svg]:invisible"
                                    )}
                                >
                                    <Check className="text-white" />
                                </div>
                                {option.icon ? (
                                    <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                ) : null}
                                <span>{option.label}</span>
                                {facets?.get(option.value) ? (
                                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                        {facets.get(option.value)}
                                    </span>
                                ) : null}
                            </CommandItem>
                        )
                    })}
                </CommandGroup>
            </CommandList>
        </Command>
    )
}

export function DataTableFacetedFilter<TData, TValue>(props: DataTableFacetedFilterProps<TData, TValue>) {
    const title = props.title
    const options = props.options

    const columnSelectedValues = "column" in props && props.column
        ? new Set((props.column.getFilterValue() as string[] | undefined) ?? [])
        : new Set<string>()
    const selectedValues = "selectedValues" in props && props.selectedValues
        ? props.selectedValues
        : columnSelectedValues

    const facets = "column" in props && props.column ? props.column.getFacetedUniqueValues() : undefined

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
                    <DataTableFilterTrigger>
                        <PlusCircle />
                        <span>{title}</span>
                        {selectedValues.size > 0 ? (
                            <DataTableFilterValue>
                                <Badge
                                    variant="secondary"
                                    className="rounded-full px-1.5 font-normal lg:hidden"
                                >
                                    {selectedValues.size}
                                </Badge>
                                <span className="hidden min-w-0 items-center gap-1 lg:inline-flex">
                                    {selectedValues.size > 2 ? (
                                        <Badge variant="secondary" className="rounded-full px-1.5 font-normal">
                                            {selectedValues.size} selected
                                        </Badge>
                                    ) : (
                                        options
                                            .filter((option) => selectedValues.has(option.value))
                                            .map((option) => (
                                                <Badge
                                                    variant="secondary"
                                                    key={option.value}
                                                    className="rounded-full px-1.5 font-normal"
                                                >
                                                    {option.label}
                                                </Badge>
                                            ))
                                    )}
                                </span>
                            </DataTableFilterValue>
                        ) : null}
                    </DataTableFilterTrigger>
                }
            />
            <PopoverContent className="w-[200px] p-0" align="start">
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
