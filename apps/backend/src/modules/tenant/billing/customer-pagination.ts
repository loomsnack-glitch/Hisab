import { z } from "zod";
import type { CustomerDTO, CustomerSort } from "@repo/types";

const customerCursorSchema = z.object({
  sort: z
    .enum(["newest", "oldest", "name_asc", "name_desc", "highest_due", "lowest_due"])
    .default("newest"),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  name: z.string().optional(),
  balance: z.number().min(0).optional(),
});

export type CustomerCursor = z.infer<typeof customerCursorSchema>;

type CursorCustomer = Pick<CustomerDTO, "id" | "createdAt"> & {
  cursorCreatedAt?: string;
  name?: string;
  balance?: number | string;
};

export const encodeCustomerCursor = (customer: CursorCustomer, sort: CustomerSort = "newest") =>
  encodeURIComponent(
    JSON.stringify({
      sort,
      id: customer.id,
      createdAt:
        customer.cursorCreatedAt ?? new Date(customer.createdAt).toISOString(),
      name: customer.name,
      balance: customer.balance === undefined ? undefined : Number(customer.balance),
    }),
  );

export const decodeCustomerCursor = (value: string): CustomerCursor | null => {
  try {
    const result = customerCursorSchema.safeParse(
      JSON.parse(decodeURIComponent(value)),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
