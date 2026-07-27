import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getStoreDeviceSecret } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";

import DeviceSecretDialog from "@/components/organizations/device-secret-dialog";

type RevealDeviceSecretButtonProps = {
    organizationId: string;
    storeId: string;
    deviceId: string;
    organizationUsername: string;
    deviceLoginUsername: string;
    deviceName: string;
    canOpenPos: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactElement;
};

const RevealDeviceSecretButton = ({
    organizationId,
    storeId,
    deviceId,
    organizationUsername,
    deviceLoginUsername,
    deviceName,
    canOpenPos,
    open: controlledOpen,
    onOpenChange,
    trigger,
}: RevealDeviceSecretButtonProps) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const secretMutation = useMutation({
        mutationFn: () => getStoreDeviceSecret(organizationId, storeId, deviceId),
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to load device secret");
        },
    });

    useEffect(() => {
        if (open) {
            secretMutation.reset();
            secretMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const response = secretMutation.data;
    const errorMessage = response?.status === "error" ? response.message : secretMutation.error?.message;
    const deviceSecret = response?.status === "success" ? response.data?.deviceSecret : undefined;

    return (
        <>
            {isControlled ? null : trigger ?? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setOpen(true)}
                >
                    <Eye className="mr-2 size-4" />
                    Show device secret
                </Button>
            )}

            <DeviceSecretDialog
                open={open}
                onOpenChange={setOpen}
                organizationUsername={organizationUsername}
                deviceLoginUsername={deviceLoginUsername}
                deviceName={deviceName}
                canOpenPos={canOpenPos}
                deviceSecret={deviceSecret}
                isLoading={secretMutation.isPending}
                errorMessage={errorMessage}
                onRetry={() => secretMutation.mutate()}
            />
        </>
    );
};

export default RevealDeviceSecretButton;
