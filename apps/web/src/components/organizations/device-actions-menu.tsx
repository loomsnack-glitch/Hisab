import { useState } from "react";
import type { StoreDeviceDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { KeyRound, MoreHorizontal, Pencil } from "lucide-react";

import EditDeviceDialog from "@/components/organizations/edit-device-dialog";
import RevealDeviceSecretButton from "@/components/organizations/reveal-device-secret-button";

type DeviceActionsMenuProps = {
    organizationId: string;
    organizationUsername: string;
    storeId: string;
    device: StoreDeviceDTO;
};

const DeviceActionsMenu = ({
    organizationId,
    organizationUsername,
    storeId,
    device,
}: DeviceActionsMenuProps) => {
    const [secretOpen, setSecretOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            aria-label={`More actions for ${device.name}`}
                        >
                            <MoreHorizontal className="mr-2 size-4" />
                            More
                        </Button>
                    }
                />
                <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                    <DropdownMenuItem
                        className="min-h-11 gap-3 rounded-lg px-3 py-2.5 text-sm"
                        onClick={() => setSecretOpen(true)}
                    >
                        <KeyRound />
                        Show device secret
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="min-h-11 gap-3 rounded-lg px-3 py-2.5 text-sm"
                        onClick={() => setEditOpen(true)}
                    >
                        <Pencil />
                        Edit device
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <RevealDeviceSecretButton
                organizationId={organizationId}
                storeId={storeId}
                deviceId={device.id}
                organizationUsername={organizationUsername}
                deviceLoginUsername={device.loginUsername}
                deviceName={device.name}
                canOpenPos={device.status === "active"}
                open={secretOpen}
                onOpenChange={setSecretOpen}
            />
            <EditDeviceDialog
                organizationId={organizationId}
                storeId={storeId}
                device={device}
                open={editOpen}
                onOpenChange={setEditOpen}
            />
        </>
    );
};

export default DeviceActionsMenu;
