import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createServiceTable, updateServiceTable } from "@repo/services";
import {
  CreateServiceTableSchema,
  type ServiceAreaDTO,
  type ServiceTableDTO,
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Armchair, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { serviceTableKeys } from "@/lib/query-keys";

const UNASSIGNED_AREA_VALUE = "unassigned";

type FormValues = {
  tableLabel: string;
  capacity: string;
  serviceAreaId: string;
};

const defaultValues: FormValues = {
  tableLabel: "",
  capacity: "",
  serviceAreaId: UNASSIGNED_AREA_VALUE,
};

type UpsertServiceTableDialogProps = {
  organizationId: string;
  storeId: string;
  areas: ServiceAreaDTO[];
  table?: ServiceTableDTO;
  serviceAreaId?: string | null;
  areaTitle?: string;
  trigger?: ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const areaValue = (serviceAreaId: string | null | undefined) =>
  serviceAreaId ?? UNASSIGNED_AREA_VALUE;

const parsedAreaId = (value: string) =>
  value === UNASSIGNED_AREA_VALUE ? null : value;

const UpsertServiceTableDialog = ({
  organizationId,
  storeId,
  areas,
  table,
  serviceAreaId = null,
  areaTitle,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: UpsertServiceTableDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const queryClient = useQueryClient();
  const isEditMode = Boolean(table);
  const form = useForm<FormValues>({ defaultValues });
  const areaOptions = useMemo(
    () => [
      { label: "Unassigned", value: UNASSIGNED_AREA_VALUE },
      ...areas.map((area) => ({ label: area.title, value: area.id })),
    ],
    [areas],
  );

  useEffect(() => {
    if (!open) {
      form.reset(
        table
          ? {
              tableLabel: table.tableLabel,
              capacity: table.capacity == null ? "" : String(table.capacity),
              serviceAreaId: areaValue(table.serviceAreaId),
            }
          : {
              ...defaultValues,
              serviceAreaId: areaValue(serviceAreaId),
            },
      );
    }
  }, [form, open, serviceAreaId, table]);

  const invalidateTables = () =>
    queryClient.invalidateQueries({
      queryKey: serviceTableKeys.store(organizationId, storeId),
    });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      tableLabel: string;
      capacity: number | null;
      serviceAreaId: string | null;
    }) => {
      if (table) {
        return updateServiceTable(organizationId, storeId, table.id, data);
      }
      return createServiceTable(organizationId, storeId, data);
    },
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(
        isEditMode
          ? (response.message ?? "Service table updated")
          : serviceAreaId && areaTitle
            ? `Table added to ${areaTitle}`
            : (response.message ?? "Service table created"),
      );
      void invalidateTables();
      form.reset(defaultValues);
      setOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(
        error.message ??
          (isEditMode
            ? "Failed to update service table"
            : "Failed to create service table"),
      );
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const capacity = values.capacity.trim() === "" ? null : Number(values.capacity);
    const result = CreateServiceTableSchema.safeParse({
      tableLabel: values.tableLabel,
      capacity,
      serviceAreaId: parsedAreaId(values.serviceAreaId),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path[0];
      const field =
        path === "capacity"
          ? "capacity"
          : path === "serviceAreaId"
            ? "serviceAreaId"
            : "tableLabel";
      form.setError(field, { message: issue?.message ?? "Enter valid table details" });
      return;
    }

    saveMutation.mutate({
      tableLabel: result.data.tableLabel,
      capacity: result.data.capacity ?? null,
      serviceAreaId: result.data.serviceAreaId ?? null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      {trigger !== null ? (
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
      ) : null}
        <DialogContent className="sm:max-w-md">
          <DialogHeader
            icon={<Armchair className="size-5" />}
            title={isEditMode ? "Edit Service Table" : "Add Service Table"}
          />
          <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
            <Field data-invalid={Boolean(form.formState.errors.tableLabel)}>
              <FieldLabel required>Table no</FieldLabel>
              <FieldContent>
                <Input
                  aria-label="Table no"
                  className="h-11 rounded-xl"
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
                  {...form.register("capacity")}
                />
                <FieldError errors={[form.formState.errors.capacity]} />
              </FieldContent>
            </Field>
            <Controller
              control={form.control}
              name="serviceAreaId"
              render={({ field, fieldState }) => {
                const selectedOption =
                  areaOptions.find((option) => option.value === field.value) ??
                  (areaTitle
                    ? { label: areaTitle, value: field.value }
                    : { label: "Unassigned", value: UNASSIGNED_AREA_VALUE });

                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Service Area</FieldLabel>
                    <FieldContent>
                      <ReactSelect
                        options={areaOptions}
                        value={selectedOption}
                        onChange={(option) =>
                          field.onChange(option?.value ?? UNASSIGNED_AREA_VALUE)
                        }
                        placeholder="Unassigned"
                        isDisabled={!isEditMode}
                        classNames={{ control: () => "!min-h-11 rounded-xl" }}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </FieldContent>
                  </Field>
                );
              }}
            />
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
                disabled={saveMutation.isPending || !storeId}
              >
                {saveMutation.isPending
                  ? isEditMode
                    ? "Saving..."
                    : "Adding..."
                  : isEditMode
                    ? "Save table"
                    : "Add table"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
    </Dialog>
  );
};

export default UpsertServiceTableDialog;
