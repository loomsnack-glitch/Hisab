"use client"

import { ArrowLeft, Search, RefreshCcw, Home, Ghost, Map } from "lucide-react"
import { Button } from "../button"
import { cn } from "@repo/ui/lib/utils"

interface EmptyNotFoundProps {
    title?: string
    message?: string
    refetch?: () => void
    isFetching?: boolean
    goBack?: () => void
    goHome?: () => void
    className?: string
}

const EmptyNotFound = ({
    title = "Content Not Found",
    message = "We couldn't find what you were looking for. It might have been moved or deleted.",
    refetch,
    isFetching,
    goBack,
    goHome,
    className
}: EmptyNotFoundProps) => {
    return (
        <div className={cn(
            "w-full min-h-[60vh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-12",
            className
        )}>
            {/* Background Pattern - Exploration/Lost Feel */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Dot grid pattern */}
                <div className="absolute inset-0 opacity-[0.1] dark:opacity-[0.2]"
                    style={{
                        backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }}
                />

                {/* Blue/Indigo glow */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />

                {/* Subtle map-like topographic curves (represented as faint borders) */}
                <div className="absolute top-1/4 -left-10 w-64 h-64 border border-indigo-500/10 rounded-full" />
                <div className="absolute top-1/4 -left-20 w-80 h-80 border border-indigo-500/5 rounded-full" />
                <div className="absolute bottom-1/4 -right-10 w-64 h-64 border border-indigo-500/10 rounded-full" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
                {/* Animated Search/Ghost Icon */}
                <div className="relative mb-8">
                    {/* Floating animation container */}
                    <div className="relative animate-bounce" style={{ animationDuration: '4s', animationTimingFunction: 'ease-in-out' }}>
                        {/* Main icon container */}
                        <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-4 ring-indigo-500/20 rotate-3">
                            <Ghost className="w-12 h-12 text-white drop-shadow-lg" />
                        </div>

                        {/* Orbiting magnifying glass */}
                        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center -rotate-12 border-2 border-indigo-100 dark:border-indigo-900">
                            <Search className="w-5 h-5 text-indigo-600" />
                        </div>
                    </div>

                    {/* Shadow underneath */}
                    <div className="w-16 h-2 bg-black/10 dark:bg-black/20 rounded-full blur-sm mx-auto mt-4 scale-x-125 animate-pulse" />
                </div>

                {/* Badge/Label */}
                <div className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm uppercase tracking-widest">
                    <Map className="w-4 h-4" />
                    <span>404 Not Found</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3 tracking-tight">
                    {title}
                </h1>

                {/* Description */}
                <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    {goBack && (
                        <Button
                            variant="outline"
                            size="lg"
                            className="gap-2 px-6 border-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                            onClick={goBack}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                    )}

                    {refetch && (
                        <Button
                            size="lg"
                            className="gap-2 px-6 bg-linear-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 border-0 shadow-lg shadow-indigo-500/25 transition-all"
                            onClick={() => refetch?.()}
                            disabled={isFetching}
                        >
                            <RefreshCcw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                            {isFetching ? "Searching..." : "Try Again"}
                        </Button>
                    )}

                    {goHome && (
                        <Button
                            variant="ghost"
                            size="lg"
                            className="gap-2 px-6 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400"
                            onClick={goHome}
                        >
                            <Home className="w-4 h-4" />
                            Home
                        </Button>
                    )}
                </div>

                {/* Footer Help */}
                <div className="mt-12 pt-6 border-t border-border/50 w-full text-center">
                    <p className="text-xs text-muted-foreground">
                        If you think this is a mistake, please <span className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer">report a bug</span>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default EmptyNotFound
