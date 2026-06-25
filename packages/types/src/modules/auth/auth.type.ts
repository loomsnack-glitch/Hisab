import type z from "zod";
import type { LoginFormSchema, LoginSchema, RegisterFormSchema, RegisterSchema } from "./auth.schema";
import type { AuthenticatedUserDTO } from "../user";

export type RegisterJSON = z.infer<typeof RegisterSchema>;
export type RegisterFormJSON = z.infer<typeof RegisterFormSchema>;
export type RegisterSVC = RegisterJSON;

export type LoginJSON = z.infer<typeof LoginSchema>;
export type LoginFormJSON = z.infer<typeof LoginFormSchema>;
export type LoginSVC = LoginJSON;

export type BaseAuthResponse = {
    user?: AuthenticatedUserDTO;
    token?: string;
    nextRequestType?: "otp-verification";
};

export type RegisterAuthResponse = BaseAuthResponse;
export type LoginAuthResponse = BaseAuthResponse;
