import { z } from "zod";
import {
  CategoryDTOSchema,
  CreateCategoryDTOSchema,
  UpdateCategoryDTOSchema,
} from "./category.schema";

export type CategoryDTO = z.infer<typeof CategoryDTOSchema>;
export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTOSchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTOSchema>;
