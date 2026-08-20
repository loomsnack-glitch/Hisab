import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
  STATUS_CODES,
  type ServiceResponse,
  type WhatsAppCloudOnboardingStateResponseDTO,
} from "@repo/types";
import { handleServiceResponse } from "@/helpers/service.helper";
import type { AppVariables } from "@/types/hono";

type StartCloudOnboarding = (
  userId: string,
  organizationId: string,
) => Promise<ServiceResponse<WhatsAppCloudOnboardingStateResponseDTO | null>>;

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
};
