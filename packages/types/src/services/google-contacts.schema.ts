import { z } from "zod";
import { dtoDateSchema } from "../common";

export const GoogleContactsConnectionStatusSchema = z.enum([
    "disconnected",
    "connecting",
    "connected",
    "reconnect_required",
]);

export const GoogleContactsSyncStatusSchema = z.object({
    connectionStatus: GoogleContactsConnectionStatusSchema,
    googleAccountEmail: z.string().trim().email("Invalid Google account email").nullable(),
    connectedAt: dtoDateSchema.nullable(),
});

export const GoogleContactsOAuthStartResponseSchema = z.object({
    authorizationUrl: z.url("Invalid Google authorization URL"),
    expiresAt: dtoDateSchema,
});

const oauthStateSchema = z.string().trim().min(1).max(4_096);

export const GoogleContactsOAuthCompleteSchema = z.union([
    z.object({
        state: oauthStateSchema,
        code: z.string().trim().min(1).max(4_096),
    }).strict(),
    z.object({
        state: oauthStateSchema,
        error: z.string().trim().min(1).max(256),
    }).strict(),
]);
