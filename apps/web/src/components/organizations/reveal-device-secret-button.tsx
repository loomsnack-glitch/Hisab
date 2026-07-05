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
    deviceName: string;
};

const RevealDeviceSecretButton = ({
    organizationId,
    storeId,
    deviceId,
    deviceName,
}: RevealDeviceSecretButtonProps) => {
    const [open, setOpen] = useState(false);

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
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setOpen(true)}
            >
                <Eye className="mr-2 size-4" />
                View
            </Button>

            <DeviceSecretDialog
                open={open}
                onOpenChange={setOpen}
                deviceId={deviceId}
                deviceName={deviceName}
                deviceSecret={deviceSecret}
                isLoading={secretMutation.isPending}
                errorMessage={errorMessage}
                onRetry={() => secretMutation.mutate()}
            />
        </>
    );
};

export default RevealDeviceSecretButton;
