import { z } from "zod";

export const INDIAN_COUNTRY_CODE = "+91";

export const internationalPhoneRegex = /^\+[1-9]\d{7,14}$/;

export const indianMobileNumberRegex = /^[6-9]\d{9}$/;

export const phoneSchema = z
    .string()
    .trim()
    .regex(internationalPhoneRegex, "Phone must be a valid international number like +919876543210");

export const indianMobileNumberSchema = z
    .string()
    .trim()
    .regex(indianMobileNumberRegex, "Enter a valid 10-digit mobile number");

export const toIndianInternationalPhone = (localNumber: string) => `${INDIAN_COUNTRY_CODE}${localNumber}`;

export const formatIndianPhoneDisplay = (localNumber: string) =>
    localNumber ? `${INDIAN_COUNTRY_CODE} ${localNumber}` : INDIAN_COUNTRY_CODE;

export const optionalFormEmailSchema = z.union([
    z.literal(""),
    z.string().trim().email("Invalid email address"),
]);

export const dtoDateSchema = z.union([z.string(), z.date()]);
