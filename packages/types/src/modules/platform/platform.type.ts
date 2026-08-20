import type z from "zod";
import type { OwnerLoginSchema, OwnerUserDTOSchema, OwnerUserSeedSchema } from "./platform.schema";

export type OwnerUserDTO = z.infer<typeof OwnerUserDTOSchema>;
export type OwnerLoginJSON = z.input<typeof OwnerLoginSchema>;
export type OwnerLoginSVC = z.output<typeof OwnerLoginSchema>;
export type OwnerUserSeedInput = z.input<typeof OwnerUserSeedSchema>;
export type OwnerUserSeedSVC = z.output<typeof OwnerUserSeedSchema>;

export type OwnerAuthResponse = {
    ownerUser?: OwnerUserDTO;
    token?: string;
    nextRequestType?: "otp-verification";
};

export type PlatformEntryResponse = {
    ownerUser: OwnerUserDTO;
};

export type OwnerUserRecord = OwnerUserDTO & {
    passwordHash: string;
};

export type CreateOwnerUserREPO = Pick<OwnerUserRecord, "id" | "firstName" | "lastName" | "phone" | "passwordHash" | "isActive">;
