import type z from "zod";
import type {
    DeviceLoginSchema,
    DeviceSessionDeviceDTOSchema,
    DeviceSessionDTOSchema,
    DeviceSessionOrganizationDTOSchema,
    DeviceSessionStoreDTOSchema,
} from "./device-auth.schema";

export type DeviceLoginJSON = z.infer<typeof DeviceLoginSchema>;
export type DeviceLoginSVC = DeviceLoginJSON;

export type DeviceSessionDeviceDTO = z.infer<typeof DeviceSessionDeviceDTOSchema>;
export type DeviceSessionStoreDTO = z.infer<typeof DeviceSessionStoreDTOSchema>;
export type DeviceSessionOrganizationDTO = z.infer<typeof DeviceSessionOrganizationDTOSchema>;
export type DeviceSessionDTO = z.infer<typeof DeviceSessionDTOSchema>;

export type DeviceAuthResponse = {
    session: DeviceSessionDTO;
    token?: string;
};
