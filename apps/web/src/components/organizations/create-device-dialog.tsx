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
import { Eye, EyeOff, MonitorSmartphone, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import RevealDeviceSecretButton from "@/components/organizations/reveal-device-secret-button";

type CreateDeviceDialogProps = {
    organizationId: string;
    organizationUsername: string;
    storeId: string;
    storeName: string;
    trigger?: React.ReactElement;
};

const defaultValues: CreateStoreDeviceJSON = { name: "", loginUsername: "", deviceSecret: "" };

const CreateDeviceDialog = ({ organizationId, organizationUsername, storeId, storeName, trigger }: CreateDeviceDialogProps) => {
    const [open, setOpen] = useState(false);
    const [showDeviceSecret, setShowDeviceSecret] = useState(false);
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupDevice, setSetupDevice] = useState<StoreDeviceDTO | null>(null);
    const queryClient = useQueryClient();

    const form = useForm<CreateStoreDeviceJSON>({
        resolver: zodResolver(CreateStoreDeviceSchema),
        defaultValues,
    });

    const deviceName = form.watch("name");
    const deviceLoginUsername = form.watch("loginUsername");

    const createMutation = useMutation({
        mutationFn: (data: CreateStoreDeviceJSON) => createStoreDevice(organizationId, storeId, data),
        onSuccess: (response) => {
            if (response.status === "success" && response.data) {
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                form.reset(defaultValues);
                setShowDeviceSecret(false);
                setOpen(false);
                setSetupDevice(response.data.device);
                setSetupOpen(true);
                toast.success("Device created. POS setup details are ready.");
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
                } catch (err) {
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
                setShowDeviceSecret(false);
            });
        } else {
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
            <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader
                    icon={<MonitorSmartphone className="size-5 transition-transform duration-300" />}
                    title="Add device"
                    subtitle={<>Registering device for <span className="font-semibold text-foreground">{storeName}</span></>}
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
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80" required>
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
                                This username identifies this device when opening POS.
                            </p>
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="deviceSecret"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80" required>
                                    Device secret
                                </FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <Input
                                            type={showDeviceSecret ? "text" : "password"}
                                            variant="ringShadow"
                                            className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 pr-16 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                            placeholder="Choose a secure secret"
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            aria-label={showDeviceSecret ? "Hide device secret" : "Show device secret"}
                                            title={showDeviceSecret ? "Hide device secret" : "Show device secret"}
                                            className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                            onClick={() => setShowDeviceSecret((visible) => !visible)}
                                        >
                                            {showDeviceSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                        <p>This secret is stored securely. You can reveal it later from the device list.</p>
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
