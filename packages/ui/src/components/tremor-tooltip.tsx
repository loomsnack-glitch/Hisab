"use client"

import { type JSXElementConstructor, type ReactElement } from "react"
import { Tooltip as TooltipComponent, TooltipContent, TooltipTrigger } from "./tooltip"

interface TooltipProps {
    children: ReactElement<unknown, string | JSXElementConstructor<any>> | undefined
    content: React.ReactNode
    triggerAsChild?: boolean
    tooltipProps?: React.ComponentProps<typeof TooltipComponent>
    tooltipContentProps?: React.ComponentProps<typeof TooltipContent>
    tooltipTriggerProps?: React.ComponentProps<typeof TooltipTrigger>
}

const Tooltip = ({
    children,
    content,
    triggerAsChild = false,
    tooltipProps,
    tooltipContentProps,
    tooltipTriggerProps,
}: TooltipProps) => {
    return (
        <TooltipComponent {...tooltipProps}>
            {triggerAsChild ? <TooltipTrigger render={children} {...tooltipTriggerProps} /> : <TooltipTrigger {...tooltipTriggerProps}>{children}</TooltipTrigger>}
            <TooltipContent {...tooltipContentProps}>
                {content}
            </TooltipContent>
        </TooltipComponent>
    )
}

export default Tooltip
