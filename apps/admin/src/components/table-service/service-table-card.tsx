import { useState } from "react";
import type { ServiceAreaDTO, ServiceTableDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { Pencil, Trash2, Users } from "lucide-react";

import DeleteServiceTableDialog from "@/components/table-service/delete-service-table-dialog";
import UpsertServiceTableDialog from "@/components/table-service/upsert-service-table-dialog";

type ServiceTableTileProps = {
  table: ServiceTableDTO;
};

export const ServiceTableTile = ({ table }: ServiceTableTileProps) => (
  <div
    role="listitem"
    aria-label={`Table ${table.tableLabel}`}
    className="group relative flex aspect-square min-h-24 w-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-2 text-center shadow-2xs transition-colors duration-200 hover:border-border hover:bg-card/95"
  >
    {table.capacity !== null ? (
      <Badge
        variant="outline"
        className="absolute top-1.5 left-1.5 z-10 rounded-full border-border/60 bg-card/90 px-1.5 py-0 text-[10px] font-semibold text-muted-foreground shadow-xs backdrop-blur-sm"
      >
        <Users className="size-3" />
        {table.capacity}
      </Badge>
    ) : null}
    <div className="flex size-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 sm:size-14">
      <span className="font-display text-base font-bold leading-none text-primary sm:text-lg">
        {table.tableLabel}
      </span>
    </div>
  </div>
);

type ServiceTableCardProps = {
  organizationId: string;
  storeId: string;
  areas: ServiceAreaDTO[];
  table: ServiceTableDTO;
};

const hoverActionClassName =
  "flex size-7 items-center justify-center rounded-full transition-colors";

const ServiceTableCard = ({
  organizationId,
  storeId,
  areas,
  table,
}: ServiceTableCardProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const openEdit = () => {
    setMobileActionsOpen(false);
    setEditOpen(true);
  };

  const openDelete = () => {
    setMobileActionsOpen(false);
    setDeleteOpen(true);
  };

  return (
    <div className="group relative">
      <ServiceTableTile table={table} />
      <div className="pointer-events-none absolute top-1.5 right-1.5 z-20 hidden gap-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 fine-hover:flex">
        <button
          type="button"
          aria-label={`Edit table ${table.tableLabel}`}
          className={`${hoverActionClassName} text-emerald-600/70 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400/80 dark:hover:text-emerald-400`}
          onClick={openEdit}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Delete table ${table.tableLabel}`}
          className={`${hoverActionClassName} text-destructive/70 hover:bg-destructive/10 hover:text-destructive`}
          onClick={openDelete}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        aria-label={`Table ${table.tableLabel} actions`}
        className="absolute inset-0 z-10 rounded-2xl fine-hover:hidden"
        onClick={() => setMobileActionsOpen(true)}
      />
      <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-md gap-0 overflow-visible border-0 bg-transparent px-4 pt-2 shadow-none data-[side=bottom]:bottom-[var(--pos-mobile-nav-height,0px)] data-[side=bottom]:border-0 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        >
          <SheetTitle className="sr-only">
            Table {table.tableLabel} actions
          </SheetTitle>
          <div className="space-y-2 pb-2">
            <button
              type="button"
              onClick={openEdit}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Pencil className="size-5" />
              </span>
              Edit table
            </button>
            <button
              type="button"
              onClick={openDelete}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </span>
              Delete table
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <UpsertServiceTableDialog
        organizationId={organizationId}
        storeId={storeId}
        areas={areas}
        table={table}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={null}
      />
      <DeleteServiceTableDialog
        organizationId={organizationId}
        storeId={storeId}
        table={table}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
};

export default ServiceTableCard;
