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
    DialogDescription,
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

    const onSubmit: SubmitHandler<UpdateStoreDeviceJSON> = (values) => {
        updateMutation.mutate({
            name: values.name.trim(),
            status: values.status,
            deviceSecret: values.deviceSecret?.trim() || undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-4" />
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <MonitorSmartphone className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">Edit device</DialogTitle>
                    <DialogDescription className="text-center">
                        Update the device name, status, or rotate its secret.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Device name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
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
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="h-11 rounded-xl">
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
                                <FieldLabel>
                                    New device secret{" "}
                                    <span className="font-normal text-muted-foreground">(optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="password"
                                        className="h-11 rounded-xl"
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

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditDeviceDialog;
