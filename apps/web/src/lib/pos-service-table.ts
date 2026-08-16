import type { ServiceTableState } from "@repo/types";

export type PosServiceTableAction = "allocate" | "free";

export const getPosServiceTableAction = (
  state: ServiceTableState,
): PosServiceTableAction | null => {
  if (state === "free") return "allocate";
  if (state === "allocated") return "free";
  return null;
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
