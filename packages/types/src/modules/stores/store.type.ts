import { z } from "zod";
import {
  StoreDTOSchema,
  CreateStoreDTOSchema,
  UpdateStoreDTOSchema,
} from "./store.schema";

export type StoreDTO = z.infer<typeof StoreDTOSchema>;
export type CreateStoreDTO = z.infer<typeof CreateStoreDTOSchema>;
export type UpdateStoreDTO = z.infer<typeof UpdateStoreDTOSchema>;
