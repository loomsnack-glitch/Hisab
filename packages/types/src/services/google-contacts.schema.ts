import { z } from "zod";
import { dtoDateSchema } from "../common";

export const GoogleContactsConnectionStatusSchema = z.enum(["disconnected", "connecting", "connected", "reconnect_required"]);

export const GoogleContactsInitialSyncStatusSchema = z.enum(["not_started", "pending", "completed"]);

const googleContactNameAffixPartSchema = z
    .string()
    .trim()
    .max(32, "Must be 32 characters or fewer")
    .refine((value) => !/[\r\n]/.test(value), "Must be a single line");

export const GoogleContactsNameAffixSchema = z
    .object({
        contactNamePrefix: googleContactNameAffixPartSchema.default(""),
        contactNamePostfix: googleContactNameAffixPartSchema.default(""),
    })
    .strict();

export const GoogleContactsSyncStatusSchema = z.object({
    connectionStatus: GoogleContactsConnectionStatusSchema,
    googleAccountEmail: z.string().trim().email("Invalid Google account email").nullable(),
    connectedAt: dtoDateSchema.nullable(),
    initialSyncStatus: GoogleContactsInitialSyncStatusSchema.default("not_started"),
    lastSuccessfulSyncAt: dtoDateSchema.nullable().default(null),
    pendingCount: z.number().int().nonnegative().default(0),
    retryingCount: z.number().int().nonnegative().default(0),
    errorCount: z.number().int().nonnegative().default(0),
    conflictCount: z.number().int().nonnegative().default(0),
    contactNamePrefix: googleContactNameAffixPartSchema.default(""),
    contactNamePostfix: googleContactNameAffixPartSchema.default(""),
});

export const GoogleContactsOAuthStartResponseSchema = z.object({
    authorizationUrl: z.url("Invalid Google authorization URL"),
    expiresAt: dtoDateSchema,
});

const oauthStateSchema = z.string().trim().min(1).max(4_096);

export const GoogleContactsOAuthCompleteSchema = z.union([
    z
        .object({
            state: oauthStateSchema,
            code: z.string().trim().min(1).max(4_096),
        })
        .strict(),
    z
        .object({
            state: oauthStateSchema,
            error: z.string().trim().min(1).max(256),
        })
        .strict(),
]);
