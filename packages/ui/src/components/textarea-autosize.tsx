import { cn } from "@repo/ui/lib/utils"
import ReactTextareaAutosize from "react-textarea-autosize"
import { cva } from "class-variance-authority";
import { forwardRef } from "react";

const textAreavariants = cva("bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", {
    variants: {
        variant: {
            default: "focus-visible:border-ring",
            // ringShadow: "hover:border-indigo-400 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-indigo-200/80 focus-visible:dark:ring-indigo-700/30",
            ringShadow: "hover:border-primary/70 focus-visible:border-primary focus-visible:hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
            shadow: "focus-visible:border-ring focus-visible:shadow-input",
            ringed: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        },
    },
    defaultVariants: {
        variant: "default",
    },
})

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    variant?: "default" | "ringShadow" | "shadow" | "ringed"
    minRows?: number
    maxRows?: number
    onValueChange?: (value: string) => void
    disabled?: boolean
}

const TextareaAutosize = forwardRef(({
    value,
    onValueChange,
    className,
    placeholder = "",
    minRows = 1,
    maxRows = 6,
    maxLength,
    onKeyDown = () => { },
    onPaste = () => { },
    onCompositionStart = () => { },
    onCompositionEnd = () => { },
    variant = "default",
    disabled = false
}: TextareaAutosizeProps, ref: React.Ref<HTMLTextAreaElement>) => {
    return (
        <ReactTextareaAutosize
            ref={ref}
            minRows={minRows}
            maxRows={minRows > maxRows ? minRows : maxRows}
            placeholder={placeholder}
            value={value}
            maxLength={maxLength}
            onChange={event => onValueChange?.(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className={cn(textAreavariants({ variant }), className)}
            disabled={disabled}
        />
    )
}
)

TextareaAutosize.displayName = "TextareaAutosize"

export { TextareaAutosize }
