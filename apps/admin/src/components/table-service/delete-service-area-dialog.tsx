import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteServiceArea } from "@repo/services";
import type { ServiceAreaDTO } from "@repo/types";
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

import { serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";

type DeleteServiceAreaDialogProps = {
  organizationId: string;
  storeId: string;
  area: ServiceAreaDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DeleteServiceAreaDialog = ({
  organizationId,
  storeId,
  area,
  open,
  onOpenChange,
}: DeleteServiceAreaDialogProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteServiceArea(organizationId, storeId, area.id),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(response.message ?? "Service area deleted");
      void queryClient.invalidateQueries({
        queryKey: serviceAreaKeys.store(organizationId, storeId),
      });
      void queryClient.invalidateQueries({
        queryKey: serviceTableKeys.store(organizationId, storeId),
      });
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to delete service area");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete area</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{area.title}</span> will
            be removed from this Store. Tables in this area will become unassigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
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
            Delete area
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteServiceAreaDialog;
