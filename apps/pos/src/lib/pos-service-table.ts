import type { ServiceTableState } from "@repo/types";
import { hasActiveTableWorkspace } from "./pos-table-kot";

export type PosServiceTableAction = "allocate" | "free";

export type PosServiceTableLegendItem = {
  key: Exclude<ServiceTableState, "ready_to_bill">;
  label: string;
  meaning: string;
  swatchClassName: string;
};

const engagedSimpleToneClassName =
  "border-yellow-200/90 bg-yellow-50/90 text-yellow-950 border-l-yellow-400 dark:border-yellow-800/70 dark:bg-yellow-950/25 dark:text-yellow-50 dark:border-l-yellow-400";
const engagedStatusDotClassName = "bg-yellow-400 ring-yellow-500/30";

export const getPosServiceTableAction = (
  state: ServiceTableState,
): PosServiceTableAction | null => {
  if (state === "free") return "allocate";
  if (state === "allocated") return "free";
  return null;
};

export const posServiceTableSimpleToneClassName: Record<ServiceTableState, string> = {
  free: "border-dashed border-muted-foreground/30 bg-card text-muted-foreground",
  allocated:
    "border-amber-200/90 bg-amber-50/80 text-amber-950 border-l-amber-400 dark:border-amber-800/70 dark:bg-amber-950/25 dark:text-amber-50 dark:border-l-amber-400",
  engaged: engagedSimpleToneClassName,
  ready_to_bill: engagedSimpleToneClassName,
  payment_due:
    "border-orange-200/90 bg-orange-50/85 text-orange-950 border-l-orange-500 dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-orange-50 dark:border-l-orange-400",
  paid: "border-sky-200/90 bg-sky-50/85 text-sky-950 border-l-sky-400 dark:border-sky-800/70 dark:bg-sky-950/25 dark:text-sky-50 dark:border-l-sky-400",
};

export const posServiceTableStatusDotClassName: Record<ServiceTableState, string> = {
  free: "bg-muted-foreground/45 ring-muted-foreground/20",
  allocated: "bg-amber-400 ring-amber-500/30",
  engaged: engagedStatusDotClassName,
  ready_to_bill: engagedStatusDotClassName,
  payment_due: "bg-orange-500 ring-orange-500/30",
  paid: "bg-sky-400 ring-sky-500/30",
};

export const posServiceTableLegendItems: PosServiceTableLegendItem[] = [
  {
    key: "free",
    label: "Free",
    meaning: "Available to seat",
    swatchClassName: posServiceTableStatusDotClassName.free,
  },
  {
    key: "allocated",
    label: "Allocated",
    meaning: "Seated, no order yet",
    swatchClassName: posServiceTableStatusDotClassName.allocated,
  },
  {
    key: "engaged",
    label: "Engaged",
    meaning: "Order in progress",
    swatchClassName: posServiceTableStatusDotClassName.engaged,
  },
  {
    key: "payment_due",
    label: "Payment due",
    meaning: "Bill still outstanding",
    swatchClassName: posServiceTableStatusDotClassName.payment_due,
  },
  {
    key: "paid",
    label: "Paid",
    meaning: "Paid, waiting to clear",
    swatchClassName: posServiceTableStatusDotClassName.paid,
  },
];

export const getPosServiceTableStateLabel = (state: ServiceTableState) => {
  switch (state) {
    case "free":
      return "Free";
    case "allocated":
      return "Allocated";
    case "engaged":
    case "ready_to_bill":
      return "Engaged";
    case "payment_due":
      return "Payment due";
    case "paid":
      return "Paid";
  }
};

export const shouldReturnToPosTablesAfterSale = (sale: {
  serviceTableId?: string | null;
}) => Boolean(sale.serviceTableId);

export { hasActiveTableWorkspace };
