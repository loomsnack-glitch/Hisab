"use client"

import React, { useEffect } from 'react'
import type { ServiceResponse } from "@repo/types"
import EmptyError from "./errors/empty-error"
import EmptyNotFound from "./errors/empty-not-found"
import { cn } from "@repo/ui/lib/utils"
import { toast } from "sonner"

interface QueryStateBoundaryProps<T> {
    /**
     * The data returned from the query (ServiceResponse)
     */
    data?: ServiceResponse<T> | null
    /**
     * Loading state
     */
    isLoading: boolean
    /**
     * Error object if the query failed
     */
    error?: any
    /**
     * Refetch function for retry actions
     */
    refetch?: () => void
    /**
     * Fetching state (for loading spinner on retry)
     */
    isFetching?: boolean
    /**
     * Skeleton or loading component to show while isLoading is true
     */
    skeleton?: React.ReactNode
    /**
     * Props to customize the Not Found state
     */
    notFoundProps?: {
        title?: string
        message?: string
    }
    /**
     * Action for the "Go Back" button
     */
    onGoBack?: () => void
    /**
     * Whether to show an error toast automatically. Defaults to true.
     */
    showToast?: boolean
    /**
     * Children as a function that receives the unwrapped data
     */
    children: (data: NonNullable<T>) => React.ReactNode
    /**
     * Additional className for the container (when showing error/not-found)
     */
    className?: string
}

/**
 * A higher-order component that simplifies handling multiple query states:
 * Loading -> Skeleton
 * Error -> EmptyError + Toast
 * Not Found -> EmptyNotFound
 * Success -> Children(data)
 */
export function QueryStateBoundary<T>({
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    skeleton,
    notFoundProps,
    onGoBack,
    showToast = true,
    children,
    className
}: QueryStateBoundaryProps<T>) {

    // Resolve error message
    const serviceError = data?.status === 'error' ? data : null
    const effectiveError = error || serviceError

    // Handle automatic toast
    useEffect(() => {
        if (effectiveError && showToast) {
            const message = effectiveError.message || "An unexpected error occurred"
            toast.error(message)
        }
    }, [effectiveError, showToast])

    // 1. Loading State
    if (isLoading) {
        return <>{skeleton || <div className="w-full h-40 animate-pulse bg-muted rounded-xl" />}</>
    }

    // 2. Error State
    if (effectiveError) {
        return (
            <div className={cn("w-full flex items-center justify-center", className)}>
                <EmptyError
                    serviceResponse={(data as any) || (error as any)}
                    refetch={refetch}
                    isFetching={isFetching}
                    goBack={onGoBack}
                />
            </div>
        )
    }

    // 3. Not Found State (Success but no data)
    if (!data?.data) {
        return (
            <div className={cn("w-full flex items-center justify-center", className)}>
                <EmptyNotFound
                    title={notFoundProps?.title}
                    message={notFoundProps?.message}
                    refetch={refetch}
                    isFetching={isFetching}
                    goBack={onGoBack}
                />
            </div>
        )
    }

    // 4. Success State
    return <>{children(data.data as NonNullable<T>)}</>
}
