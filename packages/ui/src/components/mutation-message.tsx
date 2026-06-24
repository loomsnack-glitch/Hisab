import { cn } from "@repo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ComponentProps } from "react";

// Generic types for mutation data and error that can have a message property
type MutationDataWithMessage = {
    message?: string;
    [key: string]: unknown;
}

type MutationErrorWithMessage = {
    message?: string;
    [key: string]: unknown;
}

type ShowWhenType = 'isPending' | 'isError' | 'isSuccess';

interface MutationMessageProps<TData = unknown, TError = unknown, TVariables = unknown, TContext = unknown> extends ComponentProps<"p"> {
    mutation?: UseMutationResult<TData, TError, TVariables, TContext> | null;
    className?: string;
    showWhen?: ShowWhenType[];
}

const MutationMessage = <TData = unknown, TError = unknown, TVariables = unknown, TContext = unknown>({
    mutation,
    className,
    showWhen = ['isError'],
    ...props
}: MutationMessageProps<TData, TError, TVariables, TContext>) => {
    if (!mutation) {
        return null;
    }
    const isError = mutation.isError || false;
    const isSuccess = mutation.isSuccess || false;
    if (showWhen.every(item => !mutation[item])) {
        return null;
    }

    // Extract message from error
    const errorMessage = isError && mutation.error && typeof mutation.error === 'object'
        ? (mutation.error as MutationErrorWithMessage).message
        : null;

    // Extract message from success data (handle ServiceResponse structure)
    const successMessage = isSuccess && mutation.data && typeof mutation.data === 'object'
        ? (mutation.data as MutationDataWithMessage).message
        : null;

    return (
        <p
            className={cn(" text-sm", isError && "text-destructive", isSuccess && "text-green-500", className)}
            {...props}
        >
            {isError && errorMessage && errorMessage}
            {isSuccess && successMessage && successMessage}
        </p>
    )
}
export default MutationMessage
