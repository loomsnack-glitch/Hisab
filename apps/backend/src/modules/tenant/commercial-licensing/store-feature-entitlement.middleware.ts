import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import type { AppVariables } from "@/types/hono";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
    requireStoreFeatureEntitlement,
    type StoreFeatureEntitlementKey,
} from "./feature-entitlement-guard";

const storeIdSchema = z.uuid("Invalid store id");
const organizationIdSchema = z.uuid("Invalid organization id");

/** Mount only on routes with a `:storeId` parameter; route handlers retain malformed-id responses. */
export const createStoreFeatureEntitlementMiddleware = (
    featureKey: StoreFeatureEntitlementKey,
): MiddlewareHandler<{ Variables: AppVariables }> => {
    return async (context, next) => {
        const organizationId = context.req.param("organizationId");
        const storeId = context.req.param("storeId");
        const parsedOrganizationId = organizationIdSchema.safeParse(organizationId);
        const parsedStoreId = storeIdSchema.safeParse(storeId);
        if (!parsedOrganizationId.success || !parsedStoreId.success) {
            await next();
            return;
        }

        const user = context.get("authUser");
        const organization = await organizationRepository.getOrganizationByIdForUser(
            parsedOrganizationId.data,
            user.id,
        );
        if (!organization) {
            await next();
            return;
        }
        const store = await organizationRepository.getStoreById(
            parsedOrganizationId.data,
            parsedStoreId.data,
        );
        if (!store) {
            await next();
            return;
        }

        const denial = await requireStoreFeatureEntitlement(parsedStoreId.data, featureKey);
        if (denial) {
            return context.json(denial, denial.code);
        }

        await next();
    };
};
