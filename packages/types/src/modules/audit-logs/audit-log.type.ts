import { z } from "zod";
import {
  AuditLogDTOSchema,
  CreateAuditLogDTOSchema,
} from "./audit-log.schema";

export type AuditLogDTO = z.infer<typeof AuditLogDTOSchema>;
export type CreateAuditLogDTO = z.infer<typeof CreateAuditLogDTOSchema>;
