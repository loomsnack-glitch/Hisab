import { z } from "zod";
import { dtoDateSchema, phoneSchema } from "../../common";

export const SALUTATION_OPTIONS = [
    { label: "Mr.", value: "mr." },
    { label: "Mrs.", value: "mrs." },
    { label: "Ms.", value: "ms." },
] as const;

export const UserDTOSchema = z.object({
    id: z.uuid("Invalid user id"),
    salutation: z.enum(SALUTATION_OPTIONS.map((option) => option.value)),
    firstName: z.string().trim().min(1, "First name is required").max(255, "First name is too long"),
    lastName: z.string().trim().min(1, "Last name is required").max(255, "Last name is too long"),
    phone: phoneSchema,
    email: z.string().trim().email("Invalid email address").nullable(),
    passwordHash: z.string().nullable().optional(),
    createdAt: dtoDateSchema,
    updatedAt: dtoDateSchema,
});
