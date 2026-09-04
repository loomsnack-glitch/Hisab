import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import type { AppVariables } from "@/types/hono";
import {
    requireOrganizationFeatureEntitlement,
    type StoreFeatureEntitlementKey,
} from "./feature-entitlement-guard";

const organizationIdSchema = z.uuid("Invalid organization id");

export const createOrganizationFeatureEntitlementMiddleware = (
    featureKey: StoreFeatureEntitlementKey,
): MiddlewareHandler<{ Variables: AppVariables }> => {
    return async (context, next) => {
        const organizationId = context.req.param("organizationId");
        const parsedOrganizationId = organizationIdSchema.safeParse(organizationId);
        if (!parsedOrganizationId.success) {
            await next();
            return;
        }

        const denial = await requireOrganizationFeatureEntitlement(
            parsedOrganizationId.data,
            featureKey,
        );
        if (denial) {
            return context.json(denial, denial.code);
        }

        await next();
    };
};
