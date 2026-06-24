import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@repo/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  "dark:bg-input/30 border-input aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-9 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium aria-invalid:ring-[3px] md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        ring: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ringShadow: "hover:border-primary/70 focus-visible:border-primary focus-visible:hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  })

function Input({ className, variant, type, ...props }: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Input }
