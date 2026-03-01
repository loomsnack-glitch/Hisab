import { z } from "zod";
import { AUDIT_LOG_CONSTANTS } from "./audit-log.constant";

export const AuditLogDTOSchema = z.object({
    id: z.uuid(),
    organizationId: z.uuid(),
    userId: z.uuid().nullable().optional(),
    action: z.string().max(AUDIT_LOG_CONSTANTS.MAX_ACTION_LENGTH),
    entityType: z.string().max(AUDIT_LOG_CONSTANTS.MAX_ENTITY_TYPE_LENGTH),
    entityId: z.uuid(),
    previousState: z.record(z.string(), z.unknown()).nullable().optional(),
    newState: z.record(z.string(), z.unknown()).nullable().optional(),
    ipAddress: z.string().max(AUDIT_LOG_CONSTANTS.MAX_IP_ADDRESS_LENGTH).nullable().optional(),
    createdAt: z.coerce.date(),
});

export const CreateAuditLogDTOSchema = AuditLogDTOSchema.omit({
    id: true,
    createdAt: true,
});
