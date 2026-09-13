import { z } from "zod";
import { dtoDateSchema } from "../../common";
import { UnitStatusSchema } from "../units/units.schema";

export const VENDOR_NAME_MAX_LENGTH = 255;
export const VENDOR_DESCRIPTION_MAX_LENGTH = 1000;
export const VENDOR_ITEM_NAME_MAX_LENGTH = 255;

export const VendorStatusSchema = z.enum(["active", "inactive"]);

const vendorListArrayQueryPreprocess = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return value;
};

const vendorListLimitSchema = z.coerce
  .number({ error: "Limit must be a number" })
  .int("Limit must be a whole number")
  .min(1, "Limit must be at least 1")
  .max(100, "Limit must be at most 100");

export const VendorStatusesQuerySchema = z.preprocess(
  vendorListArrayQueryPreprocess,
  z.array(VendorStatusSchema).optional(),
);

export const VendorListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(255, "Search must be at most 255 characters")
    .optional(),
  statuses: VendorStatusesQuerySchema,
  page: z.coerce.number().int().min(1).optional(),
  limit: vendorListLimitSchema.optional(),
});

export const VendorListPageInfoSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).optional(),
  totalPages: z.number().int().min(0).optional(),
});

export type SerializedVendorListQueryParams<
  T extends {
    statuses?: readonly string[];
  },
> = Omit<T, "statuses"> & {
  statuses?: string;
};

export const serializeVendorListQueryParams = <
  T extends {
    statuses?: readonly string[];
  },
>(
  query?: T,
): SerializedVendorListQueryParams<T> | undefined => {
  if (!query) {
    return undefined;
  }

  const { statuses, ...queryWithoutArrayFilters } = query;

  return {
    ...queryWithoutArrayFilters,
    ...(statuses?.length ? { statuses: statuses.join(",") } : {}),
  };
};

const vendorNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(VENDOR_NAME_MAX_LENGTH, `Name must be at most ${VENDOR_NAME_MAX_LENGTH} characters`);

