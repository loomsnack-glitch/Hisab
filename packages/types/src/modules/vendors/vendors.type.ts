import type { z } from "zod";
import type {
  CreateVendorItemSchema,
  CreateVendorSchema,
  VendorDTOSchema,
  VendorItemDTOSchema,
  VendorItemStatusSchema,
  VendorStatusSchema,
  UpdateVendorItemSchema,
  UpdateVendorSchema,
} from "./vendors.schema";

export type VendorStatus = z.infer<typeof VendorStatusSchema>;
export type VendorDTO = z.infer<typeof VendorDTOSchema>;

export type CreateVendorJSON = z.infer<typeof CreateVendorSchema>;
export type CreateVendorSVC = CreateVendorJSON;
export type CreateVendorREPO = Pick<
  VendorDTO,
  "id" | "organizationId" | "name" | "description" | "status" | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateVendorJSON = z.infer<typeof UpdateVendorSchema>;
export type UpdateVendorSVC = UpdateVendorJSON;
export type UpdateVendorREPO = Pick<
  VendorDTO,
  "id" | "organizationId" | "name" | "description" | "status" | "updatedBy"
>;

export type VendorsListResponse = {
  vendors: VendorDTO[];
};

export type VendorResponse = {
  vendor: VendorDTO;
};

export type VendorItemStatus = z.infer<typeof VendorItemStatusSchema>;
export type VendorItemDTO = z.infer<typeof VendorItemDTOSchema>;

export type CreateVendorItemJSON = z.infer<typeof CreateVendorItemSchema>;
export type CreateVendorItemSVC = CreateVendorItemJSON;
export type CreateVendorItemREPO = Pick<
  VendorItemDTO,
  | "id"
  | "organizationId"
  | "vendorId"
  | "name"
  | "unitId"
  | "defaultPurchasePrice"
  | "status"
  | "createdBy"
> & {
  updatedBy?: string | null;
};

export type UpdateVendorItemJSON = z.infer<typeof UpdateVendorItemSchema>;
export type UpdateVendorItemSVC = UpdateVendorItemJSON;
export type UpdateVendorItemREPO = Pick<
  VendorItemDTO,
  | "id"
  | "organizationId"
  | "name"
  | "unitId"
  | "defaultPurchasePrice"
  | "status"
  | "updatedBy"
>;

export type VendorItemsListResponse = {
  vendorItems: VendorItemDTO[];
};

export type VendorItemResponse = {
  vendorItem: VendorItemDTO;
};
