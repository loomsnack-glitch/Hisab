import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignServiceTablesToArea, createServiceTable } from "@repo/services";
import {
  CreateServiceTableSchema,
  type CreateServiceTableJSON,
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
import { Armchair, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { serviceTableKeys } from "@/lib/query-keys";

type FormValues = {
  tableLabel: string;
  capacity: string;
};

const defaultValues: FormValues = { tableLabel: "", capacity: "" };

type CreateServiceTableDialogProps = {
  organizationId: string;
  storeId: string;
  serviceAreaId?: string | null;
  areaTitle?: string;
  trigger?: React.ReactElement;
};

const CreateServiceTableDialog = ({
  organizationId,
  storeId,
  serviceAreaId = null,
  areaTitle,
  trigger,
}: CreateServiceTableDialogProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
    }
  }, [form, open]);

  const mutation = useMutation({
    mutationFn: async (data: CreateServiceTableJSON) => {
      const created = await createServiceTable(organizationId, storeId, data);
      if (created.status !== "success" || !created.data?.table) {
        return created;
      }
      if (!serviceAreaId) {
        return created;
      }

      const assigned = await assignServiceTablesToArea(
        { organizationId, storeId, areaId: serviceAreaId },
        { tableIds: [created.data.table.id] },
      );
      if (assigned.status !== "success") {
        return assigned;
      }
      return created;
    },
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(
        serviceAreaId && areaTitle
          ? `Table added to ${areaTitle}`
          : (response.message ?? "Service table created"),
      );
      void queryClient.invalidateQueries({
        queryKey: serviceTableKeys.store(organizationId, storeId),
      });
      form.reset(defaultValues);
      setOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to create service table");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const capacity = values.capacity.trim() === "" ? null : Number(values.capacity);
    const result = CreateServiceTableSchema.safeParse({
      tableLabel: values.tableLabel,
      capacity,
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path[0] === "capacity" ? "capacity" : "tableLabel";
      form.setError(field, { message: issue?.message ?? "Enter valid table details" });
      return;
    }

    mutation.mutate({
      tableLabel: result.data.tableLabel,
      capacity: result.data.capacity ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              className="h-10 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:px-5 sm:text-sm"
              disabled={!storeId}
            >
              <PlusCircle className="size-4" />
              Add table
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader
          icon={<Armchair className="size-5" />}
          title="Add Service Table"
          subtitle={
            areaTitle
              ? `This table will be added to ${areaTitle}.`
              : "Use the same Table no that staff see in POS."
          }
        />
        <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field data-invalid={Boolean(form.formState.errors.tableLabel)}>
            <FieldLabel required>Table no</FieldLabel>
            <FieldContent>
              <Input
                aria-label="Table no"
                className="h-11 rounded-xl"
                placeholder="e.g. Patio-2"
                {...form.register("tableLabel")}
              />
              <FieldError errors={[form.formState.errors.tableLabel]} />
            </FieldContent>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.capacity)}>
            <FieldLabel>
              Persons no <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <Input
                aria-label="Persons no"
                inputMode="numeric"
                className="h-11 rounded-xl"
                placeholder="e.g. 4"
                {...form.register("capacity")}
              />
              <FieldError errors={[form.formState.errors.capacity]} />
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
              {mutation.isPending ? "Adding..." : "Add table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServiceTableDialog;
