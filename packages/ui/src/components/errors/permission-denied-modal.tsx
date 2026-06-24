"use client"
import { ShieldX } from 'lucide-react'
import { Button } from '@repo/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@repo/ui/components/dialog"

interface PermissionDeniedDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    message?: string
    action?: string
}

const PermissionDeniedDialog = ({
    open,
    onOpenChange,
    title = "Permission Required",
    message = "You don't have permission to perform this action.",
    action = "perform this action"
}: PermissionDeniedDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 w-fit">
                        <ShieldX className="h-8 w-8 text-red-600" />
                    </div>
                    <DialogTitle className="text-xl font-semibold text-center capitalize">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-center gap-y-2">
                        <span>{message}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                            Contact your administrator to get the required permissions to {action}.
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end py-2 px-4">
                    <Button onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default PermissionDeniedDialog 