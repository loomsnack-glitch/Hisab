import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignServiceTablesToArea } from "@repo/services";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Armchair, Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { serviceTableKeys } from "@/lib/query-keys";

type AssignServiceAreaTablesDialogProps = {
  organizationId: string;
  storeId: string;
  area: ServiceAreaDTO;
  unassignedTables: ServiceTableDTO[];
  hasConfiguredTables: boolean;
};

const AssignServiceAreaTablesDialog = ({
  organizationId,
  storeId,
  area,
  unassignedTables,
  hasConfiguredTables,
}: AssignServiceAreaTablesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) setSelectedTableIds([]);
  }, [open]);

  const mutation = useMutation({
    mutationFn: (tableIds: string[]) =>
      assignServiceTablesToArea(
        { organizationId, storeId, areaId: area.id },
        { tableIds },
      ),
    onSuccess: (response) => {
      if (response.status !== "success") {
        toast.error(response.message);
        return;
      }
      toast.success(response.message ?? "Tables assigned to area");
      void queryClient.invalidateQueries({
        queryKey: serviceTableKeys.store(organizationId, storeId),
      });
      setOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to assign tables to area");
    },
  });

  const toggleTable = (tableId: string) => {
    setSelectedTableIds((current) =>
      current.includes(tableId)
        ? current.filter((id) => id !== tableId)
        : [...current, tableId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-full">
            <Plus className="size-4" />
            Add tables
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader
          icon={<Armchair className="size-5" />}
          title={`Add tables to ${area.title}`}
          subtitle="Only unassigned tables can be added. Remove a table from another area first to move it here."
        />
        {unassignedTables.length === 0 ? (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Armchair />
              </EmptyMedia>
              <EmptyTitle>
                {hasConfiguredTables ? "No unassigned tables" : "No tables configured"}
              </EmptyTitle>
              <EmptyDescription>
                {hasConfiguredTables
                  ? "Remove a table from its current area before assigning it here."
                  : "Add tables on the Tables tab first."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul
            data-testid="unassigned-service-tables"
            className="max-h-72 space-y-2 overflow-y-auto pt-2"
          >
            {unassignedTables.map((table) => {
              const selected = selectedTableIds.includes(table.id);
              return (
                <li key={table.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Unassigned table ${table.tableLabel}`}
                    onClick={() => toggleTable(table.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/60"
                  >
                    <span className="font-display text-base">{table.tableLabel}</span>
                    {selected ? <Check className="size-4 text-primary" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
            type="button"
            className="rounded-xl"
            disabled={mutation.isPending || selectedTableIds.length === 0}
            onClick={() => mutation.mutate(selectedTableIds)}
          >
            {mutation.isPending ? "Adding..." : "Add to area"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignServiceAreaTablesDialog;
