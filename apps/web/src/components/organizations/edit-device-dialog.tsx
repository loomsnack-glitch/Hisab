import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { updateStoreDevice } from "@repo/services";
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
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { MonitorSmartphone, Pencil, ShieldCheck, TriangleAlert } from "lucide-react";
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

const statusOptions: { value: StoreDeviceStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "revoked", label: "Revoked" },
];

const EditDeviceDialog = ({ organizationId, storeId, device, trigger, open: controlledOpen, onOpenChange }: EditDeviceDialogProps) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = controlledOpen ?? internalOpen;
    const queryClient = useQueryClient();
    const [showSecretConfirm, setShowSecretConfirm] = useState(false);
    const [pendingValues, setPendingValues] = useState<UpdateStoreDeviceJSON | null>(null);

    const form = useForm<UpdateStoreDeviceJSON>({
        resolver: zodResolver(UpdateStoreDeviceSchema),
        defaultValues: {
            name: device.name,
            loginUsername: device.loginUsername,
            status: device.status,
            deviceSecret: "",
        },
    });

    const deviceName = form.watch("name");
    const deviceLoginUsername = form.watch("loginUsername");

    const setOpen = (nextOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(nextOpen);
        } else {
            setInternalOpen(nextOpen);
        }
    };

    useEffect(() => {
        if (open) {
            form.reset({
                name: device.name,
                loginUsername: device.loginUsername,
                status: device.status,
                deviceSecret: "",
            });
        }
    }, [device.name, device.loginUsername, device.status, form, open]);

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
                    const response = await updateMutation.mutateAsync({
                        name: values.name.trim(),
                        loginUsername: values.loginUsername?.trim().toLowerCase() || undefined,
                        status: values.status,
                        deviceSecret: values.deviceSecret?.trim() || undefined,
                    });
                    if (response.status === "success") {
                        result = true;
                    }
                } catch (err) {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: () => {
            form.reset({
                name: device.name,
                loginUsername: device.loginUsername,
                status: device.status,
                deviceSecret: "",
            });
        },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                form.reset({
                    name: device.name,
                    loginUsername: device.loginUsername,
                    status: device.status,
                    deviceSecret: "",
                });
            });
        } else {
            setOpen(true);
        }
    };

    const doSubmit = (values: UpdateStoreDeviceJSON) => {
        updateMutation.mutate({
            name: values.name.trim(),
            loginUsername: values.loginUsername?.trim().toLowerCase() || undefined,
            status: values.status,
            deviceSecret: values.deviceSecret?.trim() || undefined,
        });
    };

    const onSubmit: SubmitHandler<UpdateStoreDeviceJSON> = (values) => {
        if (values.deviceSecret?.trim()) {
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader
                    icon={<MonitorSmartphone className="size-5 transition-transform duration-300" />}
                    title="Edit device"
                />

                <form className="space-y-4 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80" required>
                                Device name
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(deviceName ?? "").length}/255
                            </span>
                        </div>
                        <FieldContent>
                            <Input
                                variant="ringShadow"
                                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                maxLength={255}
                                placeholder="e.g. Counter 1, Front Desk"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.loginUsername}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                Device username
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(deviceLoginUsername ?? "").length}/64
                            </span>
                        </div>
                        <FieldContent>
                            <Input
                                variant="ringShadow"
                                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner font-mono text-sm"
                                maxLength={64}
                                placeholder="e.g. counter1"
                                {...form.register("loginUsername")}
                            />
                            <FieldError errors={[form.formState.errors.loginUsername]} />
                            <p className="text-[11px] text-muted-foreground">
                                Use lowercase letters, numbers, hyphens, or underscores. It must be unique in this business.
                            </p>
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80" required>
                                    Status
                                </FieldLabel>
                                <FieldContent>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="h-11 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                    New device secret <span className="font-normal text-muted-foreground/60 lowercase normal-case">(optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <PasswordInput
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        placeholder="Leave blank to keep current secret"
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

                    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                        <p>Leave the secret empty to keep the current one. Set a new secret only when rotating credentials.</p>
                    </div>

                    <DialogFooter className="mt-4 border-t border-border/30">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl px-5 font-semibold text-muted-foreground hover:text-foreground transition-all duration-200"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
                {AlertDialogComponent}

                <AlertDialog open={showSecretConfirm} onOpenChange={(open) => { if (!open) handleSecretCancel(); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogMedia className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                                <TriangleAlert className="size-5" />
                            </AlertDialogMedia>
                            <AlertDialogTitle>Change device secret?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Changing this secret will immediately invalidate the old POS login.
                                The device will need the new secret to connect again.
                                Do you want to continue?
                            </AlertDialogDescription>
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
