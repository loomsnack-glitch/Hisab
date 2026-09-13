import { useEffect, useMemo, useState } from "react";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@repo/ui/components/dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { ExternalLink, Eye, EyeOff, KeyRound, RotateCcw } from "lucide-react";

import { getPosLoginUrl } from "@/lib/pos-origin";

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
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<KeyRound className="size-5" />} title="Device secret" subtitle={deviceName} />

                {isLoading ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <Spinner className="size-6 text-primary" />
                    </div>
                ) : errorMessage ? (
                    <div className="space-y-4">
                        <p className="text-sm text-destructive">{errorMessage}</p>
                        {onRetry ? (
                            <Button type="button" variant="outline" className="rounded-xl" onClick={onRetry}>
                                <RotateCcw className="size-4" />
                                Try again
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground">Business username</p>
                                <code className="break-all font-mono text-sm text-foreground">{organizationUsername}</code>
                            </div>
                            <CopyToClipboard
                                getValue={() => organizationUsername}
                                tooltip="Copy business username"
                                showTooltip={false}
                                variant="outline"
                                size="icon-sm"
                                className="rounded-lg"
                            />
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-muted-foreground">Device username</p>
                                <code className="break-all font-mono text-sm text-foreground">{deviceLoginUsername}</code>
                            </div>
                            <CopyToClipboard
                                getValue={() => deviceLoginUsername}
                                tooltip="Copy device username"
                                showTooltip={false}
                                variant="outline"
                                size="icon-sm"
                                className="rounded-lg"
                            />
                        </div>

                        <div className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Device secret</p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    aria-label={isVisible ? "Hide device secret" : "Show device secret"}
                                    onClick={() => setIsVisible((value) => !value)}
                                >
                                    {isVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
                                    {isVisible ? deviceSecret : maskedSecret}
                                </code>
                                {deviceSecret ? (
                                    <CopyToClipboard
                                        getValue={() => deviceSecret}
                                        tooltip="Copy device secret"
                                        showTooltip={false}
                                        variant="outline"
                                        size="icon-sm"
                                        className="rounded-lg"
                                    />
                                ) : null}
                            </div>
                        </div>

                        {isVisible && deviceSecret ? (
                            <CopyToClipboard
                                getValue={() => setupDetails}
                                text="Copy all"
                                tooltip="Copy all"
                                showTooltip={false}
                                variant="outline"
                                size="sm"
                                className="w-full rounded-xl"
                            />
                        ) : null}
                    </div>
                )}

                <DialogFooter>
                    {canOpenPos ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            render={
                                <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={getPosLoginUrl({
                                        organizationUsername,
                                        deviceUsername: deviceLoginUsername,
                                    })}
                                />
                            }
                        >
                            <ExternalLink className="size-4" />
                            Open POS
                        </Button>
                    ) : null}
                    <Button
                        type="button"
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
