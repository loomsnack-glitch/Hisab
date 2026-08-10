import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import {
  checkOrganizationUsernameAvailability,
  createOrganization,
} from "@repo/services";
import {
  CreateOrganizationSchema,
  OrganizationUsernameAvailabilityQuerySchema,
  type CreateOrganizationJSON,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
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
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Plus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { slugifyBusinessName } from "@/lib/organization-username";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type CreateOrganizationDialogProps = {
  trigger?: React.ReactElement;
};

const defaultValues: CreateOrganizationJSON = { name: "", username: "" };

const CreateOrganizationDialog = ({
  trigger,
}: CreateOrganizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<CreateOrganizationJSON>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues,
  });

  const orgName = form.watch("name");
  const orgUsername = form.watch("username") ?? "";
  const normalizedUsername = orgUsername.trim().toLowerCase();
  const [debouncedUsername, setDebouncedUsername] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(
      () => setDebouncedUsername(normalizedUsername),
      450,
    );
    return () => clearTimeout(timeoutId);
  }, [normalizedUsername]);

  const usernameSyntaxResult =
    OrganizationUsernameAvailabilityQuerySchema.safeParse({
      username: normalizedUsername,
    });
  const usernameCheckReady =
    normalizedUsername === debouncedUsername && usernameSyntaxResult.success;
  const usernameAvailabilityQuery = useQuery({
    queryKey: organizationKeys.usernameAvailability(debouncedUsername),
    queryFn: () => checkOrganizationUsernameAvailability(debouncedUsername),
    enabled: open && usernameCheckReady,
    staleTime: 30_000,
    retry: 1,
  });
  const availabilityResponse = usernameAvailabilityQuery.data;
  const usernameAvailable =
    usernameCheckReady &&
    availabilityResponse?.status === "success" &&
    availabilityResponse.data?.available === true;
  const usernameTaken =
    usernameCheckReady &&
    availabilityResponse?.status === "success" &&
    availabilityResponse.data?.available === false;
  const usernameCheckPending =
    usernameSyntaxResult.success &&
    (!usernameCheckReady ||
      usernameAvailabilityQuery.isPending ||
      usernameAvailabilityQuery.isFetching);

  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success(response.message);
        queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
        form.reset(defaultValues);
        setUsernameEdited(false);
        setOpen(false);
        if (response.data?.organization.id) {
          navigate(`/organizations/${response.data.organization.id}/stores`);
        }
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
        setUsernameEdited(false);
      });
    } else {
      setOpen(true);
    }
  };

  const onSubmit: SubmitHandler<CreateOrganizationJSON> = (values) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4" />
              New business
            </Button>
          )
        }
      />
      <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
        <DialogHeader
          icon={
            <Building2 className="size-5 transition-transform duration-300" />
          }
          title="Create business"
        />

        <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field data-invalid={!!form.formState.errors.name}>
            <div className="flex items-center justify-between">
              <FieldLabel
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
                required
              >
                Business name
              </FieldLabel>
              <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                {(orgName ?? "").length}/255
              </span>
            </div>
            <FieldContent>
              <Input
                variant="ringShadow"
                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                maxLength={255}
                placeholder="e.g. Demo Grocery Mart"
                {...form.register("name", {
                  onChange: (event) => {
                    if (!usernameEdited) {
                      form.setValue(
                        "username",
                        slugifyBusinessName(event.target.value),
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                    }
                  },
                })}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!form.formState.errors.username}>
            <div className="flex items-center justify-between">
              <FieldLabel
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
                required
              >
                Business username
              </FieldLabel>
              <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                {(orgUsername ?? "").length}/64
              </span>
            </div>
            <FieldContent>
              <Input
                variant="ringShadow"
                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner font-mono text-sm"
                maxLength={64}
                placeholder="e.g. demo_grocery_mart"
                {...form.register("username", {
                  onChange: () => setUsernameEdited(true),
                })}
              />
              <FieldError errors={[form.formState.errors.username]} />
              <div className="min-h-5 text-xs" aria-live="polite">
                {usernameCheckPending ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <LoaderCircle className="size-3 animate-spin" />
                    Checking username availability...
                  </p>
                ) : usernameTaken ? (
                  <p className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="size-3.5" />
                    This username is already taken.
                  </p>
                ) : usernameAvailable ? (
                  <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    This username is available.
                  </p>
                ) : usernameAvailabilityQuery.isError ||
                  availabilityResponse?.status === "error" ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <CircleAlert className="size-3.5" />
                    We could not check availability. We will verify it when you
                    create the business.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Use this business username together with the device username
                    to open POS.
                  </p>
                )}
              </div>
            </FieldContent>
          </Field>

          <DialogFooter className="mt-6 border-t border-border/30">
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
              disabled={
                createMutation.isPending ||
                usernameCheckPending ||
                usernameTaken
              }
            >
              {createMutation.isPending ? "Creating..." : "Create business"}
            </Button>
          </DialogFooter>
        </form>
        {AlertDialogComponent}
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganizationDialog;
