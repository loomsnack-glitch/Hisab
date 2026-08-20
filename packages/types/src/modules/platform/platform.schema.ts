import { z } from "zod";
import { dtoDateSchema, normalizePhoneNumber, phoneSchema } from "../../common";

const ownerPhoneSchema = z
    .string()
    .transform((value, ctx) => {
        const normalized = normalizePhoneNumber(value);
        if (!normalized) {
            ctx.addIssue({ code: "custom", message: "Phone number is not valid" });
            return z.NEVER;
        }
        return normalized;
    })
    .pipe(phoneSchema);

export const OwnerPasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters");

export const OwnerUserDTOSchema = z.object({
    id: z.uuid("Invalid Owner User id"),
    firstName: z.string().trim().min(1, "First name is required").max(255, "First name is too long"),
    lastName: z.string().trim().min(1, "Last name is required").max(255, "Last name is too long"),
    phone: phoneSchema,
    isActive: z.boolean(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});

export const OwnerUserSeedSchema = z.object({
    firstName: OwnerUserDTOSchema.shape.firstName,
    lastName: OwnerUserDTOSchema.shape.lastName,
    phone: ownerPhoneSchema,
    password: OwnerPasswordSchema,
});

export const OwnerLoginSchema = z.discriminatedUnion("requestType", [
    z.object({
        requestType: z.literal("user-info"),
        phone: ownerPhoneSchema,
        password: OwnerPasswordSchema,
    }),
    z.object({
        requestType: z.literal("otp-info"),
        phone: ownerPhoneSchema,
    }),
    z.object({
        requestType: z.literal("otp-verification"),
        phone: ownerPhoneSchema,
        otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
    }),
]);
