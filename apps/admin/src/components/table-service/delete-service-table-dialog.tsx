import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteServiceTable } from "@repo/services";
import type { ServiceTableDTO } from "@repo/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { serviceTableKeys } from "@/lib/query-keys";

type DeleteServiceTableDialogProps = {
  organizationId: string;
  storeId: string;
  table: ServiceTableDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DeleteServiceTableDialog = ({
  organizationId,
  storeId,
  table,
  open,
  onOpenChange,
}: DeleteServiceTableDialogProps) => {
  const queryClient = useQueryClient();
  const tableIsFree = table.state === "free";

  const mutation = useMutation({
    mutationFn: () => deleteServiceTable(organizationId, storeId, table.id),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(response.message ?? "Service table deleted");
      void queryClient.invalidateQueries({
        queryKey: serviceTableKeys.store(organizationId, storeId),
      });
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to delete service table");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete table</AlertDialogTitle>
          <AlertDialogDescription>
            {tableIsFree ? (
              <>
                <span className="font-medium text-foreground">{table.tableLabel}</span>{" "}
                will be removed from this Store and from POS. Past bills keep this table
                as their original context.
              </>
            ) : (
              <>
                Free{" "}
                <span className="font-medium text-foreground">{table.tableLabel}</span> in
                POS before deleting it.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          {tableIsFree ? (
            <AlertDialogAction
              variant="destructive"
              className="rounded-xl"
              isLoading={mutation.isPending}
              loadingText="Deleting..."
              onClick={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              Delete table
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteServiceTableDialog;
