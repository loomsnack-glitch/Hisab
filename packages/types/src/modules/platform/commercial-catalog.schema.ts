import { z } from "zod";
import { dtoDateSchema } from "../../common";

export const COMMERCIAL_CATALOG_KEY_MAX_LENGTH = 64;
export const COMMERCIAL_CATALOG_DISPLAY_NAME_MAX_LENGTH = 255;
export const COMMERCIAL_CATALOG_DESCRIPTION_MAX_LENGTH = 2000;
export const COMMERCIAL_CATALOG_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
export const COMMERCIAL_CATALOG_KEY_MESSAGE =
    "Commercial Catalog Key must be lowercase letters, digits, and underscores, starting with a letter";

export const CommercialCatalogRevisionStatusSchema = z.enum(["draft", "active", "retired", "discarded"]);

export const commercialCatalogCurrentRevisionRank = (
    status: z.infer<typeof CommercialCatalogRevisionStatusSchema>,
): number => {
    if (status === "draft") return 0;
    if (status === "active") return 1;
    if (status === "retired") return 2;
    return 3;
};

export const CommercialFeatureListStatusFilterSchema = z.enum([
    "all",
    ...CommercialCatalogRevisionStatusSchema.options,
]);

export const CommercialCatalogKeySchema = z
    .string()
    .trim()
    .min(1, "Commercial Catalog Key is required")
    .max(COMMERCIAL_CATALOG_KEY_MAX_LENGTH, `Commercial Catalog Key must be at most ${COMMERCIAL_CATALOG_KEY_MAX_LENGTH} characters`)
    .regex(COMMERCIAL_CATALOG_KEY_PATTERN, COMMERCIAL_CATALOG_KEY_MESSAGE);

export const CommercialCatalogDisplayNameSchema = z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(
        COMMERCIAL_CATALOG_DISPLAY_NAME_MAX_LENGTH,
        `Display name must be at most ${COMMERCIAL_CATALOG_DISPLAY_NAME_MAX_LENGTH} characters`,
    );

export const CommercialCatalogDescriptionSchema = z
    .string()
    .trim()
    .max(
        COMMERCIAL_CATALOG_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${COMMERCIAL_CATALOG_DESCRIPTION_MAX_LENGTH} characters`,
    );

export const CreateCommercialFeatureSchema = z
    .object({
        key: CommercialCatalogKeySchema,
        displayName: CommercialCatalogDisplayNameSchema,
        description: CommercialCatalogDescriptionSchema.default(""),
    })
    .strict();

export const UpdateCommercialFeatureDraftSchema = z
    .object({
        displayName: CommercialCatalogDisplayNameSchema,
        description: CommercialCatalogDescriptionSchema,
    })
    .strict();

export const CommercialFeatureListQuerySchema = z.object({
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    status: CommercialFeatureListStatusFilterSchema.default("all"),
});

export const CommercialCatalogAuditActorDTOSchema = z.object({
    id: z.uuid("Invalid Owner User id"),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
});

export const CommercialFeatureRevisionDTOSchema = z.object({
    id: z.uuid("Invalid Feature revision id"),
    featureId: z.uuid("Invalid Feature id"),
    key: CommercialCatalogKeySchema,
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
    createdBy: CommercialCatalogAuditActorDTOSchema,
    createdAt: dtoDateSchema,
    publishedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    publishedAt: dtoDateSchema.nullable(),
    retiredBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    retiredAt: dtoDateSchema.nullable(),
    discardedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    discardedAt: dtoDateSchema.nullable(),
});

export const CommercialFeatureListItemDTOSchema = z.object({
    id: z.uuid("Invalid Feature id"),
    key: CommercialCatalogKeySchema,
    currentRevisionId: z.uuid("Invalid Feature revision id"),
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
});

export const CommercialFeatureListDTOSchema = z.object({
    features: z.array(CommercialFeatureListItemDTOSchema),
});

export const CommercialFeatureDetailDTOSchema = z.object({
    id: z.uuid("Invalid Feature id"),
    key: CommercialCatalogKeySchema,
    currentRevision: CommercialFeatureRevisionDTOSchema,
    revisions: z.array(CommercialFeatureRevisionDTOSchema),
});

export const CommercialFeatureDetailResponseSchema = z.object({
    feature: CommercialFeatureDetailDTOSchema,
});
