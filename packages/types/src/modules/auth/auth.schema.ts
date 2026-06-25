import { z } from "zod";
import { indianMobileNumberSchema, optionalFormEmailSchema, phoneSchema } from "../../common";
import { UserDTOSchema } from "../user";

const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be at most 32 characters");

const registerPasswordRefinement = (
    data: { password: string; confirmPassword: string; requestType: string; otp?: string; resendOTP?: string },
    ctx: z.RefinementCtx,
) => {
    if (data.password !== data.confirmPassword) {
        ctx.addIssue({
            code: "custom",
            message: "Passwords do not match",
            path: ["confirmPassword"],
        });
    }

    if (data.requestType === "otp-verification" && !data.resendOTP) {
        if (!data.otp) {
            ctx.addIssue({
                code: "custom",
                message: "OTP is required",
                path: ["otp"],
            });
        } else if (!/^\d{6}$/.test(data.otp)) {
            ctx.addIssue({
                code: "custom",
                message: "OTP must be exactly 6 digits",
                path: ["otp"],
            });
        }
    }
};

const loginRefinement = (
    data: { requestType: string; password?: string; otp?: string },
    ctx: z.RefinementCtx,
) => {
    if (data.requestType === "user-info") {
        if (!data.password) {
            ctx.addIssue({
                code: "custom",
                message: "Password is required",
                path: ["password"],
            });
        } else if (data.password.length < 8 || data.password.length > 32) {
            ctx.addIssue({
                code: "custom",
                message: "Password must be between 8 and 32 characters",
                path: ["password"],
            });
        }
    }

    if (data.requestType === "otp-verification") {
        if (!data.otp) {
            ctx.addIssue({
                code: "custom",
                message: "OTP is required",
                path: ["otp"],
            });
        } else if (!/^\d{6}$/.test(data.otp)) {
            ctx.addIssue({
                code: "custom",
                message: "OTP must be exactly 6 digits",
                path: ["otp"],
            });
        }
    }
};

const RegisterBaseSchema = z.object({
    salutation: UserDTOSchema.shape.salutation,
    firstName: UserDTOSchema.shape.firstName,
    lastName: UserDTOSchema.shape.lastName,
    phone: phoneSchema,
    email: optionalFormEmailSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
});

const RegisterFormBaseSchema = RegisterBaseSchema.extend({
    phone: indianMobileNumberSchema,
});

export const RegisterUserSchema = RegisterBaseSchema.extend({
    requestType: z.literal("user-info"),
});

export const RegisterOTPSchema = RegisterBaseSchema.extend({
    requestType: z.literal("otp-verification"),
    otp: z.string().optional(),
    resendOTP: z.enum(["phoneOTP", ""]).optional(),
});

export const RegisterSchema = z
    .discriminatedUnion("requestType", [RegisterUserSchema, RegisterOTPSchema])
    .superRefine(registerPasswordRefinement);

export const RegisterFormUserSchema = RegisterFormBaseSchema.extend({
    requestType: z.literal("user-info"),
});

export const RegisterFormOTPSchema = RegisterFormBaseSchema.extend({
    requestType: z.literal("otp-verification"),
    otp: z.string().optional(),
    resendOTP: z.enum(["phoneOTP", ""]).optional(),
});

export const RegisterFormSchema = z
    .discriminatedUnion("requestType", [RegisterFormUserSchema, RegisterFormOTPSchema])
    .superRefine(registerPasswordRefinement);

export const LoginSchema = z
    .object({
        requestType: z.enum(["user-info", "otp-info", "otp-verification"]),
        phone: phoneSchema,
        password: z.string().optional(),
        otp: z.string().optional(),
    })
    .superRefine(loginRefinement);

export const LoginFormSchema = z
    .object({
        requestType: z.enum(["user-info", "otp-info", "otp-verification"]),
        phone: indianMobileNumberSchema,
        password: z.string().optional(),
        otp: z.string().optional(),
    })
    .superRefine(loginRefinement);
