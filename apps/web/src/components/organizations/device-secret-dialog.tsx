import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { ExternalLink, Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";

type DeviceSecretDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationUsername: string;
    deviceLoginUsername: string;
    deviceName: string;
    canOpenPos: boolean;
    deviceSecret?: string;
    isLoading?: boolean;
    errorMessage?: string;
    onRetry?: () => void;
};

const DeviceSecretDialog = ({
    open,
    onOpenChange,
    organizationUsername,
    deviceLoginUsername,
    deviceName,
    canOpenPos,
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

    const setupDetails = useMemo(
        () => `Business username: ${organizationUsername}\nDevice username: ${deviceLoginUsername}\nDevice secret: ${deviceSecret ?? ""}`,
        [deviceLoginUsername, deviceSecret, organizationUsername],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader
                    icon={<KeyRound className="size-5 transition-transform duration-300" />}
                    title="POS setup"
                    subtitle={<>Use these details to connect <span className="font-semibold text-foreground">{deviceName}</span> to the POS.</>}
                />

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
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                POS login details
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground">Business username</p>
                                        <code className="break-all font-mono text-sm text-foreground">{organizationUsername}</code>
                                    </div>
                                    <CopyToClipboard
                                        getValue={() => organizationUsername}
                                        tooltip="Copy business username"
                                        showTooltip={false}
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-full"
                                    />
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground">Device username</p>
                                        <code className="break-all font-mono text-sm text-foreground">{deviceLoginUsername}</code>
                                    </div>
                                    <CopyToClipboard
                                        getValue={() => deviceLoginUsername}
                                        tooltip="Copy device username"
                                        showTooltip={false}
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-full"
                                    />
                                </div>
                            </div>
                        </div>

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
                                        showTooltip={false}
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-full"
                                    />
                                ) : null}
                            </div>

                            {isVisible && deviceSecret ? (
                                <CopyToClipboard
                                    getValue={() => setupDetails}
                                    text="Copy all setup details"
                                    tooltip="Copy all setup details"
                                    showTooltip={false}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 w-full rounded-full"
                                />
                            ) : null}
                        </div>
                    </div>
                )}

                <DialogFooter className="sm:justify-between">
                    {errorMessage && onRetry ? (
                        <Button type="button" variant="outline" className="rounded-full" onClick={onRetry}>
                            <RotateCcw className="mr-2 size-4" />
                            Try again
                        </Button>
                    ) : (
                        <div />
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {canOpenPos ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                render={
                                    <Link
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        to={`/pos/login?org=${encodeURIComponent(organizationUsername)}&device=${encodeURIComponent(deviceLoginUsername)}`}
                                    />
                                }
                            >
                                <ExternalLink className="mr-2 size-4" />
                                Open POS
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeviceSecretDialog;
