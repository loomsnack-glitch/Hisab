import { z } from "zod";

export const internationalPhoneRegex = /^\+[1-9]\d{7,14}$/;

export const phoneSchema = z
    .string()
    .trim()
    .regex(internationalPhoneRegex, "Phone must be a valid international number like +919876543210");

export const optionalFormEmailSchema = z.union([
    z.literal(""),
    z.string().trim().email("Invalid email address"),
]);

export const dtoDateSchema = z.union([z.string(), z.date()]);
