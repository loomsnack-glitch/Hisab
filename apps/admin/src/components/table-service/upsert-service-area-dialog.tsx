import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServiceArea, updateServiceArea } from "@repo/services";
import {
  CreateServiceAreaSchema,
  type CreateServiceAreaJSON,
  type ServiceAreaDTO,
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
import { Textarea } from "@repo/ui/components/textarea";
import { MapPinned, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { serviceAreaKeys } from "@/lib/query-keys";

type FormValues = {
  title: string;
  description: string;
};

const defaultValues: FormValues = { title: "", description: "" };

type UpsertServiceAreaDialogProps = {
  organizationId: string;
  storeId: string;
  area?: ServiceAreaDTO;
  trigger?: React.ReactElement;
};

const UpsertServiceAreaDialog = ({
  organizationId,
  storeId,
  area,
  trigger,
}: UpsertServiceAreaDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEditMode = Boolean(area);
  const form = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (!open) {
      form.reset(
        area
          ? { title: area.title, description: area.description ?? "" }
          : defaultValues,
      );
    }
  }, [area, form, open]);

  const mutation = useMutation({
    mutationFn: (data: CreateServiceAreaJSON) =>
      area
        ? updateServiceArea(organizationId, storeId, area.id, data)
        : createServiceArea(organizationId, storeId, data),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(response.message ?? (isEditMode ? "Service area updated" : "Service area created"));
      void queryClient.invalidateQueries({
        queryKey: serviceAreaKeys.store(organizationId, storeId),
      });
      form.reset(defaultValues);
      setOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? (isEditMode ? "Failed to update service area" : "Failed to create service area"));
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const result = CreateServiceAreaSchema.safeParse({
      title: values.title,
      description: values.description,
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path[0] === "description" ? "description" : "title";
      form.setError(field, { message: issue?.message ?? "Enter valid area details" });
      return;
    }

    mutation.mutate({
      title: result.data.title,
      description: result.data.description ?? "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger
        render={
          trigger ?? (
            isEditMode ? (
              <Button variant="outline" size="sm" className="rounded-full">
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : (
              <Button className="rounded-xl" disabled={!storeId}>
                <Plus className="size-4" />
                Add area
              </Button>
            )
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader
          icon={<MapPinned className="size-5" />}
          title={isEditMode ? "Edit Service Area" : "Add Service Area"}
          subtitle="Give this part of the floor a title staff will recognize."
        />
        <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field data-invalid={Boolean(form.formState.errors.title)}>
            <FieldLabel required>Title</FieldLabel>
            <FieldContent>
              <Input
                aria-label="Area title"
                className="h-11 rounded-xl"
                placeholder="e.g. Patio"
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </FieldContent>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.description)}>
            <FieldLabel>
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <Textarea
                aria-label="Area description"
                className="min-h-24 rounded-xl"
                placeholder="e.g. Outdoor seating near the entrance"
                {...form.register("description")}
              />
              <FieldError errors={[form.formState.errors.description]} />
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
              className="rounded-xl"
              disabled={mutation.isPending || !storeId}
            >
              {mutation.isPending
                ? isEditMode
                  ? "Saving..."
                  : "Adding..."
                : isEditMode
                  ? "Save area"
                  : "Add area"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpsertServiceAreaDialog;
