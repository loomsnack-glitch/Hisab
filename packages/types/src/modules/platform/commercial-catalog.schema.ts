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

export const CommercialCatalogListStatusFilterSchema = CommercialFeatureListStatusFilterSchema;

export const CommercialCatalogPriceInrSchema = z
    .number({ error: "Price is required" })
    .min(0, "Price must be 0 or more")
    .refine((value) => Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6, {
        message: "Price must have at most two decimal places",
    });

export const CommercialCatalogTermUnitSchema = z.enum(["day", "month", "year"]);

export const CommercialCatalogTermSchema = z
    .object({
        count: z
            .number({ error: "Term count is required" })
            .int("Term count must be a whole number")
            .min(1, "Term must be at least 1"),
        unit: CommercialCatalogTermUnitSchema,
    })
    .strict();

export const CommercialCatalogReferenceDTOSchema = z.object({
    id: z.uuid("Invalid catalog id"),
    key: CommercialCatalogKeySchema,
    revisionId: z.uuid("Invalid catalog revision id"),
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
});

export const CommercialFeatureDetailDTOSchema = z.object({
    id: z.uuid("Invalid Feature id"),
    key: CommercialCatalogKeySchema,
    currentRevision: CommercialFeatureRevisionDTOSchema,
    revisions: z.array(CommercialFeatureRevisionDTOSchema),
    referencingModules: z.array(CommercialCatalogReferenceDTOSchema),
    affectedPlans: z.array(CommercialCatalogReferenceDTOSchema),
});

export const CommercialFeatureDetailResponseSchema = z.object({
    feature: CommercialFeatureDetailDTOSchema,
});

const uniqueFeatureRevisionIds = (ids: string[]) => new Set(ids).size === ids.length;

export const CommercialModuleFeatureMembershipDTOSchema = z.object({
    featureId: z.uuid("Invalid Feature id"),
    featureRevisionId: z.uuid("Invalid Feature revision id"),
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
});

export const CommercialModuleRevisionDTOSchema = z.object({
    id: z.uuid("Invalid Module revision id"),
    moduleId: z.uuid("Invalid Module id"),
    key: CommercialCatalogKeySchema,
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
    isSeparatelyPurchasable: z.boolean(),
    priceInr: CommercialCatalogPriceInrSchema.nullable(),
    term: CommercialCatalogTermSchema.nullable(),
    features: z.array(CommercialModuleFeatureMembershipDTOSchema).min(1),
    createdBy: CommercialCatalogAuditActorDTOSchema,
    createdAt: dtoDateSchema,
    publishedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    publishedAt: dtoDateSchema.nullable(),
    retiredBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    retiredAt: dtoDateSchema.nullable(),
    discardedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    discardedAt: dtoDateSchema.nullable(),
});

export const CommercialModuleListItemDTOSchema = z.object({
    id: z.uuid("Invalid Module id"),
    key: CommercialCatalogKeySchema,
    currentRevisionId: z.uuid("Invalid Module revision id"),
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
    isSeparatelyPurchasable: z.boolean(),
    priceInr: CommercialCatalogPriceInrSchema.nullable(),
    term: CommercialCatalogTermSchema.nullable(),
});

export const CommercialModuleListDTOSchema = z.object({
    modules: z.array(CommercialModuleListItemDTOSchema),
});

export const CommercialModuleDetailDTOSchema = z.object({
    id: z.uuid("Invalid Module id"),
    key: CommercialCatalogKeySchema,
    currentRevision: CommercialModuleRevisionDTOSchema,
    revisions: z.array(CommercialModuleRevisionDTOSchema),
    referencingPlans: z.array(CommercialCatalogReferenceDTOSchema),
});

export const CommercialModuleDetailResponseSchema = z.object({
    module: CommercialModuleDetailDTOSchema,
});

export const CommercialModuleListQuerySchema = z.object({
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    status: CommercialCatalogListStatusFilterSchema.default("all"),
});

const commercialModuleFeatureRevisionIdsSchema = z
    .array(z.uuid("Invalid Feature revision id"))
    .min(1, "A Module must include at least one Feature revision")
    .refine(uniqueFeatureRevisionIds, {
        message: "A Module can include a Feature revision only once",
    });

const commercialModuleWritableFields = {
    displayName: CommercialCatalogDisplayNameSchema,
    description: CommercialCatalogDescriptionSchema,
    featureRevisionIds: commercialModuleFeatureRevisionIdsSchema,
    isSeparatelyPurchasable: z.boolean(),
    priceInr: CommercialCatalogPriceInrSchema.nullable().optional(),
    term: CommercialCatalogTermSchema.nullable().optional(),
};

const refineModuleCommercialFields = (
    value: {
        isSeparatelyPurchasable: boolean;
        priceInr?: number | null;
        term?: { count: number; unit: "day" | "month" | "year" } | null;
    },
    ctx: z.RefinementCtx,
) => {
    if (value.isSeparatelyPurchasable) {
        if (value.priceInr === undefined || value.priceInr === null) {
            ctx.addIssue({
                code: "custom",
                path: ["priceInr"],
                message: "Separately purchasable Modules require a price in INR",
            });
        }
        if (value.term === undefined || value.term === null) {
            ctx.addIssue({
                code: "custom",
                path: ["term"],
                message: "Separately purchasable Modules require a calendar term",
            });
        }
        return;
    }
    if (value.priceInr != null) {
        ctx.addIssue({
            code: "custom",
            path: ["priceInr"],
            message: "A Module that is not separately purchasable cannot have a price",
        });
    }
    if (value.term != null) {
        ctx.addIssue({
            code: "custom",
            path: ["term"],
            message: "A Module that is not separately purchasable cannot have a calendar term",
        });
    }
};

