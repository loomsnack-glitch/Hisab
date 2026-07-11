import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { createOrganization } from "@repo/services";
import { CreateOrganizationSchema, type CreateOrganizationJSON } from "@repo/types";
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
import { Building2, Plus, Star, Check } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type CreateOrganizationDialogProps = {
    trigger?: React.ReactElement;
};

const defaultValues: CreateOrganizationJSON = { name: "" };

const getOrgInitials = (name?: string) => {
    if (!name) return "OR";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const CreateOrganizationDialog = ({ trigger }: CreateOrganizationDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<CreateOrganizationJSON>({
        resolver: zodResolver(CreateOrganizationSchema),
        defaultValues,
    });

    const orgName = form.watch("name");

    const createMutation = useMutation({
        mutationFn: createOrganization,
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
                form.reset(defaultValues);
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to create organization");
        },
    });

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await createMutation.mutateAsync(values);
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
            });
        } else {
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<CreateOrganizationJSON> = (values) => {
        createMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="mr-2 size-4" />
                            New organization
                        </Button>
                    )
                }
            />
             <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader className="flex flex-row items-center gap-3 border-b border-border/30 pb-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition-all duration-300 hover:scale-105 group">
                        <Building2 className="size-5 transition-transform duration-300" />
                    </div>
                    <DialogTitle className="text-left text-lg font-bold tracking-tight text-foreground font-display">
                        Create organization
                    </DialogTitle>
                </DialogHeader>

                <form className="space-y-6 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5" required>
                                Name
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(orgName ?? "").length}/255
                            </span>
                        </div>
                        <FieldContent className="space-y-4">
                            <Input
                                variant="ringShadow"
                                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                maxLength={255}
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />

                            {/* Live Dropdown Preview */}
                            {orgName && orgName.trim() && (
                                <div className="space-y-2 pt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                        Live Dropdown Preview
                                    </span>
                                    <div className="rounded-xl border border-border/50 bg-popover/40 p-1.5 shadow-sm backdrop-blur-sm">
                                        <div className="flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm bg-primary/10 text-primary font-medium">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="p-1 rounded-md text-amber-500 shrink-0">
                                                    <Star className="size-4 fill-amber-500" />
                                                </div>
                                                <div className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 bg-primary/10 text-primary border-primary/20">
                                                    {getOrgInitials(orgName)}
                                                </div>
                                                <span className="truncate font-medium text-foreground">
                                                    {orgName}
                                                </span>
                                            </div>
                                            <Check className="size-4 text-amber-500 shrink-0 font-bold" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </FieldContent>
                    </Field>

                    <DialogFooter className="mt-6">
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
                            {createMutation.isPending ? "Creating..." : "Create organization"}
                        </Button>
                    </DialogFooter>
                </form>
                {AlertDialogComponent}
            </DialogContent>
        </Dialog>
    );
};

export default CreateOrganizationDialog;
