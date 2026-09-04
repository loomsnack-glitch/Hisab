import type { z } from "zod";
import type { CommercialCatalogTerm, CommercialPlanType } from "../platform/commercial-catalog.type";
import type {
    CommercialAccessSourceKindSchema,
    CommercialFeatureEntitlementEvidenceDTOSchema,
    EntitledFeatureDTOSchema,
    FeatureEntitlementDecisionDTOSchema,
    StartStoreTrialResponseSchema,
    StoreCommercialStatusDTOSchema,
    StoreCommercialStatusResponseSchema,
    StoreFeatureEntitlementDTOSchema,
    StoreLicenseBaseAccessDTOSchema,
    StoreLicenseStatusSchema,
    StoreTrialAvailabilityDTOSchema,
} from "./commercial-licensing.schema";

export type CommercialAccessSourceKind = z.infer<typeof CommercialAccessSourceKindSchema>;
export type StoreLicenseStatus = z.infer<typeof StoreLicenseStatusSchema>;
export type CommercialFeatureEntitlementEvidenceDTO = z.infer<
    typeof CommercialFeatureEntitlementEvidenceDTOSchema
>;
export type EntitledFeatureDTO = z.infer<typeof EntitledFeatureDTOSchema>;
export type StoreFeatureEntitlementDTO = z.infer<typeof StoreFeatureEntitlementDTOSchema>;
export type FeatureEntitlementDecisionDTO = z.infer<typeof FeatureEntitlementDecisionDTOSchema>;
export type StoreLicenseBaseAccessDTO = z.infer<typeof StoreLicenseBaseAccessDTOSchema>;
export type StoreTrialAvailabilityDTO = z.infer<typeof StoreTrialAvailabilityDTOSchema>;
export type StoreCommercialStatusDTO = z.infer<typeof StoreCommercialStatusDTOSchema>;
export type StoreCommercialStatusResponse = z.infer<typeof StoreCommercialStatusResponseSchema>;
export type StartStoreTrialResponse = z.infer<typeof StartStoreTrialResponseSchema>;

export type CommercialAccessSourceFeatureSnapshot = {
    featureId: string;
    featureRevisionId: string;
    key: string;
    displayName: string;
};

export type CommercialAccessSourceModuleSnapshot = {
    moduleId: string;
    moduleRevisionId: string;
    key: string;
    displayName: string;
    features: CommercialAccessSourceFeatureSnapshot[];
};

export type CommercialAccessSourceRecord = {
    id: string;
    kind: CommercialAccessSourceKind;
    storeId: string;
    organizationId: string;
    startsAt: Date;
    endsAt: Date;
    revokedAt: Date | null;
    planKey: string | null;
    planDisplayName: string | null;
    planType: CommercialPlanType | null;
    term: CommercialCatalogTerm | null;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type ActiveTrialPlanSnapshot = {
    planId: string;
    planRevisionId: string;
    key: string;
    displayName: string;
    planType: "trial";
    priceInr: number;
    term: CommercialCatalogTerm;
    modules: CommercialAccessSourceModuleSnapshot[];
};

export type StoreLicenseRecord = {
    id: string;
    organizationId: string;
    storeId: string;
    sourceKind: "trial" | "paid";
    planId: string;
    planRevisionId: string;
    planKey: string;
    planDisplayName: string;
    planType: CommercialPlanType;
    priceInr: number;
    term: CommercialCatalogTerm;
    startsAt: Date;
    endsAt: Date;
    revokedAt: Date | null;
    createdByUserId: string;
    createdAt: Date;
    modules: CommercialAccessSourceModuleSnapshot[];
};
