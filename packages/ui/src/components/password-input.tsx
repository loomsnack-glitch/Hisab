import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "./input"
import { Button } from "./button"
import { cn } from "@repo/ui/lib/utils"

export interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: "default" | "ring" | "ringShadow"
    visibilityLabel?: { show: string; hide: string }
    trailingContent?: React.ReactNode
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, visibilityLabel, trailingContent, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false)
        const label = visibilityLabel ?? { show: "Show password", hide: "Hide password" }

        return (
            <div className="relative">
                <Input
                    type={showPassword ? "text" : "password"}
                    className={cn(trailingContent ? "pr-28" : "pr-10", className)}
                    ref={ref}
                    {...props}
                />
                {trailingContent && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center">
                        {trailingContent}
                    </div>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? label.hide : label.show}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                        {showPassword ? label.hide : label.show}
                    </span>
                </Button>
            </div>
        )
    }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
