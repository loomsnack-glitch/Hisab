import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { updateOrganization } from "@repo/services";
import { UpdateOrganizationSchema, type OrganizationDTO, type UpdateOrganizationJSON } from "@repo/types";
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
import { Building2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type EditOrganizationDialogProps = {
    organization: OrganizationDTO;
    trigger?: React.ReactElement;
};

const EditOrganizationDialog = ({ organization, trigger }: EditOrganizationDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<UpdateOrganizationJSON>({
        resolver: zodResolver(UpdateOrganizationSchema),
        defaultValues: { name: organization.name },
    });

    useEffect(() => {
        if (open) {
            form.reset({ name: organization.name });
        }
    }, [form, open, organization.name]);

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
        updateMutation.mutate({ name: values.name.trim() });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                    <DialogTitle className="text-center text-lg font-semibold">Edit organization</DialogTitle>
                    <DialogDescription className="text-center">
                        Update the display name for this workspace.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Organization name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Panini House Pvt Ltd"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
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

export default EditOrganizationDialog;
