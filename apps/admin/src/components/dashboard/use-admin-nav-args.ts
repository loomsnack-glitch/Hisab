import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails, getOrganizations } from "@repo/services";

import { getSidebarHomePath, resolveDefaultOrgId } from "@/lib/default-org-path";
import { parseStoreWorkspacePath } from "@/lib/store-workspace-routes";
import { organizationKeys } from "@/lib/query-keys";
import type { VisibleAdminNavArgs } from "@/components/dashboard/admin-nav-items";

export const useAdminNavArgs = (): VisibleAdminNavArgs => {
    const location = useLocation();
    const { organizationId } = useParams();

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    const effectiveOrgId = organizationId || resolveDefaultOrgId(organizations) || "";
    const hasOrganization = organizations.length > 0 && Boolean(effectiveOrgId);
    const storeWorkspace = parseStoreWorkspacePath(location.pathname);
    const storeId = storeWorkspace?.storeId;

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(effectiveOrgId),
        queryFn: () => getOrganizationDetails(effectiveOrgId),
        enabled: Boolean(effectiveOrgId && storeId),
    });

    const selectedStore = useMemo(() => {
        if (!storeId || organizationQuery.data?.status !== "success") {
            return null;
        }

        return organizationQuery.data.data?.organization.stores.find((store) => store.id === storeId) ?? null;
    }, [organizationQuery.data, storeId]);

    return {
        organizationId: effectiveOrgId,
        storeId,
        hasOrganization,
        tableManagementEnabled: selectedStore?.tableManagementEnabled ?? false,
    };
};

export const useAdminSidebarHomePath = () => {
    const location = useLocation();
    const { organizationId } = useParams();

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations = useMemo(
        () => (organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : []),
        [organizationsQuery.data],
    );

    return getSidebarHomePath(organizations, organizationId, location.pathname);
};
