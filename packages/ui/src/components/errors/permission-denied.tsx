"use client"
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card'

interface PermissionDeniedProps {
    title?: string
    message?: string
    className?: string,
    goBack?: () => void
}

const PermissionDenied = ({
    title = "Permission Required",
    message = "You don't have permission to access this resource.",
    className = "",
    goBack
}: PermissionDeniedProps) => {

    return (
        <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
                        <ShieldX className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">{message}</p>
                    <div className="text-sm text-muted-foreground/80">
                        <p>Error Code: 403 - Forbidden</p>
                    </div>
                    {goBack && (
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={goBack}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default PermissionDenied 