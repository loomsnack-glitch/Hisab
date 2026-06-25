import { useEffect, useMemo, useState } from "react";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";

type DeviceSecretDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deviceName: string;
    deviceSecret?: string;
    isLoading?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
};

const DeviceSecretDialog = ({
    open,
    onOpenChange,
    deviceName,
    deviceSecret,
    isLoading = false,
    errorMessage,
    onRetry,
}: DeviceSecretDialogProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setIsVisible(false);
        }
    }, [open, deviceSecret]);

    const maskedSecret = useMemo(() => {
        if (!deviceSecret) {
            return "********";
        }

        return "*".repeat(Math.max(deviceSecret.length, 8));
    }, [deviceSecret]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <KeyRound className="size-4 text-primary" />
                        Device secret
                    </DialogTitle>
                    <DialogDescription>
                        The secret for <span className="font-medium text-foreground">{deviceName}</span> is hidden by
                        default. Reveal it only when you need to connect or troubleshoot a POS terminal.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex min-h-48 items-center justify-center">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Spinner className="size-5 text-primary" />
                            Loading device secret...
                        </div>
                    </div>
                ) : errorMessage ? (
                    <Alert variant="warning">
                        <TriangleAlert />
                        <AlertTitle>Unable to display this secret</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <Alert>
                            <ShieldCheck />
                            <AlertTitle>Privacy mode is enabled</AlertTitle>
                            <AlertDescription>
                                Use the eye button to reveal the value. Keep it hidden when other people can see your
                                screen.
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-3xl border border-border/70 bg-muted/40 p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                        Stored device secret
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Reveal only when you are about to configure the physical device.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => setIsVisible((value) => !value)}
                                >
                                    {isVisible ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
                                    {isVisible ? "Hide" : "Show"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 p-3">
                                <code className="flex-1 break-all font-mono text-sm text-foreground">
                                    {isVisible ? deviceSecret : maskedSecret}
                                </code>
                                {deviceSecret ? (
                                    <CopyToClipboard
                                        getValue={() => deviceSecret}
                                        tooltip="Copy device secret"
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-full"
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-0 bg-transparent p-0 sm:flex-row sm:justify-between">
                    {errorMessage && onRetry ? (
                        <Button type="button" variant="outline" className="rounded-full" onClick={onRetry}>
                            <RotateCcw className="mr-2 size-4" />
                            Try again
                        </Button>
                    ) : (
                        <div />
                    )}

                    <Button
                        type="button"
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeviceSecretDialog;
