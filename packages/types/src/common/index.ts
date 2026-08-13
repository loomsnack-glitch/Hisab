import { z } from "zod";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const INDIAN_COUNTRY_CODE = "+91";

export type { CountryCode } from "libphonenumber-js";

export const PHONE_COUNTRIES = getCountries().map((country) => ({
    country,
    callingCode: `+${getCountryCallingCode(country)}`,
}));

export const internationalPhoneRegex = /^\+[1-9]\d{7,14}$/;

export const indianMobileNumberRegex = /^[6-9]\d{9}$/;

export const phoneSchema = z
    .string()
    .trim()
    .regex(internationalPhoneRegex, "Phone must be a valid international number like +919876543210")
    .refine((value) => parsePhoneNumberFromString(value)?.isValid() === true, "Phone number is not valid");

export const normalizePhoneNumber = (
    value: string | null | undefined,
    defaultCountry: CountryCode = "IN",
): string | null => {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    return parsed?.isValid() ? parsed.number : null;
};

export const getPhoneNumberParts = (value: string | null | undefined) => {
    const normalized = normalizePhoneNumber(value);
    const parsed = normalized ? parsePhoneNumberFromString(normalized) : undefined;
    return parsed ? { country: parsed.country, nationalNumber: parsed.nationalNumber } : null;
};

export const formatPhoneDisplay = (value: string | null | undefined): string => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) return value?.trim() ?? "";

    const parsed = parsePhoneNumberFromString(normalized);
    return parsed?.formatInternational() ?? normalized;
};

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
