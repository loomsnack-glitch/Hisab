import type { ServiceTableState } from "@repo/types";

export type PosServiceTableAction = "allocate" | "free";

export const getPosServiceTableAction = (
  state: ServiceTableState,
): PosServiceTableAction | null => {
  if (state === "free") return "allocate";
  if (state === "allocated") return "free";
  return null;
};

export const posServiceTableSimpleToneClassName: Record<ServiceTableState, string> = {
  free: "border-dashed border-muted-foreground/35 bg-muted/70 text-muted-foreground",
  allocated:
    "border-amber-400 bg-amber-200/90 text-amber-950 dark:bg-amber-400/80 dark:text-amber-950",
  engaged:
    "border-yellow-400 bg-yellow-300/90 text-yellow-950 dark:bg-yellow-400/80 dark:text-yellow-950",
  ready_to_bill:
    "border-emerald-400 bg-emerald-200/90 text-emerald-950 dark:bg-emerald-400/70 dark:text-emerald-950",
  payment_due:
    "border-orange-400 bg-orange-200/90 text-orange-950 dark:bg-orange-400/80 dark:text-orange-950",
  paid: "border-sky-400 bg-sky-200/90 text-sky-950 dark:bg-sky-400/70 dark:text-sky-950",
};

export const posServiceTableFloorToneClassName: Record<ServiceTableState, string> = {
  free: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  allocated:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  engaged: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  ready_to_bill:
    "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  payment_due:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  paid: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

export const getPosServiceTableStateLabel = (state: ServiceTableState) => {
  switch (state) {
    case "free":
      return "Free";
    case "allocated":
      return "Allocated";
    case "engaged":
      return "Engaged";
    case "ready_to_bill":
      return "Ready to bill";
    case "payment_due":
      return "Payment due";
    case "paid":
      return "Paid";
  }
};
