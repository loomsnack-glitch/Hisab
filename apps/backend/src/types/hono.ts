import type { AuthenticatedUserDTO, DeviceSessionDTO, OwnerUserDTO, ServiceConfig } from "@repo/types";

export type AppVariables = ServiceConfig & {
    authUser: AuthenticatedUserDTO;
    authDevice: DeviceSessionDTO;
    authOwner: OwnerUserDTO;
};
