import { z } from "zod";
import { dtoDateSchema } from "../../common";
import {
    CommercialCatalogKeySchema,
    CommercialCatalogDisplayNameSchema,
    CommercialCatalogTermSchema,
    CommercialPlanTypeSchema,
} from "../platform/commercial-catalog.schema";

export const CommercialAccessSourceKindSchema = z.enum([
    "store_license",
    "co_term_add_on",
    "store_access_grant",
]);

export const StoreLicenseStatusSchema = z.enum(["scheduled", "active", "expired", "revoked"]);

export const CommercialFeatureEntitlementEvidenceDTOSchema = z.object({
    sourceKind: CommercialAccessSourceKindSchema,
    sourceId: z.uuid("Invalid commercial access source id"),
    moduleKey: CommercialCatalogKeySchema,
    moduleDisplayName: CommercialCatalogDisplayNameSchema,
    featureDisplayName: CommercialCatalogDisplayNameSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
});

export const EntitledFeatureDTOSchema = z.object({
    key: CommercialCatalogKeySchema,
    displayName: CommercialCatalogDisplayNameSchema,
    sources: z.array(CommercialFeatureEntitlementEvidenceDTOSchema).min(1),
});

export const StoreFeatureEntitlementDTOSchema = z.object({
    storeId: z.uuid("Invalid store id"),
    features: z.array(EntitledFeatureDTOSchema),
});

export const FeatureEntitlementDecisionDTOSchema = z.object({
    entitled: z.boolean(),
    featureKey: CommercialCatalogKeySchema,
    evidence: z.array(CommercialFeatureEntitlementEvidenceDTOSchema),
});

export const StoreLicenseBaseAccessDTOSchema = z.object({
    id: z.uuid("Invalid Store License id"),
    sourceKind: z.literal("store_license"),
    planKey: CommercialCatalogKeySchema,
    planDisplayName: CommercialCatalogDisplayNameSchema,
    planType: CommercialPlanTypeSchema,
    term: CommercialCatalogTermSchema,
    startsAt: dtoDateSchema,
    endsAt: dtoDateSchema,
    status: StoreLicenseStatusSchema,
});

export const StoreTrialAvailabilityDTOSchema = z.object({
    eligible: z.boolean(),
    message: z.string().min(1),
});

export const StoreCommercialStatusDTOSchema = z.object({
    storeId: z.uuid("Invalid store id"),
    organizationId: z.uuid("Invalid organization id"),
    timezone: z.literal("Asia/Kolkata"),
    baseAccess: StoreLicenseBaseAccessDTOSchema.nullable(),
    scheduledSuccessor: StoreLicenseBaseAccessDTOSchema.nullable(),
    activeAddOns: z.array(z.never()),
    trial: StoreTrialAvailabilityDTOSchema,
    entitlements: StoreFeatureEntitlementDTOSchema,
});

export const StoreCommercialStatusResponseSchema = z.object({
    commercialStatus: StoreCommercialStatusDTOSchema,
});

export const StartStoreTrialResponseSchema = StoreCommercialStatusResponseSchema;