const normalizeModuleCommercialFields = <
    T extends {
        isSeparatelyPurchasable: boolean;
        priceInr?: number | null;
        term?: { count: number; unit: "day" | "month" | "year" } | null;
    },
>(
    value: T,
) =>
    value.isSeparatelyPurchasable
        ? { ...value, priceInr: value.priceInr ?? null, term: value.term ?? null }
        : { ...value, priceInr: null, term: null };

export const CreateCommercialModuleSchema = z
    .object({
        key: CommercialCatalogKeySchema,
        ...commercialModuleWritableFields,
        description: CommercialCatalogDescriptionSchema.default(""),
    })
    .strict()
    .superRefine(refineModuleCommercialFields)
    .transform(normalizeModuleCommercialFields);

export const UpdateCommercialModuleDraftSchema = z
    .object(commercialModuleWritableFields)
    .strict()
    .superRefine(refineModuleCommercialFields)
    .transform(normalizeModuleCommercialFields);

export const CommercialPlanTypeSchema = z.enum(["trial", "paid"]);

const uniqueModuleRevisionIds = (ids: string[]) => new Set(ids).size === ids.length;

export const CommercialPlanModuleMembershipDTOSchema = z.object({
    moduleId: z.uuid("Invalid Module id"),
    moduleRevisionId: z.uuid("Invalid Module revision id"),
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    features: z.array(CommercialModuleFeatureMembershipDTOSchema).min(1),
});

export const CommercialPlanRevisionDTOSchema = z.object({
    id: z.uuid("Invalid Plan revision id"),
    planId: z.uuid("Invalid Plan id"),
    key: CommercialCatalogKeySchema,
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
    planType: CommercialPlanTypeSchema,
    priceInr: CommercialCatalogPriceInrSchema,
    term: CommercialCatalogTermSchema,
    modules: z.array(CommercialPlanModuleMembershipDTOSchema).min(1),
    resolvedFeatures: z.array(CommercialModuleFeatureMembershipDTOSchema).min(1),
    createdBy: CommercialCatalogAuditActorDTOSchema,
    createdAt: dtoDateSchema,
    publishedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    publishedAt: dtoDateSchema.nullable(),
    retiredBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    retiredAt: dtoDateSchema.nullable(),
    discardedBy: CommercialCatalogAuditActorDTOSchema.nullable(),
    discardedAt: dtoDateSchema.nullable(),
});

export const CommercialPlanListItemDTOSchema = z.object({
    id: z.uuid("Invalid Plan id"),
    key: CommercialCatalogKeySchema,
    currentRevisionId: z.uuid("Invalid Plan revision id"),
    revisionNumber: z.number().int().min(1),
    status: CommercialCatalogRevisionStatusSchema,
    displayName: CommercialCatalogDisplayNameSchema,
    description: z.string(),
    planType: CommercialPlanTypeSchema,
    priceInr: CommercialCatalogPriceInrSchema,
    term: CommercialCatalogTermSchema,
});

export const CommercialPlanListDTOSchema = z.object({
    plans: z.array(CommercialPlanListItemDTOSchema),
});

export const CommercialPlanDetailDTOSchema = z.object({
    id: z.uuid("Invalid Plan id"),
    key: CommercialCatalogKeySchema,
    currentRevision: CommercialPlanRevisionDTOSchema,
    revisions: z.array(CommercialPlanRevisionDTOSchema),
});

export const CommercialPlanDetailResponseSchema = z.object({
    plan: CommercialPlanDetailDTOSchema,
});

export const CommercialPlanListQuerySchema = z.object({
    search: z.string().trim().max(255, "Search must be at most 255 characters").optional(),
    status: CommercialCatalogListStatusFilterSchema.default("all"),
});

const commercialPlanModuleRevisionIdsSchema = z
    .array(z.uuid("Invalid Module revision id"))
    .min(1, "A Plan must include at least one Module revision")
    .refine(uniqueModuleRevisionIds, {
        message: "A Plan can include a Module revision only once",
    });

const commercialPlanWritableFields = {
    displayName: CommercialCatalogDisplayNameSchema,
    description: CommercialCatalogDescriptionSchema,
    planType: CommercialPlanTypeSchema,
    priceInr: CommercialCatalogPriceInrSchema,
    term: CommercialCatalogTermSchema,
    moduleRevisionIds: commercialPlanModuleRevisionIdsSchema,
};

const refinePlanCommercialFields = (
    value: {
        planType: "trial" | "paid";
        priceInr: number;
    },
    ctx: z.RefinementCtx,
) => {
    if (value.planType === "trial" && value.priceInr !== 0) {
        ctx.addIssue({
            code: "custom",
            path: ["priceInr"],
            message: "A Trial Plan must be priced at ₹0",
        });
    }
    if (value.planType === "paid" && !(value.priceInr > 0)) {
        ctx.addIssue({
            code: "custom",
            path: ["priceInr"],
            message: "A paid Plan requires a price greater than ₹0",
        });
    }
};

export const CreateCommercialPlanSchema = z
    .object({
        key: CommercialCatalogKeySchema,
        ...commercialPlanWritableFields,
        description: CommercialCatalogDescriptionSchema.default(""),
    })
    .strict()
    .superRefine(refinePlanCommercialFields);

export const UpdateCommercialPlanDraftSchema = z
    .object(commercialPlanWritableFields)
    .strict()
    .superRefine(refinePlanCommercialFields);
