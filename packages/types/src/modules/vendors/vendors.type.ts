import type { z } from "zod";
import type {
  CreateVendorItemSchema,
  CreateVendorSchema,
  StoreVendorAvailabilityDTOSchema,
  StoreVendorAvailabilityResponseDTOSchema,
  StoreVendorItemOfferingDTOSchema,
  StoreVendorItemOfferingResponseDTOSchema,
  VendorDTOSchema,
  VendorItemDTOSchema,
  VendorItemListQuerySchema,
  VendorItemStatusSchema,
  VendorListPageInfoSchema,
  VendorListQuerySchema,
  VendorStatusSchema,
  UpdateStoreVendorAvailabilitySchema,
  UpdateStoreVendorItemOfferingSchema,
  UpdateVendorItemSchema,
  UpdateVendorSchema,
} from "./vendors.schema";

export type VendorStatus = z.infer<typeof VendorStatusSchema>;
export type VendorDTO = z.infer<typeof VendorDTOSchema>;
export type VendorListQuery = z.infer<typeof VendorListQuerySchema>;
export type VendorListPageInfo = z.infer<typeof VendorListPageInfoSchema>;

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
  pageInfo?: VendorListPageInfo;
};

export type VendorResponse = {
  vendor: VendorDTO;
};

export type VendorItemStatus = z.infer<typeof VendorItemStatusSchema>;
export type VendorItemDTO = z.infer<typeof VendorItemDTOSchema>;
export type VendorItemListQuery = z.infer<typeof VendorItemListQuerySchema>;
export type VendorItemListPageInfo = VendorListPageInfo;

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
  pageInfo?: VendorItemListPageInfo;
};

export type VendorItemResponse = {
  vendorItem: VendorItemDTO;
};

export type StoreVendorAvailabilityDTO = z.infer<typeof StoreVendorAvailabilityDTOSchema>;
export type StoreVendorAvailabilityResponseDTO = z.infer<
  typeof StoreVendorAvailabilityResponseDTOSchema
>;

export type UpdateStoreVendorAvailabilityJSON = z.infer<
  typeof UpdateStoreVendorAvailabilitySchema
>;
export type UpdateStoreVendorAvailabilitySVC = UpdateStoreVendorAvailabilityJSON;
export type CreateStoreVendorAvailabilityREPO = Pick<
  StoreVendorAvailabilityDTO,
  "id" | "organizationId" | "storeId" | "vendorId" | "status" | "createdBy"
> & {
  updatedBy?: string | null;
};
export type UpdateStoreVendorAvailabilityREPO = Pick<
  StoreVendorAvailabilityDTO,
  "id" | "organizationId" | "storeId" | "status" | "updatedBy"
>;

export type StoreVendorAvailabilitiesListResponse = {
  availabilities: StoreVendorAvailabilityResponseDTO[];
};

export type StoreVendorAvailabilityResponse = {
  availability: StoreVendorAvailabilityResponseDTO;
};

export type StoreVendorItemOfferingDTO = z.infer<typeof StoreVendorItemOfferingDTOSchema>;
export type StoreVendorItemOfferingResponseDTO = z.infer<
  typeof StoreVendorItemOfferingResponseDTOSchema
>;

export type UpdateStoreVendorItemOfferingJSON = z.infer<
  typeof UpdateStoreVendorItemOfferingSchema
>;
export type UpdateStoreVendorItemOfferingSVC = UpdateStoreVendorItemOfferingJSON;
export type CreateStoreVendorItemOfferingREPO = Pick<
  StoreVendorItemOfferingDTO,
  | "id"
  | "organizationId"
  | "storeId"
  | "vendorId"
  | "vendorItemId"
  | "defaultPurchasePrice"
  | "createdBy"
> & {
  updatedBy?: string | null;
};
export type UpdateStoreVendorItemOfferingREPO = Pick<
  StoreVendorItemOfferingDTO,
  "id" | "organizationId" | "storeId" | "defaultPurchasePrice" | "updatedBy"
>;

export type StoreVendorItemOfferingsListResponse = {
  offerings: StoreVendorItemOfferingResponseDTO[];
};

export type StoreVendorItemOfferingResponse = {
  offering: StoreVendorItemOfferingResponseDTO;
};
