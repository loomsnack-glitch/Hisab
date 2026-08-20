import { useState } from "react";
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
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { serviceAreaKeys, serviceTableKeys } from "@/lib/query-keys";

type DeleteServiceAreaButtonProps = {
  organizationId: string;
  storeId: string;
  area: ServiceAreaDTO;
};

const DeleteServiceAreaButton = ({
  organizationId,
  storeId,
  area,
}: DeleteServiceAreaButtonProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteServiceArea(organizationId, storeId, area.id),
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success(response.message);
        void queryClient.invalidateQueries({
          queryKey: serviceAreaKeys.store(organizationId, storeId),
        });
        void queryClient.invalidateQueries({
          queryKey: serviceTableKeys.store(organizationId, storeId),
        });
        setOpen(false);
        return;
      }

      toast.error(response.message);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to delete service area");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" className="rounded-full">
            <Trash2 className="size-4" />
            Delete
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete area</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{area.title}</span> will be removed from this Store. Tables in this area will become unassigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="rounded-xl"
            isLoading={mutation.isPending}
            loadingText="Deleting..."
            onClick={() => mutation.mutate()}
          >
            Delete area
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteServiceAreaButton;
