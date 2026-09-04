import type z from "zod";
import type {
    CommercialCatalogAuditActorDTOSchema,
    CommercialCatalogReferenceDTOSchema,
    CommercialCatalogRevisionStatusSchema,
    CommercialCatalogTermSchema,
    CommercialCatalogTermUnitSchema,
    CommercialFeatureDetailDTOSchema,
    CommercialFeatureDetailResponseSchema,
    CommercialFeatureListDTOSchema,
    CommercialFeatureListItemDTOSchema,
    CommercialFeatureListQuerySchema,
    CommercialFeatureRevisionDTOSchema,
    CommercialModuleDetailDTOSchema,
    CommercialModuleDetailResponseSchema,
    CommercialModuleFeatureMembershipDTOSchema,
    CommercialModuleListDTOSchema,
    CommercialModuleListItemDTOSchema,
    CommercialModuleListQuerySchema,
    CommercialModuleRevisionDTOSchema,
    CreateCommercialFeatureSchema,
    CreateCommercialModuleSchema,
    CreateCommercialPlanSchema,
    CommercialPlanDetailDTOSchema,
    CommercialPlanDetailResponseSchema,
    CommercialPlanListDTOSchema,
    CommercialPlanListItemDTOSchema,
    CommercialPlanListQuerySchema,
    CommercialPlanModuleMembershipDTOSchema,
    CommercialPlanRevisionDTOSchema,
    CommercialPlanTypeSchema,
    UpdateCommercialFeatureDraftSchema,
    UpdateCommercialModuleDraftSchema,
    UpdateCommercialPlanDraftSchema,
} from "./commercial-catalog.schema";

export type CommercialCatalogRevisionStatus = z.infer<typeof CommercialCatalogRevisionStatusSchema>;
export type CommercialCatalogAuditActorDTO = z.infer<typeof CommercialCatalogAuditActorDTOSchema>;
export type CommercialCatalogTermUnit = z.infer<typeof CommercialCatalogTermUnitSchema>;
export type CommercialCatalogTerm = z.infer<typeof CommercialCatalogTermSchema>;
export type CommercialCatalogReferenceDTO = z.infer<typeof CommercialCatalogReferenceDTOSchema>;
export type CommercialFeatureRevisionDTO = z.infer<typeof CommercialFeatureRevisionDTOSchema>;
export type CommercialFeatureListItemDTO = z.infer<typeof CommercialFeatureListItemDTOSchema>;
export type CommercialFeatureListDTO = z.infer<typeof CommercialFeatureListDTOSchema>;
export type CommercialFeatureListResponse = CommercialFeatureListDTO;
export type CommercialFeatureDetailDTO = z.infer<typeof CommercialFeatureDetailDTOSchema>;
export type CommercialFeatureDetailResponse = z.infer<typeof CommercialFeatureDetailResponseSchema>;

export type CommercialFeatureListQueryJSON = z.input<typeof CommercialFeatureListQuerySchema>;
export type CommercialFeatureListQuerySVC = z.output<typeof CommercialFeatureListQuerySchema>;
export type CommercialFeatureListStatusFilter = CommercialFeatureListQuerySVC["status"];

export type CreateCommercialFeatureJSON = z.input<typeof CreateCommercialFeatureSchema>;
export type CreateCommercialFeatureSVC = z.output<typeof CreateCommercialFeatureSchema>;
export type UpdateCommercialFeatureDraftJSON = z.input<typeof UpdateCommercialFeatureDraftSchema>;
export type UpdateCommercialFeatureDraftSVC = z.output<typeof UpdateCommercialFeatureDraftSchema>;

export type CommercialModuleFeatureMembershipDTO = z.infer<typeof CommercialModuleFeatureMembershipDTOSchema>;
export type CommercialModuleRevisionDTO = z.infer<typeof CommercialModuleRevisionDTOSchema>;
export type CommercialModuleListItemDTO = z.infer<typeof CommercialModuleListItemDTOSchema>;
export type CommercialModuleListDTO = z.infer<typeof CommercialModuleListDTOSchema>;
export type CommercialModuleListResponse = CommercialModuleListDTO;
export type CommercialModuleDetailDTO = z.infer<typeof CommercialModuleDetailDTOSchema>;
export type CommercialModuleDetailResponse = z.infer<typeof CommercialModuleDetailResponseSchema>;

export type CommercialModuleListQueryJSON = z.input<typeof CommercialModuleListQuerySchema>;
export type CommercialModuleListQuerySVC = z.output<typeof CommercialModuleListQuerySchema>;
export type CommercialModuleListStatusFilter = CommercialModuleListQuerySVC["status"];

export type CreateCommercialModuleJSON = z.input<typeof CreateCommercialModuleSchema>;
export type CreateCommercialModuleSVC = z.output<typeof CreateCommercialModuleSchema>;
export type UpdateCommercialModuleDraftJSON = z.input<typeof UpdateCommercialModuleDraftSchema>;
export type UpdateCommercialModuleDraftSVC = z.output<typeof UpdateCommercialModuleDraftSchema>;

export type CommercialPlanType = z.infer<typeof CommercialPlanTypeSchema>;
export type CommercialPlanModuleMembershipDTO = z.infer<typeof CommercialPlanModuleMembershipDTOSchema>;
export type CommercialPlanRevisionDTO = z.infer<typeof CommercialPlanRevisionDTOSchema>;
export type CommercialPlanListItemDTO = z.infer<typeof CommercialPlanListItemDTOSchema>;
export type CommercialPlanListDTO = z.infer<typeof CommercialPlanListDTOSchema>;
export type CommercialPlanListResponse = CommercialPlanListDTO;
export type CommercialPlanDetailDTO = z.infer<typeof CommercialPlanDetailDTOSchema>;
export type CommercialPlanDetailResponse = z.infer<typeof CommercialPlanDetailResponseSchema>;

export type CommercialPlanListQueryJSON = z.input<typeof CommercialPlanListQuerySchema>;
export type CommercialPlanListQuerySVC = z.output<typeof CommercialPlanListQuerySchema>;
export type CommercialPlanListStatusFilter = CommercialPlanListQuerySVC["status"];

export type CreateCommercialPlanJSON = z.input<typeof CreateCommercialPlanSchema>;
export type CreateCommercialPlanSVC = z.output<typeof CreateCommercialPlanSchema>;
export type UpdateCommercialPlanDraftJSON = z.input<typeof UpdateCommercialPlanDraftSchema>;
export type UpdateCommercialPlanDraftSVC = z.output<typeof UpdateCommercialPlanDraftSchema>;
