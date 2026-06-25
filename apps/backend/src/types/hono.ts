import type { AuthenticatedUserDTO, ServiceConfig } from "@repo/types";

export type AppVariables = ServiceConfig & {
    authUser: AuthenticatedUserDTO;
};
