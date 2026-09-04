import type z from "zod";
import type {
    CommercialCatalogAuditActorDTOSchema,
    CommercialCatalogRevisionStatusSchema,
    CommercialFeatureDetailDTOSchema,
    CommercialFeatureDetailResponseSchema,
    CommercialFeatureListDTOSchema,
    CommercialFeatureListItemDTOSchema,
    CommercialFeatureListQuerySchema,
    CommercialFeatureRevisionDTOSchema,
    CreateCommercialFeatureSchema,
    UpdateCommercialFeatureDraftSchema,
} from "./commercial-catalog.schema";

export type CommercialCatalogRevisionStatus = z.infer<typeof CommercialCatalogRevisionStatusSchema>;
export type CommercialCatalogAuditActorDTO = z.infer<typeof CommercialCatalogAuditActorDTOSchema>;
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
