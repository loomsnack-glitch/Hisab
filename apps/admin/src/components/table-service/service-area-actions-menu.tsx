import { useState } from "react";
import type { ServiceAreaDTO } from "@repo/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import DeleteServiceAreaDialog from "@/components/table-service/delete-service-area-dialog";
import UpsertServiceAreaDialog from "@/components/table-service/upsert-service-area-dialog";

type ServiceAreaActionsMenuProps = {
  organizationId: string;
  storeId: string;
  area: ServiceAreaDTO;
};

const headingClassName =
  "font-display text-left text-sm font-semibold tracking-tight text-foreground sm:text-base";

const menuTriggerClassName =
  "flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

const ServiceAreaActionsMenu = ({
  organizationId,
  storeId,
  area,
}: ServiceAreaActionsMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openEdit = () => {
    setMenuOpen(false);
    setSheetOpen(false);
    setEditOpen(true);
  };

  const openDelete = () => {
    setMenuOpen(false);
    setSheetOpen(false);
    setDeleteOpen(true);
  };

  return (
    <>
      <div className="fine-hover:flex hidden">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Open ${area.title} area menu`}
                className="flex items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className={headingClassName}>{area.title}</span>
                <span className={menuTriggerClassName}>
                  <MoreVertical className="size-3.5" />
                </span>
              </button>
            }
          />
          <DropdownMenuContent align="start" className="w-44 rounded-xl p-1">
            <DropdownMenuItem onClick={openEdit}>
              <Pencil className="size-4" />
              Edit area
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={openDelete}>
              <Trash2 className="size-4" />
              Delete area
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1 fine-hover:hidden">
        <button
          type="button"
          aria-label={`${area.title} area actions`}
          className={headingClassName}
          onClick={() => setSheetOpen(true)}
        >
          {area.title}
        </button>
        <button
          type="button"
          aria-label={`Open ${area.title} area menu`}
          className={menuTriggerClassName}
          onClick={() => setSheetOpen(true)}
        >
          <MoreVertical className="size-3.5" />
        </button>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-md gap-0 overflow-visible border-0 bg-transparent px-4 pt-2 shadow-none data-[side=bottom]:bottom-[var(--pos-mobile-nav-height,0px)] data-[side=bottom]:border-0 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        >
          <SheetTitle className="sr-only">{area.title} area actions</SheetTitle>
          <div className="space-y-2 pb-2">
            <button
              type="button"
              onClick={openEdit}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Pencil className="size-5" />
              </span>
              Edit area
            </button>
            <button
              type="button"
              onClick={openDelete}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </span>
              Delete area
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <UpsertServiceAreaDialog
        organizationId={organizationId}
        storeId={storeId}
        area={area}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={null}
      />
      <DeleteServiceAreaDialog
        organizationId={organizationId}
        storeId={storeId}
        area={area}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
};

export default ServiceAreaActionsMenu;
