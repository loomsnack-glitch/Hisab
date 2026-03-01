import { z } from "zod";
import { STORE_CONSTANTS } from "./store.constant";

export const StoreDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(1).max(STORE_CONSTANTS.MAX_NAME_LENGTH),
  address: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateStoreDTOSchema = StoreDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateStoreDTOSchema = StoreDTOSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
}).partial();