const vendorDescriptionSchema = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(
        VENDOR_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${VENDOR_DESCRIPTION_MAX_LENGTH} characters`,
      ),
  ])
  .nullable()
  .optional();

export const VendorDTOSchema = z.object({
  id: z.uuid("Invalid vendor id"),
  organizationId: z.uuid("Invalid organization id"),
  name: vendorNameSchema,
  description: z.string().nullable(),
  status: VendorStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateVendorSchema = z
  .object({
    name: vendorNameSchema,
    description: vendorDescriptionSchema,
    status: VendorStatusSchema.optional(),
  })
  .strict();

export const UpdateVendorSchema = z
  .object({
    name: vendorNameSchema.optional(),
    description: vendorDescriptionSchema,
    status: VendorStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );

export const VendorItemStatusSchema = z.enum(["active", "inactive"]);

export const VendorItemStatusesQuerySchema = z.preprocess(
  vendorListArrayQueryPreprocess,
  z.array(VendorItemStatusSchema).optional(),
);

export const VendorItemVendorIdsQuerySchema = z.preprocess(
  vendorListArrayQueryPreprocess,
  z.array(z.uuid("Invalid vendor id")).optional(),
);

export const VendorItemListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(255, "Search must be at most 255 characters")
    .optional(),
  statuses: VendorItemStatusesQuerySchema,
  vendorIds: VendorItemVendorIdsQuerySchema,
  page: z.coerce.number().int().min(1).optional(),
  limit: vendorListLimitSchema.optional(),
});

export type SerializedVendorItemListQueryParams<
  T extends {
    statuses?: readonly string[];
    vendorIds?: readonly string[];
  },
> = Omit<T, "statuses" | "vendorIds"> & {
  statuses?: string;
  vendorIds?: string;
};

export const serializeVendorItemListQueryParams = <
  T extends {
    statuses?: readonly string[];
    vendorIds?: readonly string[];
  },
>(
  query?: T,
): SerializedVendorItemListQueryParams<T> | undefined => {
  if (!query) {
    return undefined;
  }

  const { statuses, vendorIds, ...queryWithoutArrayFilters } = query;

  return {
    ...queryWithoutArrayFilters,
    ...(statuses?.length ? { statuses: statuses.join(",") } : {}),
    ...(vendorIds?.length ? { vendorIds: vendorIds.join(",") } : {}),
  };
};

const vendorItemNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    VENDOR_ITEM_NAME_MAX_LENGTH,
    `Name must be at most ${VENDOR_ITEM_NAME_MAX_LENGTH} characters`,
  );

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const vendorItemDefaultPurchasePriceSchema = z
  .number({ error: "Default purchase price is required" })
  .min(0, "Default purchase price must be 0 or more")
  .refine(isAtMostTwoDecimalPlaces, {
    message: "Default purchase price must have at most two decimal places",
  });

export const isVendorItemAvailableForFutureSelection = (input: {
  itemStatus: z.infer<typeof VendorItemStatusSchema>;
  vendorStatus: z.infer<typeof VendorStatusSchema>;
}): boolean => input.itemStatus === "active" && input.vendorStatus === "active";

export const canAssignUnitToVendorItem = (input: {
  unitStatus: z.infer<typeof UnitStatusSchema>;
  currentlyAssigned?: boolean;
}): boolean => input.currentlyAssigned === true || input.unitStatus === "active";

export const VendorItemDTOSchema = z.object({
  id: z.uuid("Invalid vendor item id"),
  organizationId: z.uuid("Invalid organization id"),
  vendorId: z.uuid("Invalid vendor id"),
  name: vendorItemNameSchema,
  unitId: z.uuid("Invalid unit id"),
  defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
  status: VendorItemStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const CreateVendorItemSchema = z
  .object({
    vendorId: z.uuid("Invalid vendor id"),
    name: vendorItemNameSchema,
    unitId: z.uuid("Invalid unit id"),
    defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
    status: VendorItemStatusSchema.optional(),
  })
  .strict();

export const UpdateVendorItemSchema = z
  .object({
    name: vendorItemNameSchema.optional(),
    unitId: z.uuid("Invalid unit id").optional(),
    defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema.optional(),
    status: VendorItemStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.unitId !== undefined ||
      value.defaultPurchasePrice !== undefined ||
      value.status !== undefined,
    { message: "At least one field is required" },
  );

export const StoreVendorAvailabilityStatusSchema = VendorStatusSchema;

export const StoreVendorAvailabilityDTOSchema = z.object({
  id: z.uuid("Invalid availability id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  vendorId: z.uuid("Invalid vendor id"),
  status: StoreVendorAvailabilityStatusSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreVendorAvailabilityResponseDTOSchema = StoreVendorAvailabilityDTOSchema.extend({
  vendor: VendorDTOSchema,
});

export const UpdateStoreVendorAvailabilitySchema = z
  .object({
    status: StoreVendorAvailabilityStatusSchema,
  })
  .strict();

export const StoreVendorItemOfferingDTOSchema = z.object({
  id: z.uuid("Invalid offering id"),
  organizationId: z.uuid("Invalid organization id"),
  storeId: z.uuid("Invalid store id"),
  vendorId: z.uuid("Invalid vendor id"),
  vendorItemId: z.uuid("Invalid vendor item id"),
  defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
  createdBy: z.uuid("Invalid creator id"),
  updatedBy: z.uuid("Invalid updater id").nullable().optional(),
  createdAt: dtoDateSchema,
  updatedAt: dtoDateSchema,
});

export const StoreVendorItemOfferingResponseDTOSchema = StoreVendorItemOfferingDTOSchema.extend({
  vendorItem: VendorItemDTOSchema,
});

export const UpdateStoreVendorItemOfferingSchema = z
  .object({
    defaultPurchasePrice: vendorItemDefaultPurchasePriceSchema,
  })
  .strict();

export const isStoreVendorAvailabilityActive = (input: {
  availabilityStatus: z.infer<typeof StoreVendorAvailabilityStatusSchema>;
}): boolean => input.availabilityStatus === "active";

export const isVendorSelectableForStorePurchase = (input: {
  vendorStatus: z.infer<typeof VendorStatusSchema>;
  availabilityStatus: z.infer<typeof StoreVendorAvailabilityStatusSchema>;
}): boolean =>
  input.vendorStatus === "active" &&
  isStoreVendorAvailabilityActive({
    availabilityStatus: input.availabilityStatus,
  });

export const overlayStoreVendorItemOfferingPrices = <
  T extends { id: string; defaultPurchasePrice: number },
>(
  vendorItems: T[],
  offerings: Array<{ vendorItemId: string; defaultPurchasePrice: number }>,
): T[] => {
  const offeringByVendorItemId = new Map(
    offerings.map((offering) => [offering.vendorItemId, offering]),
  );

  return vendorItems.flatMap((vendorItem) => {
    const offering = offeringByVendorItemId.get(vendorItem.id);
    if (!offering) {
      return [];
    }

    return [
      {
        ...vendorItem,
        defaultPurchasePrice: offering.defaultPurchasePrice,
      },
    ];
  });
};
