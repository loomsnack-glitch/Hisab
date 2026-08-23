import * as React from "react"
import { ArrowUpDown } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"
import { Badge } from "@repo/ui/components/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command"
import { DataTableFilterTrigger, DataTableFilterValue } from "@repo/ui/components/data-table-filter-trigger"
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
}

export function DataTableSortFilter({
    title = "Sort",
    value,
    onValueChange,
    options,
}: DataTableSortFilterProps) {
    const [open, setOpen] = React.useState(false)
    const selectedOption = options.find((option) => option.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <DataTableFilterTrigger>
                        <ArrowUpDown />
                        <span>{title}</span>
                        {selectedOption ? (
                            <DataTableFilterValue>
                                <Badge variant="secondary" className="max-w-[12rem] truncate rounded-full px-1.5 font-normal">
                                    {selectedOption.label}
                                </Badge>
                            </DataTableFilterValue>
                        ) : null}
                    </DataTableFilterTrigger>
                }
            />
            <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup role="radiogroup" aria-label={title}>
                            {options.map((option) => {
                                const isSelected = value === option.value
                                return (
                                    <CommandItem
                                        key={option.value}
                                        role="radio"
                                        aria-checked={isSelected}
                                        onSelect={() => {
                                            onValueChange(option.value)
                                            setOpen(false)
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                isSelected ? "border-primary" : "opacity-50",
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "size-2 rounded-full bg-primary transition-opacity",
                                                    isSelected ? "opacity-100" : "opacity-0",
                                                )}
                                            />
                                        </div>
                                        <span>{option.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
