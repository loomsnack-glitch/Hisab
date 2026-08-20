import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import {
  getOrganizationCatalogSettings,
  updateOrganization,
  updateOrganizationCatalogSettings,
} from "@repo/services";
import {
  UpdateOrganizationSchema,
  type OrganizationDTO,
  type UpdateOrganizationJSON,
} from "@repo/types";
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
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Switch } from "@repo/ui/components/switch";
import { Building2, Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type EditOrganizationDialogProps = {
  organization: OrganizationDTO;
  trigger?: React.ReactElement;
};

const EditOrganizationDialog = ({
  organization,
  trigger,
}: EditOrganizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<UpdateOrganizationJSON | null>(null);
  const queryClient = useQueryClient();
  const catalogSettingsQuery = useQuery({
    queryKey: organizationKeys.catalogSettings(organization.id),
    queryFn: () => getOrganizationCatalogSettings(organization.id),
  });

  const form = useForm<UpdateOrganizationJSON>({
    resolver: zodResolver(UpdateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      username: organization.username,
      tagline: organization.tagline ?? "",
    },
  });
  const tagline = useWatch({ control: form.control, name: "tagline" });

  useEffect(() => {
    if (open) {
      form.reset({
        name: organization.name,
        username: organization.username,
        tagline: organization.tagline ?? "",
      });
    }
  }, [
    form,
    open,
    organization.name,
    organization.tagline,
    organization.username,
  ]);

  const updateMutation = useMutation({
    mutationFn: (values: UpdateOrganizationJSON) =>
      updateOrganization(organization.id, values),
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success(response.message);
        queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(organization.id),
        });
        setOpen(false);
        return;
      }

      toast.error(response.message);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to update organization");
    },
  });

  const updateCatalogSettingsMutation = useMutation({
    mutationFn: (barcodeScanningEnabled: boolean) =>
      updateOrganizationCatalogSettings(organization.id, {
        barcodeScanningEnabled,
      }),
    onSuccess: (response) => {
      if (response.status === "success") {
        queryClient.setQueryData(
          organizationKeys.catalogSettings(organization.id),
          response,
        );
        toast.success(response.message);
        return;
      }

      toast.error(response.message);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to update Barcode Scanning");
    },
  });

  const barcodeScanningEnabled =
    catalogSettingsQuery.data?.status === "success" &&
    catalogSettingsQuery.data.data?.settings.barcodeScanningEnabled === true;

  const onSubmit: SubmitHandler<UpdateOrganizationJSON> = (values) => {
    const normalizedValues = {
      name: values.name.trim(),
      username: values.username.trim().toLowerCase(),
      tagline: values.tagline?.trim() ?? "",
    };
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
          <DialogTitle className="text-center text-lg font-semibold">
            Edit business
          </DialogTitle>
          <DialogDescription className="text-center">
            Update the business name, receipt tagline, and username used for POS
            login.
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

          <Field data-invalid={!!form.formState.errors.tagline}>
            <div className="flex items-center justify-between">
              <FieldLabel>Brand tagline</FieldLabel>
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground/50">
                {(tagline ?? "").length}/255
              </span>
            </div>
            <FieldContent>
              <Textarea
                className="min-h-20 resize-none rounded-xl"
                maxLength={255}
                placeholder="e.g. Fresh taste, every day"
                {...form.register("tagline")}
              />
              <FieldError errors={[form.formState.errors.tagline]} />
              <p className="text-[11px] text-muted-foreground">
                Shown below your business name on printed bills.
              </p>
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
                Use this business username together with the device username to
                open POS.
              </p>
            </FieldContent>
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-3">
              <FieldContent>
                <FieldLabel>Barcode Scanning</FieldLabel>
                <p className="text-[11px] text-muted-foreground">
                  Show Product Code management for administrators. Saved Product
                  Codes stay intact when disabled.
                </p>
              </FieldContent>
              <Switch
                checked={barcodeScanningEnabled}
                onCheckedChange={(checked) =>
                  updateCatalogSettingsMutation.mutate(checked)
                }
                disabled={
                  catalogSettingsQuery.isPending ||
                  updateCatalogSettingsMutation.isPending
                }
                aria-label="Enable Barcode Scanning"
              />
            </div>
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
        <AlertDialog
          open={showUsernameConfirm}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) cancelUsernameChange();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TriangleAlert className="size-5" />
              </div>
              <AlertDialogTitle className="text-center">
                Change business username?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Existing POS links using the old business username will no
                longer work.
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
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={cancelUsernameChange}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={confirmUsernameChange}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? "Saving..."
                  : "Change business username"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrganizationDialog;
