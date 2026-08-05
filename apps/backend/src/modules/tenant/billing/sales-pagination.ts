import { z } from "zod";
import type { SaleSummaryDTO, SalesSort } from "@repo/types";

const salesCursorSchema = z.object({
  sort: z.enum(["newest", "oldest", "highest", "lowest"]),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  grandTotal: z.number().min(0),
});

export type SalesCursor = z.infer<typeof salesCursorSchema>;

type CursorSale = Pick<SaleSummaryDTO, "id" | "createdAt" | "grandTotal"> & {
    cursorCreatedAt?: string;
};

export const encodeSalesCursor = (sale: CursorSale, sort: SalesSort) =>
    encodeURIComponent(
        JSON.stringify({
            sort,
            id: sale.id,
            createdAt: sale.cursorCreatedAt ?? new Date(sale.createdAt).toISOString(),
            grandTotal: sale.grandTotal,
        }),
    );

export const decodeSalesCursor = (value: string): SalesCursor | null => {
  try {
    const result = salesCursorSchema.safeParse(
      JSON.parse(decodeURIComponent(value)),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
