import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { cn } from '@repo/ui/lib/utils'
import { Copy, Check, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "./tooltip"
import { toast } from "sonner"

interface CopyToClipboardProps {
    getValue: () => string
    className?: string
    variant?: "link" | "default" | "outline" | "secondary" | "ghost" | "destructive" | "gradient" | "add" | null
    text?: string
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-sm"
    tooltip?: string
}

const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch (err) {
            console.warn('navigator.clipboard failed, trying fallback:', err)
        }
    }

    // Fallback: document.execCommand('copy')
    try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed" // Avoid scrolling to bottom
        textArea.style.top = "0"
        textArea.style.left = "0"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) return true
        throw new Error('execCommand copy returned false')
    } catch (err) {
        console.error('Fallback copy failed:', err)
        return false
    }
}

const CopyToClipboard = ({ getValue, className, variant, text, size, tooltip }: CopyToClipboardProps) => {
    const [copyState, setCopyState] = useState<'idle' | 'loading' | 'copied'>('idle')
    const [open, setOpen] = useState(false)

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()

        const valueToCopy = getValue()
        if (!valueToCopy) {
            toast.error('Nothing to copy')
            return
        }

        try {
            setCopyState('loading')
            setOpen(true)
            
            const success = await copyTextToClipboard(valueToCopy)
            
            if (success) {
                // Save to localStorage for the Device Login paste helper
                if (tooltip) {
                    const tooltipLower = tooltip.toLowerCase()
                    if (tooltipLower.includes('device id')) {
                        localStorage.setItem('copied_device_id', valueToCopy)
                    } else if (tooltipLower.includes('device secret')) {
                        localStorage.setItem('copied_device_secret', valueToCopy)
                    }
                }

                // Wait 1 second (1000ms) with the loader spinning
                setTimeout(() => {
                    setCopyState('copied')
                    
                    // Format dynamic toast success message
                    const successMsg = tooltip ? `${tooltip.replace(/^Copy\s+/i, '')} copied!` : 'Copied to clipboard!'
                    const formattedMsg = successMsg.charAt(0).toUpperCase() + successMsg.slice(1)
                    toast.success(formattedMsg)
                }, 1000)
            } else {
                toast.error('Failed to copy to clipboard')
                setCopyState('idle')
            }
        } catch (error) {
            console.log('error copying to clipboard', error)
            setCopyState('idle')
        }
    }

    useEffect(() => {
        if (copyState !== 'copied') return
        const timeout = setTimeout(() => {
            setCopyState('idle')
            setOpen(false)
        }, 2000)

        return () => clearTimeout(timeout)
    }, [copyState])

    const isCopied = copyState === 'copied'
    const isLoading = copyState === 'loading'

    return (
        <TooltipProvider>
            <Tooltip
                open={open}
                onOpenChange={(isOpen) => {
                    if (copyState === 'idle') {
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
                            disabled={isLoading}
                            className={cn(
                                'relative flex items-center justify-center overflow-hidden transition-all duration-300',
                                isLoading
                                    ? 'cursor-wait opacity-80'
                                    : 'active:scale-90',
                                className
                            )}
                        >
                            <span className="relative flex items-center justify-center size-3.5 shrink-0">
                                {/* Copy Icon */}
                                <span
                                    className={cn(
                                        "absolute inset-0 flex items-center justify-center transition-all duration-300 transform",
                                        copyState === 'idle'
                                            ? "scale-100 rotate-0 opacity-100"
                                            : "scale-0 rotate-90 opacity-0"
                                    )}
                                >
                                    <Copy strokeWidth={2} className="size-3.5" />
                                </span>
                                
                                {/* Loader Icon */}
                                <span
                                    className={cn(
                                        "absolute inset-0 flex items-center justify-center transition-all duration-300 transform",
                                        isLoading
                                            ? "scale-100 rotate-0 opacity-100"
                                            : "scale-0 -rotate-90 opacity-0"
                                    )}
                                >
                                    <Loader2 strokeWidth={2} className="size-3.5 animate-spin text-primary" />
                                </span>

                                {/* Check Icon */}
                                <span
                                    className={cn(
                                        "absolute inset-0 flex items-center justify-center transition-all duration-300 transform",
                                        isCopied
                                            ? "scale-100 rotate-0 opacity-100"
                                            : "scale-0 -rotate-90 opacity-0"
                                    )}
                                >
                                    <Check strokeWidth={2} className="size-3.5 text-emerald-500" />
                                </span>
                            </span>
                            {text && <span className="ml-2">{text}</span>}
                            <span className="sr-only">Copy</span>
                        </Button>
                    }
                />
                {(tooltip || isCopied) && (
                    <TooltipContent>
                        <p className='mb-0'>{isCopied ? 'Copied to clipboard!' : tooltip}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    )
}

export default CopyToClipboard

