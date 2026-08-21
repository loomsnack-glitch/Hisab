import type z from "zod";
import type {
    CreateOwnerUserSchema,
    OwnerLoginSchema,
    OwnerUserActiveStateSchema,
    OwnerUserDTOSchema,
    OwnerUserSeedSchema,
    PlatformDashboardDTOSchema,
    PlatformDashboardQuerySchema,
    PlatformOrganizationDetailDTOSchema,
    PlatformOrganizationDetailQuerySchema,
    PlatformOrganizationListDTOSchema,
    PlatformOrganizationListItemDTOSchema,
    PlatformOrganizationListQuerySchema,
    PlatformRecentSaleDTOSchema,
    PlatformStoreActivityDTOSchema,
    PlatformStoreDetailDTOSchema,
    PlatformStoreDetailResponseSchema,
    PlatformStoreDeviceInspectionDTOSchema,
    PlatformStoreInspectionQuerySchema,
    PlatformStoreListDTOSchema,
    PlatformBillingInspectionQuerySchema,
    PlatformCatalogAddOnDetailResponseSchema,
    PlatformCatalogCategoryDetailResponseSchema,
    PlatformCatalogInspectionQuerySchema,
    PlatformCatalogListDTOSchema,
    PlatformCatalogProductDetailResponseSchema,
    PlatformCustomerInspectionDetailDTOSchema,
    PlatformCustomerInspectionDetailResponseSchema,
    PlatformCustomerInspectionListDTOSchema,
    PlatformCustomerInspectionQuerySchema,
    PlatformCustomerInspectionSummaryDTOSchema,
    PlatformReportInspectionDTOSchema,
    PlatformReportInspectionQuerySchema,
    PlatformSaleInspectionDetailDTOSchema,
    PlatformSaleInspectionDetailResponseSchema,
    PlatformSaleInspectionListDTOSchema,
    PlatformSaleInspectionStoreDTOSchema,
    PlatformSaleInspectionSummaryDTOSchema,
} from "./platform.schema";

export type OwnerUserDTO = z.infer<typeof OwnerUserDTOSchema>;
export type OwnerLoginJSON = z.input<typeof OwnerLoginSchema>;
export type OwnerLoginSVC = z.output<typeof OwnerLoginSchema>;
export type OwnerUserSeedInput = z.input<typeof OwnerUserSeedSchema>;
export type OwnerUserSeedSVC = z.output<typeof OwnerUserSeedSchema>;
export type CreateOwnerUserJSON = z.input<typeof CreateOwnerUserSchema>;
export type CreateOwnerUserSVC = z.output<typeof CreateOwnerUserSchema>;
export type OwnerUserActiveStateJSON = z.input<typeof OwnerUserActiveStateSchema>;
export type OwnerUserActiveStateSVC = z.output<typeof OwnerUserActiveStateSchema>;

export type OwnerAuthResponse = {
    ownerUser?: OwnerUserDTO;
    token?: string;
    nextRequestType?: "otp-verification";
};

export type PlatformEntryResponse = {
    ownerUser: OwnerUserDTO;
};

export type OwnerUserListResponse = {
    ownerUsers: OwnerUserDTO[];
};

export type OwnerUserResponse = {
    ownerUser: OwnerUserDTO;
};

export type OwnerUserRecord = OwnerUserDTO & {
    passwordHash: string;
};

export type CreateOwnerUserREPO = Pick<OwnerUserRecord, "id" | "firstName" | "lastName" | "phone" | "passwordHash" | "isActive">;

export type PlatformDashboardQueryJSON = z.input<typeof PlatformDashboardQuerySchema>;
export type PlatformDashboardQuerySVC = z.output<typeof PlatformDashboardQuerySchema>;
export type PlatformDashboardDTO = z.infer<typeof PlatformDashboardDTOSchema>;
export type PlatformDashboardResponse = PlatformDashboardDTO;

export type PlatformOrganizationListQueryJSON = z.input<typeof PlatformOrganizationListQuerySchema>;
export type PlatformOrganizationListQuerySVC = z.output<typeof PlatformOrganizationListQuerySchema>;
export type PlatformOrganizationActivityFilter = PlatformOrganizationListQuerySVC["activity"];
export type PlatformOrganizationDirectorySort = PlatformOrganizationListQuerySVC["sort"];
export type PlatformOrganizationListItemDTO = z.infer<typeof PlatformOrganizationListItemDTOSchema>;
export type PlatformOrganizationListDTO = z.infer<typeof PlatformOrganizationListDTOSchema>;
export type PlatformOrganizationListResponse = PlatformOrganizationListDTO;

