import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createStoreDevice } from "@repo/services";
import { CreateStoreDeviceSchema, type CreateStoreDeviceJSON, type StoreDeviceDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import { MonitorSmartphone, Plus } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { createDefaultDeviceValues } from "@/lib/device-defaults";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import RevealDeviceSecretButton from "@/components/organizations/reveal-device-secret-button";

type CreateDeviceDialogProps = {
    organizationId: string;
    organizationUsername: string;
    storeId: string;
    storeName: string;
    deviceNumber: number;
    trigger?: React.ReactElement;
};

const defaultValues: CreateStoreDeviceJSON = { name: "", loginUsername: "", deviceSecret: "" };

const CreateDeviceDialog = ({
    organizationId,
    organizationUsername,
    storeId,
    storeName,
    deviceNumber,
    trigger,
}: CreateDeviceDialogProps) => {
    const [open, setOpen] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupDevice, setSetupDevice] = useState<StoreDeviceDTO | null>(null);
    const queryClient = useQueryClient();

    const form = useForm<CreateStoreDeviceJSON>({
        resolver: zodResolver(CreateStoreDeviceSchema),
        defaultValues,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateStoreDeviceJSON) => createStoreDevice(organizationId, storeId, data),
        onSuccess: (response) => {
            if (response.status === "success" && response.data) {
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                form.reset(defaultValues);
                setOpen(false);
                setSetupDevice(response.data.device);
                setSetupOpen(true);
                toast.success(response.message);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to create device");
        },
    });

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await createMutation.mutateAsync({
                        name: values.name.trim(),
                        loginUsername: values.loginUsername.trim().toLowerCase(),
                        deviceSecret: values.deviceSecret.trim(),
                    });
                    if (response.status === "success") {
                        result = true;
                    }
                } catch {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: () => {
            form.reset(defaultValues);
        },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                form.reset(defaultValues);
            });
        } else {
            try {
                form.reset(createDefaultDeviceValues(storeName, deviceNumber));
            } catch {
                form.reset(defaultValues);
            }
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<CreateStoreDeviceJSON> = (values) => {
        createMutation.mutate({
            name: values.name.trim(),
            loginUsername: values.loginUsername.trim().toLowerCase(),
            deviceSecret: values.deviceSecret.trim(),
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
                <DialogTrigger
                    render={
                        trigger ?? (
                            <Button size="sm" variant="outline" className="rounded-full">
                                <Plus className="size-4" />
                                Add device
                            </Button>
                        )
                    }
                />
                <DialogContent className="sm:max-w-md">
                    <DialogHeader icon={<MonitorSmartphone className="size-5" />} title="Add device" />

                    <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                        <Field data-invalid={!!form.formState.errors.name}>
                            <FieldLabel required>Device name</FieldLabel>
                            <FieldContent>
                                <Input className="h-11 rounded-xl" maxLength={255} {...form.register("name")} />
                                <FieldError errors={[form.formState.errors.name]} />
                            </FieldContent>
                        </Field>

                        <Field data-invalid={!!form.formState.errors.loginUsername}>
                            <FieldLabel required>Device username</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 rounded-xl font-mono text-sm"
                                    maxLength={64}
                                    {...form.register("loginUsername")}
                                />
                                <FieldError errors={[form.formState.errors.loginUsername]} />
                            </FieldContent>
                        </Field>

                        <Controller
                            control={form.control}
                            name="deviceSecret"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Device secret</FieldLabel>
                                    <FieldContent>
                                        <PasswordInput
                                            className="h-11 rounded-xl"
                                            visibilityLabel={{ show: "Show device secret", hide: "Hide device secret" }}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            autoComplete="new-password"
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? "Creating..." : "Create device"}
                            </Button>
                        </DialogFooter>
                    </form>
                    {AlertDialogComponent}
                </DialogContent>
            </Dialog>

            {setupDevice ? (
                <RevealDeviceSecretButton
                    organizationId={organizationId}
                    storeId={storeId}
                    deviceId={setupDevice.id}
                    organizationUsername={organizationUsername}
                    deviceLoginUsername={setupDevice.loginUsername}
                    deviceName={setupDevice.name}
                    canOpenPos={setupDevice.status === "active"}
                    open={setupOpen}
                    onOpenChange={setSetupOpen}
                />
            ) : null}
        </>
    );
};

export default CreateDeviceDialog;
