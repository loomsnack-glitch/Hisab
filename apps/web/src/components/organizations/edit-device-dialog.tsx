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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { MonitorSmartphone, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type EditDeviceDialogProps = {
    organizationId: string;
    storeId: string;
    device: StoreDeviceDTO;
    trigger?: React.ReactElement;
};

const statusOptions: { value: StoreDeviceStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "revoked", label: "Revoked" },
];

const EditDeviceDialog = ({ organizationId, storeId, device, trigger }: EditDeviceDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<UpdateStoreDeviceJSON>({
        resolver: zodResolver(UpdateStoreDeviceSchema),
        defaultValues: {
            name: device.name,
            status: device.status,
            deviceSecret: "",
        },
    });

    const deviceName = form.watch("name");

    useEffect(() => {
        if (open) {
            form.reset({
                name: device.name,
                status: device.status,
                deviceSecret: "",
            });
        }
    }, [device.name, device.status, form, open]);

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
                    status: device.status,
                    deviceSecret: "",
                });
            });
        } else {
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<UpdateStoreDeviceJSON> = (values) => {
        updateMutation.mutate({
            name: values.name.trim(),
            status: values.status,
            deviceSecret: values.deviceSecret?.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-4" />
                        </Button>
                    )
                }
            />
            <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader
                    icon={<MonitorSmartphone className="size-5 transition-transform duration-300" />}
                    title="Edit device"
                />

                <form className="space-y-6 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5" required>
                                Device name
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(deviceName ?? "").length}/255
                            </span>
                        </div>
                        <FieldContent className="space-y-4">
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

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5" required>
                                    Status
                                </FieldLabel>
                                <FieldContent className="space-y-4">
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
                                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                                    New device secret <span className="font-normal text-muted-foreground/60 lowercase normal-case">(optional)</span>
                                </FieldLabel>
                                <FieldContent className="space-y-4">
                                    <Input
                                        type="password"
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        placeholder="Leave blank to keep current secret"
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

                    <DialogFooter className="mt-6 border-t border-border/30">
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
            </DialogContent>
        </Dialog>
    );
};

export default EditDeviceDialog;
