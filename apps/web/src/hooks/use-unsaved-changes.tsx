import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { AlertCircle } from "lucide-react";

export interface UseUnsavedChangesProps {
    isDirty: boolean;
    onSave: () => Promise<boolean | void> | boolean | void;
    onDiscard: () => void;
}

export function useUnsavedChanges({ isDirty, onSave, onDiscard }: UseUnsavedChangesProps) {
    // State to hold local confirmation callbacks (e.g. closing a dialog/modal)
    const [localProceed, setLocalProceed] = useState<(() => void) | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Native browser protection (beforeunload)
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isDirty]);

    // 2. SPA Router protection
    const blocker = useBlocker(
        ({ currentValue, nextLocation }) =>
            isDirty && currentValue.pathname !== nextLocation.pathname
    );

    const isBlocked = blocker.state === "blocked" || localProceed !== null;

    const handleStay = () => {
        if (blocker.state === "blocked") {
            blocker.reset();
        }
        setLocalProceed(null);
    };

    const handleDiscard = () => {
        onDiscard();
        if (blocker.state === "blocked") {
            blocker.proceed();
        }
        if (localProceed) {
            localProceed();
            setLocalProceed(null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await onSave();
            if (success !== false) {
                // Save succeeded, proceed with navigation
                if (blocker.state === "blocked") {
                    blocker.proceed();
                }
                if (localProceed) {
                    localProceed();
                    setLocalProceed(null);
                }
            }
        } catch (error) {
            console.error("Failed to save changes:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Expose a method to intercept local actions (e.g., closing a dialog component)
    const interceptClose = (proceedCallback: () => void) => {
        if (isDirty) {
            setLocalProceed(() => proceedCallback);
        } else {
            proceedCallback();
        }
    };

    const AlertDialogComponent = (
        <AlertDialog open={isBlocked} onOpenChange={(open) => { if (!open) handleStay(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="size-5" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Do you want to save them before leaving?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={handleStay}
                        disabled={isSaving}
                    >
                        Stay on page
                    </Button>
                    <Button
                        variant="destructive"
                        className="rounded-xl"
                        onClick={handleDiscard}
                        disabled={isSaving}
                    >
                        Discard
                    </Button>
                    <Button
                        variant="default"
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleSave}
                        isLoading={isSaving}
                        loadingText="Saving..."
                    >
                        Save
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return {
        AlertDialogComponent,
        interceptClose,
        isBlocked,
    };
}
