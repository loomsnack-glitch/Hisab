import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { cn } from '@repo/ui/lib/utils'
import { Copy, Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "./tooltip"

interface CopyToClipboardProps {
    getValue: () => string
    className?: string
    variant?: "link" | "default" | "outline" | "secondary" | "ghost" | "destructive" | "gradient" | "add" | null
    text?: string
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-sm"
    tooltip?: string
}

const CopyToClipboard = ({ getValue, className, variant, text, size, tooltip }: CopyToClipboardProps) => {
    const [copied, setCopied] = useState(false)
    const [open, setOpen] = useState(false)

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (!navigator.clipboard) {
            console.log('no access to clipboard')
            return
        }

        try {
            await navigator.clipboard.writeText(getValue())
            setCopied(true)
            setOpen(true)
        } catch (error) {
            console.log('error copying to clipboard', error)
        }
    }

    useEffect(() => {
        if (!copied) return
        const timeout = setTimeout(() => {
            setCopied(false)
            setOpen(false)
        }, 2000)

        return () => clearTimeout(timeout)
    }, [copied])

    return (
        <TooltipProvider>
            <Tooltip
                open={open}
                onOpenChange={(isOpen) => {
                    if (!copied) {
                        setOpen(isOpen)
                    }
                }}
            >
                <TooltipTrigger
                    render={
                        <Button
                            onClick={(e) => handleCopy(e)}
                            type='button'
                            size={size || 'icon'}
                            variant={variant || "ghost"}
                            className={cn('flex items-center justify-center', className)}
                        >
                            {copied ? <Check size={14} className="text-primary" /> : <Copy absoluteStrokeWidth={false} size={14} />}
                            {text && <span className="ml-2">{text}</span>}
                            <span className="sr-only">Copy</span>
                        </Button>
                    }
                />
                {(tooltip || copied) && (
                    <TooltipContent>
                        <p className='mb-0'>{copied ? 'Copied to clipboard!' : tooltip}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    )
}

export default CopyToClipboard