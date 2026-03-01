import { z } from "zod";
import {
  ProductDTOSchema,
  CreateProductDTOSchema,
  UpdateProductDTOSchema,
} from "./product.schema";

export type ProductDTO = z.infer<typeof ProductDTOSchema>;
export type CreateProductDTO = z.infer<typeof CreateProductDTOSchema>;
export type UpdateProductDTO = z.infer<typeof UpdateProductDTOSchema>;