export type PlatformOrganizationDetailQueryJSON = z.input<typeof PlatformOrganizationDetailQuerySchema>;
export type PlatformOrganizationDetailQuerySVC = z.output<typeof PlatformOrganizationDetailQuerySchema>;
export type PlatformStoreActivityDTO = z.infer<typeof PlatformStoreActivityDTOSchema>;
export type PlatformRecentSaleDTO = z.infer<typeof PlatformRecentSaleDTOSchema>;
export type PlatformOrganizationDetailDTO = z.infer<typeof PlatformOrganizationDetailDTOSchema>;
export type PlatformOrganizationDetailResponse = PlatformOrganizationDetailDTO;

export type PlatformStoreInspectionQueryJSON = z.input<typeof PlatformStoreInspectionQuerySchema>;
export type PlatformStoreInspectionQuerySVC = z.output<typeof PlatformStoreInspectionQuerySchema>;
export type PlatformStoreListDTO = z.infer<typeof PlatformStoreListDTOSchema>;
export type PlatformStoreListResponse = PlatformStoreListDTO;
export type PlatformStoreDeviceInspectionDTO = z.infer<typeof PlatformStoreDeviceInspectionDTOSchema>;
export type PlatformStoreDetailDTO = z.infer<typeof PlatformStoreDetailDTOSchema>;
export type PlatformStoreDetailResponse = z.infer<typeof PlatformStoreDetailResponseSchema>;

export type PlatformBillingInspectionQueryJSON = z.input<typeof PlatformBillingInspectionQuerySchema>;
export type PlatformBillingInspectionQuerySVC = z.output<typeof PlatformBillingInspectionQuerySchema>;
export type PlatformSaleInspectionStoreDTO = z.infer<typeof PlatformSaleInspectionStoreDTOSchema>;
export type PlatformSaleInspectionSummaryDTO = z.infer<typeof PlatformSaleInspectionSummaryDTOSchema>;
export type PlatformSaleInspectionListDTO = z.infer<typeof PlatformSaleInspectionListDTOSchema>;
export type PlatformSaleInspectionListResponse = PlatformSaleInspectionListDTO;
export type PlatformSaleInspectionDetailDTO = z.infer<typeof PlatformSaleInspectionDetailDTOSchema>;
export type PlatformSaleInspectionDetailResponse = z.infer<typeof PlatformSaleInspectionDetailResponseSchema>;

export type PlatformCatalogInspectionQueryJSON = z.input<typeof PlatformCatalogInspectionQuerySchema>;
export type PlatformCatalogInspectionQuerySVC = z.output<typeof PlatformCatalogInspectionQuerySchema>;
export type PlatformCatalogListDTO = z.infer<typeof PlatformCatalogListDTOSchema>;
export type PlatformCatalogListResponse = PlatformCatalogListDTO;
export type PlatformCatalogProductDetailResponse = z.infer<typeof PlatformCatalogProductDetailResponseSchema>;
export type PlatformCatalogCategoryDetailResponse = z.infer<typeof PlatformCatalogCategoryDetailResponseSchema>;
export type PlatformCatalogAddOnDetailResponse = z.infer<typeof PlatformCatalogAddOnDetailResponseSchema>;

export type PlatformCustomerInspectionQueryJSON = z.input<typeof PlatformCustomerInspectionQuerySchema>;
export type PlatformCustomerInspectionQuerySVC = z.output<typeof PlatformCustomerInspectionQuerySchema>;
export type PlatformCustomerInspectionSummaryDTO = z.infer<typeof PlatformCustomerInspectionSummaryDTOSchema>;
export type PlatformCustomerInspectionListDTO = z.infer<typeof PlatformCustomerInspectionListDTOSchema>;
export type PlatformCustomerInspectionListResponse = PlatformCustomerInspectionListDTO;
export type PlatformCustomerInspectionDetailDTO = z.infer<typeof PlatformCustomerInspectionDetailDTOSchema>;
export type PlatformCustomerInspectionDetailResponse = z.infer<typeof PlatformCustomerInspectionDetailResponseSchema>;

export type PlatformReportInspectionQueryJSON = z.input<typeof PlatformReportInspectionQuerySchema>;
export type PlatformReportInspectionQuerySVC = z.output<typeof PlatformReportInspectionQuerySchema>;
export type PlatformReportInspectionDTO = z.infer<typeof PlatformReportInspectionDTOSchema>;
export type PlatformReportInspectionResponse = PlatformReportInspectionDTO;
