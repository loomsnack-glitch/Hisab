import type { AuthenticatedUserDTO, DeviceSessionDTO, ServiceConfig } from "@repo/types";

export type AppVariables = ServiceConfig & {
    authUser: AuthenticatedUserDTO;
    authDevice: DeviceSessionDTO;
};
