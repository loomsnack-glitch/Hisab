import type z from "zod";
import type { UserDTOSchema } from "./user.schema";

export { SALUTATION_OPTIONS } from "./user.schema";

export type SalutationValue = (typeof import("./user.schema").SALUTATION_OPTIONS)[number]["value"];

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type AuthenticatedUserDTO = Omit<UserDTO, "passwordHash">;

export type CreateUserREPO = Pick<UserDTO, "id" | "salutation" | "firstName" | "lastName" | "phone"> & {
    email: string | null;
    passwordHash: string;
};
