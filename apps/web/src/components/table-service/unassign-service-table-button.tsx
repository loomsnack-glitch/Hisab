import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unassignServiceTableFromArea } from "@repo/services";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

import { serviceTableKeys } from "@/lib/query-keys";

type UnassignServiceTableButtonProps = {
  organizationId: string;
  storeId: string;
  area: ServiceAreaDTO;
  table: ServiceTableDTO;
};

const UnassignServiceTableButton = ({
  organizationId,
  storeId,
  area,
  table,
}: UnassignServiceTableButtonProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      unassignServiceTableFromArea({
        organizationId,
        storeId,
        areaId: area.id,
        tableId: table.id,
      }),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(response.message ?? "Table removed from area");
      void queryClient.invalidateQueries({
        queryKey: serviceTableKeys.store(organizationId, storeId),
      });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to remove table from area");
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? "Removing..." : "Remove"}
    </Button>
  );
};

export default UnassignServiceTableButton;
