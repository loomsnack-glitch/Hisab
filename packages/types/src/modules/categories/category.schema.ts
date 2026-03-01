import { z } from "zod";
import { CATEGORY_CONSTANTS } from "./category.constant";

export const CategoryDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string().min(1).max(CATEGORY_CONSTANTS.MAX_NAME_LENGTH),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateCategoryDTOSchema = CategoryDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateCategoryDTOSchema = CategoryDTOSchema.omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
}).partial();
