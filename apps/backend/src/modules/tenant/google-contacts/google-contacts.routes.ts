import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { z } from "zod";
import {
  GoogleContactsOAuthCompleteSchema,
  STATUS_CODES,
  type GoogleContactsOAuthStartResponse,
  type GoogleContactsSyncStatus,
  type ServiceResponse,
} from "@repo/types";
import { handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import {
  completeGoogleContactsOAuth,
  getGoogleContactsSyncStatusForOrganization,
  startGoogleContactsInitialSync,
  startGoogleContactsOAuth,
} from "./google-contacts.service";

const uuidSchema = z.uuid("Invalid id");

const unexpectedError = (context: Context, error: unknown) => {
  console.error(
    "[google-contacts] unexpected route error",
    error instanceof Error ? error.message : "unknown error",
  );
  return context.json(
    {
      status: "error",
      message: "Google Contacts operation failed",
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    },
    STATUS_CODES.INTERNAL_SERVER_ERROR,
  );
};

const invalidOrganizationId = () =>
  ({
    status: "error" as const,
    message: "Invalid organization id",
    code: STATUS_CODES.BAD_REQUEST,
  });

type GoogleContactsOperations = {
  getStatus: (
    userId: string,
    organizationId: string,
  ) => Promise<ServiceResponse<GoogleContactsSyncStatus | null>>;
  start: (
    userId: string,
    organizationId: string,
  ) => Promise<ServiceResponse<GoogleContactsOAuthStartResponse | null>>;
  complete: (
    userId: string,
    organizationId: string,
    result: unknown,
  ) => Promise<ServiceResponse<GoogleContactsSyncStatus | null>>;
  startInitialSync: (
    userId: string,
    organizationId: string,
  ) => Promise<ServiceResponse<GoogleContactsSyncStatus | null>>;
};

export const createGoogleContactsRoutes = (
  operations: GoogleContactsOperations = {
    getStatus: getGoogleContactsSyncStatusForOrganization,
    start: startGoogleContactsOAuth,
    complete: completeGoogleContactsOAuth,
    startInitialSync: startGoogleContactsInitialSync,
  },
  authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
  const router = new Hono<{ Variables: AppVariables }>();
  router.use("*", authenticate);

  router.get("/:organizationId/google-contacts", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(invalidOrganizationId(), STATUS_CODES.BAD_REQUEST);
      }
      return handleServiceResponse(
        c,
        await operations.getStatus(c.get("authUser").id, organizationId),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.post("/:organizationId/google-contacts/oauth/start", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(invalidOrganizationId(), STATUS_CODES.BAD_REQUEST);
      }
      return handleServiceResponse(
        c,
        await operations.start(c.get("authUser").id, organizationId),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.post(
    "/:organizationId/google-contacts/oauth/complete",
    validateSchema("json", GoogleContactsOAuthCompleteSchema),
    async (c) => {
      try {
        const organizationId = c.req.param("organizationId");
        if (!uuidSchema.safeParse(organizationId).success) {
          return c.json(invalidOrganizationId(), STATUS_CODES.BAD_REQUEST);
        }
        return handleServiceResponse(
          c,
          await operations.complete(
            c.get("authUser").id,
            organizationId,
            c.req.valid("json"),
          ),
        );
      } catch (error) {
        return unexpectedError(c, error);
      }
    },
  );

  router.post("/:organizationId/google-contacts/sync", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(invalidOrganizationId(), STATUS_CODES.BAD_REQUEST);
      }
      return handleServiceResponse(
        c,
        await operations.startInitialSync(c.get("authUser").id, organizationId),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  return router;
};

const googleContactsRoutes = createGoogleContactsRoutes();

export default googleContactsRoutes;
