import type z from "zod";
import type {
    GoogleContactsConnectionStatusSchema,
    GoogleContactsInitialSyncStatusSchema,
    GoogleContactsOAuthCompleteSchema,
    GoogleContactsOAuthStartResponseSchema,
    GoogleContactsSyncStatusSchema,
} from "./google-contacts.schema";

export type GoogleContactsConnectionStatus = z.infer<
    typeof GoogleContactsConnectionStatusSchema
>;
export type GoogleContactsInitialSyncStatus = z.infer<
    typeof GoogleContactsInitialSyncStatusSchema
>;
export type GoogleContactsSyncStatus = z.infer<typeof GoogleContactsSyncStatusSchema>;
export type GoogleContactsOAuthStartResponse = z.infer<
    typeof GoogleContactsOAuthStartResponseSchema
>;
export type GoogleContactsOAuthCompleteJSON = z.infer<
    typeof GoogleContactsOAuthCompleteSchema
>;
