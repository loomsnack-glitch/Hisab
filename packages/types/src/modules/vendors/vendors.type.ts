import type { z } from "zod";
import type {
  CreateVendorSchema,
  VendorDTOSchema,
  VendorStatusSchema,
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
