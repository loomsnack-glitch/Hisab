import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudAccountSnapshot,
  type WhatsAppCloudOnboardingStateResponseDTO,
} from "@repo/types";
import { handleServiceResponse } from "@/helpers/service.helper";
import type { AppVariables } from "@/types/hono";

type StartCloudOnboarding = (
  userId: string,
  organizationId: string,
) => Promise<ServiceResponse<WhatsAppCloudOnboardingStateResponseDTO | null>>;

type CloudOnboardingOperations = {
  complete: (
    userId: string,
    organizationId: string,
    result: unknown,
  ) => Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>>;
  list: (
    userId: string,
    organizationId: string,
  ) => Promise<ServiceResponse<{ accounts: WhatsAppCloudAccountSnapshot[] }>>;
  get: (
    userId: string,
    organizationId: string,
    accountId: string,
  ) => Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>>;
  refresh: (
    userId: string,
    organizationId: string,
    accountId: string,
  ) => Promise<ServiceResponse<WhatsAppCloudAccountSnapshot | null>>;
  revoke: (
    userId: string,
    organizationId: string,
    accountId: string,
  ) => Promise<ServiceResponse<null>>;
};

const uuidSchema = z.uuid("Invalid id");

const unexpectedError = (context: Context, error: unknown) => {
  console.error(
    "[whatsapp] cloud onboarding start",
    error instanceof Error ? error.message : String(error),
  );
  return context.json(
    {
      status: "error",
      message: "WhatsApp operation failed",
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    },
    STATUS_CODES.INTERNAL_SERVER_ERROR,
  );
};

export const registerCloudOnboardingRoutes = (
  router: Hono<{ Variables: AppVariables }>,
  startCloudOnboarding: StartCloudOnboarding,
  operations?: CloudOnboardingOperations,
): void => {
  router.post("/:organizationId/whatsapp/cloud/onboarding/start", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(
          {
            status: "error" as const,
            message: "Invalid organization id",
            code: STATUS_CODES.BAD_REQUEST,
          },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      return handleServiceResponse(
        c,
        await startCloudOnboarding(c.get("authUser").id, organizationId),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  if (!operations) return;

  router.post("/:organizationId/whatsapp/cloud/onboarding/complete", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(
          {
            status: "error" as const,
            message: "Invalid organization id",
            code: STATUS_CODES.BAD_REQUEST,
          },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      let result: unknown;
      try {
        result = await c.req.json();
      } catch {
        return c.json(
          {
            status: "error" as const,
            message: "Invalid WhatsApp Cloud onboarding result",
            code: STATUS_CODES.BAD_REQUEST,
          },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      return handleServiceResponse(
        c,
        await operations.complete(c.get("authUser").id, organizationId, result),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.get("/:organizationId/whatsapp/cloud/accounts", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      if (!uuidSchema.safeParse(organizationId).success) {
        return c.json(
          {
            status: "error" as const,
            message: "Invalid organization id",
            code: STATUS_CODES.BAD_REQUEST,
          },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      return handleServiceResponse(c, await operations.list(c.get("authUser").id, organizationId));
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.get("/:organizationId/whatsapp/cloud/accounts/:accountId", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const accountId = c.req.param("accountId");
      if (
        !uuidSchema.safeParse(organizationId).success ||
        !uuidSchema.safeParse(accountId).success
      ) {
        return c.json(
          {
            status: "error" as const,
            message: "Invalid WhatsApp Cloud account id",
            code: STATUS_CODES.BAD_REQUEST,
          },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      return handleServiceResponse(
        c,
        await operations.get(c.get("authUser").id, organizationId, accountId),
      );
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.post("/:organizationId/whatsapp/cloud/accounts/:accountId/refresh", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const accountId = c.req.param("accountId");
      if (!uuidSchema.safeParse(organizationId).success || !uuidSchema.safeParse(accountId).success) {
        return c.json({ status: "error" as const, message: "Invalid WhatsApp Cloud account id", code: STATUS_CODES.BAD_REQUEST }, STATUS_CODES.BAD_REQUEST);
      }
      return handleServiceResponse(c, await operations.refresh(c.get("authUser").id, organizationId, accountId));
    } catch (error) {
      return unexpectedError(c, error);
    }
  });

  router.post("/:organizationId/whatsapp/cloud/accounts/:accountId/revoke", async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const accountId = c.req.param("accountId");
      if (!uuidSchema.safeParse(organizationId).success || !uuidSchema.safeParse(accountId).success) {
        return c.json({ status: "error" as const, message: "Invalid WhatsApp Cloud account id", code: STATUS_CODES.BAD_REQUEST }, STATUS_CODES.BAD_REQUEST);
      }
      return handleServiceResponse(c, await operations.revoke(c.get("authUser").id, organizationId, accountId));
    } catch (error) {
      return unexpectedError(c, error);
    }
  });
};
