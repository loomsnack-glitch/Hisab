import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createStoreDevice } from "@repo/services";
import { CreateStoreDeviceSchema, type CreateStoreDeviceJSON } from "@repo/types";
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
import { MonitorSmartphone, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type CreateDeviceDialogProps = {
    organizationId: string;
    storeId: string;
    storeName: string;
    trigger?: React.ReactElement;
};

const defaultValues: CreateStoreDeviceJSON = { name: "", deviceSecret: "" };

const CreateDeviceDialog = ({ organizationId, storeId, storeName, trigger }: CreateDeviceDialogProps) => {
    const [open, setOpen] = useState(false);
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
                toast.success("Device created. You can reveal its secret anytime from the device list.");
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to create device");
        },
    });

    const onSubmit: SubmitHandler<CreateStoreDeviceJSON> = (values) => {
        createMutation.mutate({
            name: values.name.trim(),
            deviceSecret: values.deviceSecret.trim(),
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                    render={
                        trigger ?? (
                            <Button size="sm" variant="outline" className="rounded-full">
                                <Plus className="mr-2 size-4" />
                                Add device
                            </Button>
                        )
                    }
                />
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <MonitorSmartphone className="size-5" />
                        </div>
                        <DialogTitle className="text-center text-lg font-semibold">Register POS device</DialogTitle>
                        <DialogDescription className="text-center">
                            Add a device for <span className="font-medium text-foreground">{storeName}</span>. Set a name and secret.
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
                            name="deviceSecret"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Device secret</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="password"
                                            className="h-11 rounded-xl"
                                            placeholder="Choose a secure secret"
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
                            <p>This secret is stored securely. You can reveal it later from the device list.</p>
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
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? "Creating..." : "Create device"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CreateDeviceDialog;
