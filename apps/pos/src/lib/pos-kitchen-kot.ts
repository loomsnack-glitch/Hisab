import type { KotFulfillmentType } from "@repo/types";

export const getKitchenKotContext = ({
  fulfillmentType,
  tableLabel,
}: {
  fulfillmentType: KotFulfillmentType;
  tableLabel: string | null;
}) => {
  if (fulfillmentType === "pick_up") {
    return { label: "Order type", value: "Parcel" };
  }
  if (tableLabel) {
    return { label: "Table", value: tableLabel };
  }
  return { label: "Order type", value: "Dine-In" };
};
