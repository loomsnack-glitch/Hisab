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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type CreateOrganizationDialogProps = {
    trigger?: React.ReactElement;
};

const defaultValues: CreateOrganizationJSON = { name: "" };

const CreateOrganizationDialog = ({ trigger }: CreateOrganizationDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<CreateOrganizationJSON>({
        resolver: zodResolver(CreateOrganizationSchema),
        defaultValues,
    });

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

    const onSubmit: SubmitHandler<CreateOrganizationJSON> = (values) => {
        createMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">Create organization</DialogTitle>
                    <DialogDescription className="text-center">
                        Add a new business entity. You can set up stores and POS devices inside it next.
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
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? "Creating..." : "Create organization"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateOrganizationDialog;
