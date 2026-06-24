"use client"

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"
import { Button } from "@repo/ui/components/button"
import { Calendar } from "@repo/ui/components/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover"
import { format } from "date-fns"

interface DatePickerProps {
    value?: Date | null
    onChange?: (date: Date | null) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    clearable?: boolean
}

function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled,
    className,
    clearable = true,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    const selected = value ? new Date(value) : undefined

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "h-9 w-full justify-start text-left font-normal",
                            !value && "text-muted-foreground",
                            className,
                        )}
                    >
                        <CalendarIcon className="mr-2 size-3.5 shrink-0" />
                        <span className="truncate">
                            {selected
                                ? format(selected, "dd MMM yyyy")
                                : placeholder}
                        </span>
                        {clearable && value && (
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onChange?.(null)
                                }}
                                className="ml-auto opacity-50 transition-opacity hover:opacity-100 focus:outline-none">
                                <XIcon className="size-3.5" />
                            </Button>
                        )}
                    </Button>
                }
            >
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => {
                        onChange?.(date ?? null)
                        setOpen(false)
                    }}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    )
}

export { DatePicker }
export type { DatePickerProps }
