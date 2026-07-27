import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { updateOrganization } from "@repo/services";
import { UpdateOrganizationSchema, type OrganizationDTO, type UpdateOrganizationJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
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
import { Building2, Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type EditOrganizationDialogProps = {
    organization: OrganizationDTO;
    trigger?: React.ReactElement;
};

const EditOrganizationDialog = ({ organization, trigger }: EditOrganizationDialogProps) => {
    const [open, setOpen] = useState(false);
    const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
    const [pendingValues, setPendingValues] = useState<UpdateOrganizationJSON | null>(null);
    const queryClient = useQueryClient();

    const form = useForm<UpdateOrganizationJSON>({
        resolver: zodResolver(UpdateOrganizationSchema),
        defaultValues: { name: organization.name, username: organization.username },
    });

    useEffect(() => {
        if (open) {
            form.reset({ name: organization.name, username: organization.username });
        }
    }, [form, open, organization.name, organization.username]);

    const updateMutation = useMutation({
        mutationFn: (values: UpdateOrganizationJSON) => updateOrganization(organization.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organization.id) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update organization");
        },
    });

    const onSubmit: SubmitHandler<UpdateOrganizationJSON> = (values) => {
        const normalizedValues = { name: values.name.trim(), username: values.username.trim().toLowerCase() };
        if (normalizedValues.username !== organization.username) {
            setPendingValues(normalizedValues);
            setShowUsernameConfirm(true);
            return;
        }
        updateMutation.mutate(normalizedValues);
    };

    const confirmUsernameChange = () => {
        if (pendingValues) {
            updateMutation.mutate(pendingValues);
        }
        setPendingValues(null);
        setShowUsernameConfirm(false);
    };

    const cancelUsernameChange = () => {
        setPendingValues(null);
        setShowUsernameConfirm(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" className="rounded-full">
                            <Pencil className=" size-4" />
                            {/* Edit name */}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">Edit business</DialogTitle>
                    <DialogDescription className="text-center">
                        Update the business name and username used for POS login.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Business name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Panini House Pvt Ltd"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.username}>
                        <FieldLabel required>Business username</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl font-mono text-sm"
                                maxLength={64}
                                placeholder="e.g. demo-grocery-mart"
                                {...form.register("username")}
                            />
                            <FieldError errors={[form.formState.errors.username]} />
                            <p className="text-[11px] text-muted-foreground">
                                Use this business username together with the device username to open POS.
                            </p>
                        </FieldContent>
                    </Field>

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
                            disabled={updateMutation.isPending || !form.formState.isDirty}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
                <AlertDialog open={showUsernameConfirm} onOpenChange={(nextOpen) => {
                    if (!nextOpen) cancelUsernameChange();
                }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <TriangleAlert className="size-5" />
                            </div>
                            <AlertDialogTitle className="text-center">Change business username?</AlertDialogTitle>
                            <AlertDialogDescription className="text-center">
                                Existing POS links using the old business username will no longer work.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                            <p>
                                <span className="text-muted-foreground">Old: </span>
                                <code className="font-mono">{organization.username}</code>
                            </p>
                            <p>
                                <span className="text-muted-foreground">New: </span>
                                <code className="font-mono">{pendingValues?.username}</code>
                            </p>
                        </div>
                        <AlertDialogFooter>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={cancelUsernameChange}>
                                Cancel
                            </Button>
                            <Button type="button" className="rounded-xl" onClick={confirmUsernameChange} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Saving..." : "Change business username"}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
};

export default EditOrganizationDialog;
