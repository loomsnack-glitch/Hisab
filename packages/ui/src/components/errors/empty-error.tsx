"use client"

import { ArrowLeft, AlertCircle, Copy, ChevronDown, ChevronUp, CheckCircle2, RefreshCcw, Bug, Code2, XCircle, TriangleAlert } from "lucide-react"
import { Button } from "../button"
import { useState } from "react"
import { toast } from "sonner"
import type { ServiceResponse } from "@repo/types"
import { cn } from "@repo/ui/lib/utils"

// Local type definitions
type ErrorResponse = {
    message: string;
    [key: string]: unknown;
}

interface EmptyErrorProps<T = unknown> {
    title?: string
    message?: string
    refetch?: () => void
    isFetching?: boolean
    goBack?: () => void
    serviceResponse?: ServiceResponse<T>
    status?: 'success' | 'error'
    code?: number
    data?: T
    error?: ErrorResponse
    errors?: ErrorResponse[]
    className?: string
}

const EmptyError = <T,>({
    title,
    message,
    refetch,
    isFetching,
    goBack,
    serviceResponse,
    status,
    code,
    data,
    error,
    errors,
    className
}: EmptyErrorProps<T>) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [copied, setCopied] = useState(false)

    // Resolve values
    const errorStatus = serviceResponse?.status || status || 'error'
    const errorCode = serviceResponse?.code || code
    const errorMessage = serviceResponse?.message || message || 'An unexpected error occurred'
    const errorData = serviceResponse?.data || data
    const singleError = serviceResponse?.error || error
    const errorArray = serviceResponse?.errors || errors

    const displayTitle = title || errorMessage
    const hasDetailedErrors = serviceResponse?.status === 'error' || singleError || (errorArray && errorArray.length > 0) || errorData

    // Build complete error object for copying
    const fullErrorDetails = {
        status: errorStatus,
        code: errorCode,
        message: errorMessage,
        ...(errorData && { data: errorData }),
        ...(singleError && { error: singleError }),
        ...(errorArray && errorArray.length > 0 && { errors: errorArray }),
        timestamp: new Date().toISOString()
    }

    const handleCopyError = async () => {
        try {
            const errorText = JSON.stringify(fullErrorDetails, null, 2)
            await navigator.clipboard.writeText(errorText)
            setCopied(true)
            toast.success("Error details copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error("Failed to copy error details")
        }
    }

    const getErrorTypeLabel = (code?: number) => {
        if (!code) return "Error"
        if (code >= 500) return "Server Error"
        if (code === 404) return "Not Found"
        if (code === 403) return "Access Denied"
        if (code === 401) return "Unauthorized"
        if (code === 400) return "Bad Request"
        if (code >= 400) return "Request Failed"
        return "Error"
    }

    return (
        <div className={cn(
            "w-full min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-12",
            className
        )}>
            {/* Background Pattern - Danger Zone Feel */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Diagonal stripes pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
                    style={{
                        backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 20px,
                            currentColor 20px,
                            currentColor 22px
                        )`
                    }}
                />
                {/* Red glow from top */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-500/10 dark:bg-red-500/5 rounded-full blur-3xl" />
                {/* Subtle corner accents */}
                <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-red-500/20 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-red-500/20 rounded-tr-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-red-500/20 rounded-br-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-red-500/20 rounded-bl-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
                {/* Animated Error Icon */}
                <div className="relative mb-8">
                    {/* Pulsing rings */}
                    <div className="absolute inset-0 w-24 h-24 -m-4">
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute inset-2 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                    </div>
                    {/* Main icon container */}
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 flex items-center justify-center shadow-2xl shadow-red-500/30 ring-4 ring-red-500/20">
                        <XCircle className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    {/* Status code badge */}
                    {errorCode && (
                        <div className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg shadow-lg">
                            {errorCode}
                        </div>
                    )}
                </div>

                {/* Error Type Label */}
                {errorCode && (
                    <div className="mb-4 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm uppercase tracking-widest">
                        <TriangleAlert className="w-4 h-4" />
                        <span>{getErrorTypeLabel(errorCode)}</span>
                    </div>
                )}

                {/* Error Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3 tracking-tight">
                    {displayTitle}
                </h1>

                {/* Error Description */}
                <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
                    {message || "We encountered a problem processing your request. Please try again or contact support if the issue persists."}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap justify-center mb-10">
                    {goBack && (
                        <Button
                            variant="outline"
                            size="lg"
                            className="gap-2 px-6 border-2 hover:bg-muted/50"
                            onClick={goBack}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                    )}
                    {refetch && (
                        <Button
                            size="lg"
                            className="gap-2 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-0 shadow-lg shadow-red-500/25"
                            onClick={() => refetch?.()}
                            disabled={isFetching}
                        >
                            <RefreshCcw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                            {isFetching ? "Retrying..." : "Try Again"}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="lg"
                        className="gap-2 px-6 text-muted-foreground hover:text-foreground"
                        onClick={handleCopyError}
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copy Error
                            </>
                        )}
                    </Button>
                </div>

                {/* Technical Details - Expandable */}
                {hasDetailedErrors && (
                    <div className="w-full">
                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <Bug className="w-4 h-4" />
                            <span className="font-medium">
                                {isExpanded ? "Hide" : "Show"} Technical Details
                            </span>
                            {errorArray && errorArray.length > 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                    {errorArray.length}
                                </span>
                            )}
                            <ChevronDown className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                isExpanded && "rotate-180"
                            )} />
                        </button>

                        {/* Expandable Content */}
                        <div className={cn(
                            "overflow-hidden transition-all duration-300 ease-out",
                            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            <div className="pt-4 space-y-6">
                                {/* Validation Errors */}
                                {errorArray && errorArray.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Issues Found ({errorArray.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {errorArray.map((err: ErrorResponse, index: number) => (
                                                <div
                                                    key={index}
                                                    className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50"
                                                >
                                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-medium">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                                            {err.message}
                                                        </p>
                                                        {Object.keys(err).filter(k => k !== 'message').length > 0 && (
                                                            <div className="mt-2 text-xs font-mono text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 rounded p-2 overflow-x-auto">
                                                                {Object.entries(err)
                                                                    .filter(([key]) => key !== 'message')
                                                                    .map(([key, value]) => (
                                                                        <div key={key} className="flex gap-2">
                                                                            <span className="text-red-400 dark:text-red-500">{key}:</span>
                                                                            <span>{JSON.stringify(value)}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Single Error */}
                                {singleError && (
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Error Details
                                        </h3>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                                                {JSON.stringify(singleError, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Full Response - Code Block Style */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Code2 className="w-3.5 h-3.5" />
                                        Debug Information
                                    </h3>
                                    <div className="rounded-xl overflow-hidden border border-gray-800 dark:border-gray-700">
                                        {/* Code block header */}
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono ml-2">error_response.json</span>
                                        </div>
                                        {/* Code content */}
                                        <div className="p-4 bg-gray-900 dark:bg-gray-950 overflow-x-auto">
                                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                                                <code className="text-gray-300">
                                                    {JSON.stringify(fullErrorDetails, null, 2)}
                                                </code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Help Text */}
                <div className="mt-8 pt-6 border-t border-border/50 w-full text-center">
                    <p className="text-xs text-muted-foreground">
                        Need help? Copy the error details and contact our{" "}
                        <span className="text-foreground font-medium">support team</span>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default EmptyError