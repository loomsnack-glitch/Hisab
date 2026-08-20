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
export type PlatformOrganizationListItemDTO = z.infer<typeof PlatformOrganizationListItemDTOSchema>;
export type PlatformOrganizationListDTO = z.infer<typeof PlatformOrganizationListDTOSchema>;
export type PlatformOrganizationListResponse = PlatformOrganizationListDTO;

export type PlatformOrganizationDetailQueryJSON = z.input<typeof PlatformOrganizationDetailQuerySchema>;
export type PlatformOrganizationDetailQuerySVC = z.output<typeof PlatformOrganizationDetailQuerySchema>;
export type PlatformStoreActivityDTO = z.infer<typeof PlatformStoreActivityDTOSchema>;
export type PlatformRecentSaleDTO = z.infer<typeof PlatformRecentSaleDTOSchema>;
export type PlatformOrganizationDetailDTO = z.infer<typeof PlatformOrganizationDetailDTOSchema>;
export type PlatformOrganizationDetailResponse = PlatformOrganizationDetailDTO;
