import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { getStoreDeviceSecret, updateStoreDevice } from "@repo/services";
import {
    UpdateStoreDeviceSchema,
    type StoreDeviceDTO,
    type StoreDeviceStatus,
    type UpdateStoreDeviceJSON,
} from "@repo/types";
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Spinner } from "@repo/ui/components/spinner";
import { MonitorSmartphone, Pencil } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type EditDeviceDialogProps = {
    organizationId: string;
    storeId: string;
    device: StoreDeviceDTO;
    trigger?: React.ReactElement;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

const statusOptions = [
    { value: "active" as const, label: "Active" },
    { value: "inactive" as const, label: "Inactive" },
    { value: "revoked" as const, label: "Revoked" },
];

const EditDeviceDialog = ({
    organizationId,
    storeId,
    device,
    trigger,
    open: controlledOpen,
    onOpenChange,
}: EditDeviceDialogProps) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = controlledOpen ?? internalOpen;
    const queryClient = useQueryClient();
    const [showSecretConfirm, setShowSecretConfirm] = useState(false);
    const [pendingValues, setPendingValues] = useState<UpdateStoreDeviceJSON | null>(null);
    const [loadedDeviceSecret, setLoadedDeviceSecret] = useState("");

    const form = useForm<UpdateStoreDeviceJSON>({
        resolver: zodResolver(UpdateStoreDeviceSchema),
        defaultValues: {
            name: device.name,
            loginUsername: device.loginUsername,
            status: device.status,
            deviceSecret: "",
        },
    });

    const setOpen = (nextOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(nextOpen);
        } else {
            setInternalOpen(nextOpen);
        }
    };

    const secretMutation = useMutation({
        mutationFn: () => getStoreDeviceSecret(organizationId, storeId, device.id),
        onSuccess: (response) => {
            if (response.status === "success" && response.data?.deviceSecret) {
                const secret = response.data.deviceSecret;
                setLoadedDeviceSecret(secret);
                form.setValue("deviceSecret", secret, { shouldDirty: false });
                return;
            }

            if (response.status === "error") {
                toast.error(response.message);
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to load device secret");
        },
    });

    useEffect(() => {
        if (open) {
            setLoadedDeviceSecret("");
            form.reset({
                name: device.name,
                loginUsername: device.loginUsername,
                status: device.status,
                deviceSecret: "",
            });
            secretMutation.reset();
            secretMutation.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [device.id, device.name, device.loginUsername, device.status, open]);

    const buildSubmitPayload = (values: UpdateStoreDeviceJSON): UpdateStoreDeviceJSON => {
        const trimmedSecret = values.deviceSecret?.trim();
        const secretChanged = trimmedSecret !== loadedDeviceSecret;

        return {
            name: values.name.trim(),
            loginUsername: values.loginUsername?.trim().toLowerCase() || undefined,
            status: values.status,
            deviceSecret: secretChanged && trimmedSecret ? trimmedSecret : undefined,
        };
    };

    const resetFormValues = () => {
        form.reset({
            name: device.name,
            loginUsername: device.loginUsername,
            status: device.status,
            deviceSecret: loadedDeviceSecret,
        });
    };

    const updateMutation = useMutation({
        mutationFn: (values: UpdateStoreDeviceJSON) =>
            updateStoreDevice(organizationId, storeId, device.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update device");
        },
    });

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await updateMutation.mutateAsync(buildSubmitPayload(values));
                    if (response.status === "success") {
                        result = true;
                    }
                } catch {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: resetFormValues,
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                resetFormValues();
            });
        } else {
            setOpen(true);
        }
    };

    const doSubmit = (values: UpdateStoreDeviceJSON) => {
        updateMutation.mutate(buildSubmitPayload(values));
    };

    const onSubmit: SubmitHandler<UpdateStoreDeviceJSON> = (values) => {
        const trimmedSecret = values.deviceSecret?.trim();
        if (trimmedSecret && trimmedSecret !== loadedDeviceSecret) {
            setPendingValues(values);
            setShowSecretConfirm(true);
            return;
        }
        doSubmit(values);
    };

    const handleSecretConfirm = () => {
        if (pendingValues) {
            doSubmit(pendingValues);
        }
        setShowSecretConfirm(false);
        setPendingValues(null);
    };

    const handleSecretCancel = () => {
        setShowSecretConfirm(false);
        setPendingValues(null);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
            {!isControlled && (
                <DialogTrigger
                    render={
                        trigger ?? (
                            <Button variant="outline" size="sm" className="rounded-full">
                                <Pencil className="size-4" />
                            </Button>
                        )
                    }
                />
            )}
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<MonitorSmartphone className="size-5" />} title="Edit device" />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Device name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" maxLength={255} {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.loginUsername}>
                        <FieldLabel>Device username</FieldLabel>
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
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusOptions}
                                        value={statusOptions.find((option) => option.value === field.value) ?? null}
                                        onChange={(option) =>
                                            field.onChange((option?.value ?? "active") as StoreDeviceStatus)
                                        }
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="deviceSecret"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Device secret</FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <PasswordInput
                                            className="h-11 rounded-xl"
                                            visibilityLabel={{ show: "Show device secret", hide: "Hide device secret" }}
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            autoComplete="new-password"
                                            disabled={secretMutation.isPending}
                                        />
                                        {secretMutation.isPending ? (
                                            <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center">
                                                <Spinner className="size-4 text-muted-foreground" />
                                            </div>
                                        ) : null}
                                    </div>
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
                            disabled={updateMutation.isPending || secretMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
                {AlertDialogComponent}

                <AlertDialog open={showSecretConfirm} onOpenChange={(nextOpen) => { if (!nextOpen) handleSecretCancel(); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Change device secret?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={handleSecretCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={handleSecretConfirm}
                            >
                                Confirm
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

export default EditDeviceDialog;
