import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@repo/ui/lib/utils"
import { type VariantProps } from "class-variance-authority";

const chipVariants = cva(
    "inline-flex items-center whitespace-nowrap border font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
    {
        variants: {
            variant: {
                default:
                    "border-transparent text-primary-foreground",
                light:
                    "border-transparent",
                glossy: "border-none bg-gradient-to-r text-primary-foreground",
                outline: "bg-transparent",
                none: ''
            },
            color: {
                white: [],
                black: [],
                slate: [],
                gray: [],
                zinc: [],
                neutral: [],
                stone: [],
                red: [],
                orange: [],
                amber: [],
                yellow: [],
                lime: [],
                green: [],
                emerald: [],
                teal: [],
                cyan: [],
                sky: [],
                blue: [],
                indigo: [],
                violet: [],
                purple: [],
                fuchsia: [],
                pink: [],
                rose: []
            },
            size: {
                xxs: ['text-[10px] px-2 py-0.5'],
                xs: ['text-xs px-1 py-0.5'],
                sm: ['text-sm px-1.5 py-0.5'],
                md: ['text-sm px-2 py-1.5'],
                lg: ['text-base px-2.5 py-2'],
                xl: ['text-base px-3 py-2'],
            },
            radius: {
                rounded: "rounded",
                pill: "rounded-full",
                square: "rounded-none",
                md: "rounded-md",
                sm: "rounded-xs",
                lg: "rounded-lg",
                xl: "rounded-xl",
            },
            border: {
                default: "border",
                none: "border-none",
            },
        },
        compoundVariants: [
            {
                variant: "default",
                color: "white",
                className: "text-black bg-white",
            },
            {
                variant: "default",
                color: "black",
                className: "text-white bg-black",
            },
            {
                variant: "default",
                color: "slate",
                className: "text-primary-foreground bg-slate-500 dark:bg-slate-600",
            },
            {
                variant: "default",
                color: "gray",
                className: "text-primary-foreground bg-gray-500 dark:bg-gray-600",
            },
            {
                variant: "default",
                color: "zinc",
                className: "text-primary-foreground bg-zinc-500 dark:bg-zinc-600",
            },
            {
                variant: "default",
                color: "neutral",
                className: "text-primary-foreground bg-neutral-500 dark:bg-neutral-600",
            },
            {
                variant: "default",
                color: "stone",
                className: "text-primary-foreground bg-stone-500 dark:bg-stone-600",
            },
            {
                variant: "default",
                color: "red",
                className: "text-primary-foreground bg-red-500 dark:bg-red-600",
            },
            {
                variant: "default",
                color: "orange",
                className: "text-primary-foreground bg-orange-500 dark:bg-orange-600",
            },
            {
                variant: "default",
                color: "amber",
                className: "text-primary-foreground bg-amber-500 dark:bg-amber-600",
            },
            {
                variant: "default",
                color: "yellow",
                className: "text-primary-foreground bg-yellow-500 dark:bg-yellow-600",
            },
            {
                variant: "default",
                color: "lime",
                className: "text-primary-foreground bg-lime-500 dark:bg-lime-600",
            },
            {
                variant: "default",
                color: "green",
                className: "text-primary-foreground bg-green-500 dark:bg-green-600",
            },
            {
                variant: "default",
                color: "emerald",
                className: "text-primary-foreground bg-emerald-500 dark:bg-emerald-600",
            },
            {
                variant: "default",
                color: "teal",
                className: "text-primary-foreground bg-teal-500 dark:bg-teal-600",
            },
            {
                variant: "default",
                color: "cyan",
                className: "text-primary-foreground bg-cyan-500 dark:bg-cyan-600",
            },
            {
                variant: "default",
                color: "sky",
                className: "text-primary-foreground bg-sky-500 dark:bg-sky-600",
            },
            {
                variant: "default",
                color: "blue",
                className: "text-primary-foreground bg-blue-500 dark:bg-blue-600",
            },
            {
                variant: "default",
                color: "indigo",
                className: "text-primary-foreground bg-indigo-500 dark:bg-indigo-600",
            },
            {
                variant: "default",
                color: "violet",
                className: "text-primary-foreground bg-violet-500 dark:bg-violet-600",
            },
            {
                variant: "default",
                color: "purple",
                className: "text-primary-foreground bg-purple-500 dark:bg-purple-600",
            },
            {
                variant: "default",
                color: "fuchsia",
                className: "text-primary-foreground bg-fuchsia-500 dark:bg-fuchsia-600",
            },
            {
                variant: "default",
                color: "pink",
                className: "text-primary-foreground bg-pink-500 dark:bg-pink-600",
            },
            {
                variant: "default",
                color: "rose",
                className: "text-primary-foreground bg-rose-500 dark:bg-rose-600",
            },
            {
                variant: "light",
                color: "white",
                className: "text-black/80 dark:text-black/60 border-black/20 bg-white/80",
            },
            {
                variant: "light",
                color: "black",
                className: "text-white/80 dark:text-white/60 border-white/20 bg-black/80",
            },
            {
                variant: "light",
                color: "slate",
                className: "text-slate-700 dark:text-slate-400 border-slate-500 bg-slate-400/25 dark:bg-slate-400/15 hover:bg-slate-400/35 dark:hover:bg-slate-400/20",
            },
            {
                variant: "light",
                color: "gray",
                className: "text-gray-700 dark:text-gray-400 border-gray-500 bg-gray-400/25 dark:bg-gray-400/15 hover:bg-gray-400/35 dark:hover:bg-gray-400/20",
            },
            {
                variant: "light",
                color: "zinc",
                className: "text-zinc-700 dark:text-zinc-400 border-zinc-500 bg-zinc-400/25 dark:bg-zinc-400/15 hover:bg-zinc-400/35 dark:hover:bg-zinc-400/20",
            },
            {
                variant: "light",
                color: "neutral",
                className: "text-neutral-700 dark:text-neutral-400 border-neutral-500 bg-neutral-400/25 dark:bg-neutral-400/15 hover:bg-neutral-400/35 dark:hover:bg-neutral-400/20",
            },
            {
                variant: "light",
                color: "stone",
                className: "text-stone-700 dark:text-stone-400 border-stone-500 bg-stone-400/25 dark:bg-stone-400/15 hover:bg-stone-400/35 dark:hover:bg-stone-400/20",
            },
            {
                variant: "light",
                color: "red",
                className: "text-red-700 dark:text-red-400 border-red-500 bg-red-400/25 dark:bg-red-400/15 hover:bg-red-400/35 dark:hover:bg-red-400/20",
            },
            {
                variant: "light",
                color: "orange",
                className: "text-orange-700 dark:text-orange-400 border-orange-500 bg-orange-400/25 dark:bg-orange-400/15 hover:bg-orange-400/35 dark:hover:bg-orange-400/20",
            },
            {
                variant: "light",
                color: "amber",
                className: "text-amber-700 dark:text-amber-400 border-amber-500 bg-amber-400/25 dark:bg-amber-400/15 hover:bg-amber-400/35 dark:hover:bg-amber-400/20",
            },
            {
                variant: "light",
                color: "yellow",
                className: "text-yellow-700 dark:text-yellow-400 border-yellow-500 bg-yellow-400/25 dark:bg-yellow-400/15 hover:bg-yellow-400/35 dark:hover:bg-yellow-400/20",
            },
            {
                variant: "light",
                color: "lime",
                className: "text-lime-700 dark:text-lime-400 border-lime-500 bg-lime-400/25 dark:bg-lime-400/15 hover:bg-lime-400/35 dark:hover:bg-lime-400/20",
            },
            {
                variant: "light",
                color: "green",
                className: "text-green-700 dark:text-green-400 border-green-500 bg-green-400/25 dark:bg-green-400/15 hover:bg-green-400/35 dark:hover:bg-green-400/20",
            },
            {
                variant: "light",
                color: "emerald",
                className: "text-emerald-700 dark:text-emerald-400 border-emerald-500 bg-emerald-400/25 dark:bg-emerald-400/15 hover:bg-emerald-400/35 dark:hover:bg-emerald-400/20",
            },
            {
                variant: "light",
                color: "teal",
                className: "text-teal-700 dark:text-teal-400 border-teal-500 bg-teal-400/25 dark:bg-teal-400/15 hover:bg-teal-400/35 dark:hover:bg-teal-400/20",
            },
            {
                variant: "light",
                color: "cyan",
                className: "text-cyan-700 dark:text-cyan-400 border-cyan-500 bg-cyan-400/25 dark:bg-cyan-400/15 hover:bg-cyan-400/35 dark:hover:bg-cyan-400/20",
            },
            {
                variant: "light",
                color: "sky",
                className: "text-sky-700 dark:text-sky-400 border-sky-500 bg-sky-400/25 dark:bg-sky-400/15 hover:bg-sky-400/35 dark:hover:bg-sky-400/20",
            },
            {
                variant: "light",
                color: "blue",
                className: "text-blue-700 dark:text-blue-400 border-blue-500 bg-blue-400/25 dark:bg-blue-400/15 hover:bg-blue-400/35 dark:hover:bg-blue-400/20",
            },
            {
                variant: "light",
                color: "indigo",
                className: "text-indigo-700 dark:text-indigo-400 border-primary bg-indigo-400/25 dark:bg-indigo-400/15 hover:bg-indigo-400/35 dark:hover:bg-indigo-400/20",
            },
            {
                variant: "light",
                color: "violet",
                className: "text-violet-700 dark:text-violet-400 border-violet-500 bg-violet-400/25 dark:bg-violet-400/15 hover:bg-violet-400/35 dark:hover:bg-violet-400/20",
            },
            {
                variant: "light",
                color: "purple",
                className: "text-purple-700 dark:text-purple-400 border-purple-500 bg-purple-400/25 dark:bg-purple-400/15 hover:bg-purple-400/35 dark:hover:bg-purple-400/20",
            },
            {
                variant: "light",
                color: "fuchsia",
                className: "text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500 bg-fuchsia-400/25 dark:bg-fuchsia-400/15 hover:bg-fuchsia-400/35 dark:hover:bg-fuchsia-400/20",
            },
            {
                variant: "light",
                color: "pink",
                className: "text-pink-700 dark:text-pink-400 border-pink-500 bg-pink-400/25 dark:bg-pink-400/15 hover:bg-pink-400/35 dark:hover:bg-pink-400/20",
            },
            {
                variant: "light",
                color: "rose",
                className: "text-rose-700 dark:text-rose-400 border-rose-500 bg-rose-400/25 dark:bg-rose-400/15 hover:bg-rose-400/35 dark:hover:bg-rose-400/20",
            },
            {
                variant: "glossy",
                color: "white",
                className: "text-black from-white/80 to-white/60",
            },
            {
                variant: "glossy",
                color: "black",
                className: "text-white from-black/70 to-black/50",
            },
            {
                variant: "glossy",
                color: "slate",
                className: "text-slate-700 from-slate-200 to-slate-400",
            },
            {
                variant: "glossy",
                color: "gray",
                className: "text-gray-700 from-gray-200 to-gray-400",
            },
            {
                variant: "glossy",
                color: "zinc",
                className: "text-zinc-700 from-zinc-200 to-zinc-400",
            },
            {
                variant: "glossy",
                color: "neutral",
                className: "text-neutral-700 from-neutral-200 to-neutral-400",
            },
            {
                variant: "glossy",
                color: "stone",
                className: "text-stone-700 from-stone-200 to-stone-400",
            },
            {
                variant: "glossy",
                color: "red",
                className: "text-red-700 from-red-200 to-red-400",
            },
            {
                variant: "glossy",
                color: "orange",
                className: "text-orange-700 from-orange-200 to-orange-400",
            },
            {
                variant: "glossy",
                color: "amber",
                className: "text-amber-700 from-amber-200 to-amber-400",
            },
            {
                variant: "glossy",
                color: "yellow",
                className: "text-yellow-700 from-yellow-200 to-yellow-400",
            },
            {
                variant: "glossy",
                color: "lime",
                className: "text-lime-700 from-lime-200 to-lime-400",
            },
            {
                variant: "glossy",
                color: "green",
                className: "text-green-700 from-green-200 to-green-400",
            },
            {
                variant: "glossy",
                color: "emerald",
                className: "text-emerald-700 from-emerald-200 to-emerald-400",
            },
            {
                variant: "glossy",
                color: "teal",
                className: "text-teal-700 from-teal-200 to-teal-400",
            },
            {
                variant: "glossy",
                color: "cyan",
                className: "text-cyan-700 from-cyan-200 to-cyan-400",
            },
            {
                variant: "glossy",
                color: "sky",
                className: "text-sky-700 from-sky-200 to-sky-400",
            },
            {
                variant: "glossy",
                color: "blue",
                className: "text-blue-700 from-blue-200 to-blue-400",
            },
            {
                variant: "glossy",
                color: "indigo",
                className: "text-indigo-700 from-indigo-200 to-indigo-400",
            },
            {
                variant: "glossy",
                color: "violet",
                className: "text-violet-700 from-violet-200 to-violet-400",
            },
            {
                variant: "glossy",
                color: "purple",
                className: "text-purple-700 from-purple-200 to-purple-400",
            },
            {
                variant: "glossy",
                color: "fuchsia",
                className: "text-fuchsia-700 from-fuchsia-200 to-fuchsia-400",
            },
            {
                variant: "glossy",
                color: "pink",
                className: "text-pink-700 from-pink-200 to-pink-400",
            },
            {
                variant: "glossy",
                color: "rose",
                className: "text-rose-700 from-rose-200 to-rose-400",
            },
            {
                variant: "outline",
                color: "slate",
                className: "text-slate-700 border-slate-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "gray",
                className: "text-gray-700 border-gray-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "zinc",
                className: "text-zinc-700 border-zinc-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "neutral",
                className: "text-neutral-700 border-neutral-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "stone",
                className: "text-stone-700 border-stone-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "red",
                className: "text-red-700 border-red-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "orange",
                className: "text-orange-700 border-orange-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "amber",
                className: "text-amber-700 border-amber-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "yellow",
                className: "text-yellow-700 border-yellow-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "lime",
                className: "text-lime-700 border-lime-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "green",
                className: "text-green-700 border-green-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "emerald",
                className: "text-emerald-700 border-emerald-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "teal",
                className: "text-teal-700 border-teal-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "cyan",
                className: "text-cyan-700 border-cyan-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "sky",
                className: "text-sky-700 border-sky-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "blue",
                className: "text-blue-700 border-blue-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "indigo",
                className: "text-indigo-700 border-primary bg-transparent",
            },
            {
                variant: "outline",
                color: "violet",
                className: "text-violet-700 border-violet-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "purple",
                className: "text-purple-700 border-purple-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "fuchsia",
                className: "text-fuchsia-700 border-fuchsia-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "pink",
                className: "text-pink-700 border-pink-500 bg-transparent",
            },
            {
                variant: "outline",
                color: "rose",
                className: "text-rose-700 border-rose-500 bg-transparent",
            },
        ],
        defaultVariants: {
            variant: "default",
            color: "slate",
            size: "md",
            radius: "rounded",
        }
    }
)

export interface ChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
    variant?: VariantProps<typeof chipVariants>["variant"];
    color?: VariantProps<typeof chipVariants>["color"];
    size?: VariantProps<typeof chipVariants>["size"];
    radius?: VariantProps<typeof chipVariants>["radius"];
    border?: VariantProps<typeof chipVariants>["border"];
}

function Chip({ children, className, variant, color, size, radius, border, ...props }: ChipProps) {
    return (
        <span className={cn(chipVariants({ variant, color, size, radius, border, className }))} {...props}>
            {children}
        </span>
    )
}

export { Chip, chipVariants }