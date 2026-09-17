import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { STATUS_CODES, type OrganizationDTO } from "@repo/types";
import type { AppVariables } from "@/types/hono";
import * as organizationRepository from "../organization/organization.repository";

const organizationIdSchema = z.uuid("Invalid organization id");
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type OrganizationAccessLookup = (
  organizationId: string,
  userId: string,
) => Promise<Pick<OrganizationDTO, "id" | "createdBy"> | null>;

type AuthorizationStatusCode =
  | typeof STATUS_CODES.FORBIDDEN
  | typeof STATUS_CODES.NOT_FOUND;

export type WhatsAppAuthorizationDecision =
  | { allowed: true }
  | { allowed: false; code: AuthorizationStatusCode; message: string };

export const isWhatsAppMutationMethod = (method: string) => mutationMethods.has(method.toUpperCase());

export const authorizeWhatsAppManagement = async (
  userId: string,
  organizationId: string,
  lookup: OrganizationAccessLookup = organizationRepository.getOrganizationByIdForUser,
): Promise<WhatsAppAuthorizationDecision> => {
  const organization = await lookup(organizationId, userId);
  if (!organization) {
    return {
      allowed: false,
      code: STATUS_CODES.NOT_FOUND,
      message: "Organization not found",
    };
  }

  if (organization.createdBy !== userId) {
    return {
      allowed: false,
      code: STATUS_CODES.FORBIDDEN,
      message: "WhatsApp administrator access is required",
    };
  }

  return { allowed: true };
};

const deniedResponse = (decision: Exclude<WhatsAppAuthorizationDecision, { allowed: true }>) => ({
  status: "error" as const,
  message: decision.message,
  data: null,
  code: decision.code,
});

export const createWhatsAppAdministratorMutationMiddleware = (
  lookup: OrganizationAccessLookup = organizationRepository.getOrganizationByIdForUser,
): MiddlewareHandler<{ Variables: AppVariables }> => async (c, next) => {
  if (!isWhatsAppMutationMethod(c.req.method)) {
    await next();
    return;
  }

  const organizationId = c.req.param("organizationId");
  if (!organizationId || !organizationIdSchema.safeParse(organizationId).success) {
    return c.json(
      {
        status: "error" as const,
        message: "Invalid organization id",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      },
      STATUS_CODES.BAD_REQUEST,
    );
  }

  const decision = await authorizeWhatsAppManagement(
    c.get("authUser").id,
    organizationId,
    lookup,
  );
  if (!decision.allowed) {
    return c.json(deniedResponse(decision), decision.code);
  }

  await next();
};

export const whatsappAdministratorMutationMiddleware =
  createWhatsAppAdministratorMutationMiddleware();
